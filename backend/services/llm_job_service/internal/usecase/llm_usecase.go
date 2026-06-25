package usecase

import (
	"context"
	"errors"
	"fmt"
	"log"
	"strings"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/google/uuid"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/constant"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase/mapper"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase/prompt"
	expensePb "github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/pb/expense_service"
	"google.golang.org/genai"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type LLMUsecase interface {
	ExtractExpense(ctx context.Context, in *dto.ExtractExpenseInput) error
	// RetryJob re-processes a job by running only the sub-steps that have not
	// yet succeeded (LLM call and/or expense creation).
	RetryJob(ctx context.Context, job *model.ExtractExpenseJob) error
	GetLLMJobs(ctx context.Context, userId string) ([]model.ExtractExpenseJob, error)
}

type llmUsecase struct {
	openRouterApi  *anthropic.Client
	geminiApi      *genai.Client
	expenseService expensePb.ExpenseServiceClient
	llmRepository  repository.LlmRepository
}

func NewLLMUsecase(openRouterAPi *anthropic.Client, geminiAPI *genai.Client, expenseClient expensePb.ExpenseServiceClient, llmRepository repository.LlmRepository) LLMUsecase {
	return &llmUsecase{
		openRouterApi:  openRouterAPi,
		geminiApi:      geminiAPI,
		expenseService: expenseClient,
		llmRepository:  llmRepository,
	}
}

func (uc *llmUsecase) ExtractExpense(ctx context.Context, in *dto.ExtractExpenseInput) error {
	// create pending job
	userId := ctx.Value("user_id").(string)
	if userId == "" {
		return fmt.Errorf("LlmJobService.usecase.ExtractExpense(): user id is required")
	}

	if userId != in.UserId {
		return fmt.Errorf("LlmJobService.usecase.ExtractExpense(): unauthorized access")
	}

	// Check LLM call limit per user (max 3 calls created today)
	count, err := uc.llmRepository.CountExtractExpenseJobsCreatedToday(userId)
	if err != nil {
		return fmt.Errorf("LlmJobService.usecase.ExtractExpense(): failed to check LLM call limit: %w", err)
	}
	if count >= 3 {
		return fmt.Errorf("LLM call limit exceeded: you can only make 3 calls per day")
	}

	idempotencyKey := in.IdempotencyKey
	if idempotencyKey == "" {
		idempotencyKey = uuid.NewString()
	}
	job, err := uc.llmRepository.CreateExtractExpenseJob(&model.ExtractExpenseJob{
		UserId:         in.UserId,
		WalletId:       in.WalletId,
		UserInput:      in.UserInput,
		Status:         constant.StatusPending,
		RetryCount:     0,
		LLMStatus:      constant.StatusPending,
		ExpenseStatus:  constant.StatusPending,
		ErrorMessage:   "",
		LLMResult:      "{}",
		ExpenseId:      "",
		IdempotencyKey: idempotencyKey,
	})

	if err != nil {
		return err
	}

	go func() {
		ctx := context.Background()
		// Atomic claim: only one execution path (goroutine or worker) may proceed.
		// If claim returns false the job is already owned elsewhere — exit immediately.
		claimed, claimErr := uc.llmRepository.ClaimExtractExpenseJob(job.ID)
		if claimErr != nil {
			log.Printf("LLMJobService.usecase.ExtractExpense(): claim error for job %s: %v", job.ID, claimErr)
			return
		}
		if !claimed {
			log.Printf("LLMJobService.usecase.ExtractExpense(): job %s already claimed, goroutine exiting", job.ID)
			return
		}

		if uc.openRouterApi != nil {
			res, err := uc.openRouterApi.Messages.New(ctx, anthropic.MessageNewParams{
				Model:     "qwen/qwen3-235b-a22b",
				MaxTokens: 1024,
				Messages: []anthropic.MessageParam{
					anthropic.NewUserMessage(
						anthropic.NewTextBlock(prompt.BuildExpenseExtractionPrompt(in.UserInput)),
					),
				},
			},
				option.WithJSONSet("enable_thinking", false),
			)

			if err != nil {
				job.LLMStatus = constant.StatusFailed
				job.Status = constant.StatusFailed
				job.ErrorMessage = err.Error()
				updateErr := uc.llmRepository.UpdateExtractExpenseJob(job)
				if updateErr != nil {
					log.Printf("LLMJobService.usecase.ExtractExpense(): Failed to update job status: %v", updateErr)
				}
				_ = uc.llmRepository.SetNextRetryAt(job.ID, job.RetryCount)
				return
			}

			if res.Content != nil {
				var rawText string
				for _, block := range res.Content {
					if block.Type == "text" {
						rawText = block.AsText().Text
						break
					}
				}
				if rawText == "" {
					job.LLMStatus = constant.StatusFailed
					job.Status = constant.StatusFailed
					job.ErrorMessage = "no text block found in LLM response"
					updateErr := uc.llmRepository.UpdateExtractExpenseJob(job)
					if updateErr != nil {
						log.Printf("LLMJobService.usecase.ExtractExpense(): Failed to update job status: %v", updateErr)
					}
					_ = uc.llmRepository.SetNextRetryAt(job.ID, job.RetryCount)
					log.Printf("LLMJobService.usecase.ExtractExpense(): LLM response validation failed, rawText==\"\": %v", err)
					return
				}
				parsed, err := dto.ParseAndValidateLLMResponse(rawText)

				if err != nil {
					job.LLMStatus = constant.StatusFailed
					job.Status = constant.StatusFailed
					job.ErrorMessage = "llm response validation failed: %w" + err.Error()
					updateErr := uc.llmRepository.UpdateExtractExpenseJob(job)
					if updateErr != nil {
						log.Printf("LLMJobService.usecase.ExtractExpense(): Failed to update job status: %v", updateErr)
					}
					_ = uc.llmRepository.SetNextRetryAt(job.ID, job.RetryCount)
					log.Printf("LLMJobService.usecase.ExtractExpense(): LLM response validation failed: %v", err)
					return
				}

				job.LLMResult = rawText
				job.LLMStatus = constant.StatusSuccess

				ctx := metadata.AppendToOutgoingContext(ctx, "user_id", userId)
				expenseId, err := uc.createExpenses(ctx, parsed, in.UserId, in.WalletId, idempotencyKey)
				if err != nil {
					job.ExpenseStatus = constant.StatusFailed
					job.Status = constant.StatusFailed
					job.ErrorMessage = err.Error()
					if !isRetryableError(err) {
						job.RetryCount = constant.MaxRetryCount
					}
					updateErr := uc.llmRepository.UpdateExtractExpenseJob(job)
					if updateErr != nil {
						log.Printf("LLMJobService.usecase.ExtractExpense(): Failed to update job status: %v", updateErr)
					}
					if isRetryableError(err) {
						_ = uc.llmRepository.SetNextRetryAt(job.ID, job.RetryCount)
					}
					log.Printf("LLMJobService.usecase.ExtractExpense(): Failed to create expenses: %v", err)
					return
				}

				job.ExpenseStatus = constant.StatusSuccess
				job.Status = constant.StatusSuccess
				job.ExpenseId = expenseId
				err = uc.llmRepository.UpdateExtractExpenseJob(job)
				if err != nil {
					log.Printf("LLMJobService.usecase.ExtractExpense(): Failed to update job status: %v", err)
					return
				}
				log.Printf("LLMJobService.usecase.ExtractExpense(): Successfully created job: %v", job)
			}

		} else {
			res, err := uc.geminiApi.Models.GenerateContent(
				ctx,
				"gemini-3.5-flash",
				genai.Text(prompt.BuildExpenseExtractionPrompt(in.UserInput)),
				nil,
			)

			if err != nil {
				job.LLMStatus = constant.StatusFailed
				job.Status = constant.StatusFailed
				job.ErrorMessage = err.Error()
				updateErr := uc.llmRepository.UpdateExtractExpenseJob(job)
				if updateErr != nil {
					log.Printf("LLMJobService.usecase.ExtractExpense(): Failed to update job status: %v", updateErr)
				}
				_ = uc.llmRepository.SetNextRetryAt(job.ID, job.RetryCount)
				log.Printf("LLMJobService.usecase.ExtractExpense(): LLM response validation failed: %v", err)
				return
			}
			parsed, err := dto.ParseAndValidateLLMResponse(res.Text())
			if err != nil {
				job.LLMStatus = constant.StatusFailed
				job.Status = constant.StatusFailed
				job.ErrorMessage = err.Error()
				updateErr := uc.llmRepository.UpdateExtractExpenseJob(job)
				if updateErr != nil {
					log.Printf("LLMJobService.usecase.ExtractExpense(): Failed to update job status: %v", updateErr)
				}
				_ = uc.llmRepository.SetNextRetryAt(job.ID, job.RetryCount)
				log.Printf("LLMJobService.usecase.ExtractExpense(): LLM response validation failed: %v", err)
				return
			}

			job.LLMResult = res.Text()
			job.LLMStatus = constant.StatusSuccess

			ctx := metadata.AppendToOutgoingContext(ctx, "user_id", userId)
			expenseId, err := uc.createExpenses(ctx, parsed, in.UserId, in.WalletId, idempotencyKey)
			if err != nil {
				job.ExpenseStatus = constant.StatusFailed
				job.Status = constant.StatusFailed
				job.ErrorMessage = err.Error()
				if !isRetryableError(err) {
					job.RetryCount = constant.MaxRetryCount
				}
				updateErr := uc.llmRepository.UpdateExtractExpenseJob(job)
				if updateErr != nil {
					log.Printf("LLMJobService.usecase.ExtractExpense(): Failed to update job status: %v", updateErr)
				}
				if isRetryableError(err) {
					_ = uc.llmRepository.SetNextRetryAt(job.ID, job.RetryCount)
				}
				log.Printf("LLMJobService.usecase.ExtractExpense(): Failed to create expenses: %v", err)
				return
			}
			job.ExpenseStatus = constant.StatusSuccess
			job.Status = constant.StatusSuccess
			job.ExpenseId = expenseId
			err = uc.llmRepository.UpdateExtractExpenseJob(job)
			if err != nil {
				log.Printf("LLMJobService.usecase.ExtractExpense(): Failed to update job status: %v", err)
				return
			}
			log.Printf("LLMJobService.usecase.ExtractExpense(): Successfully created job: %v", job)
		}
	}()
	return nil
}

// createExpenses persists each validated expense by calling the expense_service
// gRPC endpoint. It stops and returns the first error encountered.
func (uc *llmUsecase) createExpenses(ctx context.Context, extracted *dto.ExtractedExpenses, userId, walletId, idempotencyKey string) (string, error) {
	log.Printf("persisting %d expense(s) for user=%s wallet=%s", len(extracted.Expenses), userId, walletId)

	for i := range extracted.Expenses {
		req := mapper.ExpenseDtoToCreateRequest(&extracted.Expenses[i], userId, walletId, idempotencyKey)
		res, err := uc.expenseService.CreateExpense(ctx, req)
		if err != nil {
			return "", fmt.Errorf("failed to create expense %d/%d: %w", i+1, len(extracted.Expenses), err)
		}
		log.Printf("expense %d/%d created — id: %s", i+1, len(extracted.Expenses), res.GetExpense().GetId())
	}

	return "", nil
}

// RetryJob re-processes an existing ExtractExpenseJob by executing only the
// pipeline steps that have not yet completed successfully.
//
// The caller (JobWorker) is expected to have already claimed the job via
// ClaimExtractExpenseJob before invoking this method. RetryJob does NOT
// re-claim; it assumes status == 'processing' on entry.
//
// Step 1 — LLM: skipped when job.LLMStatus == StatusSuccess (result cached in job.LLMResult).
// Step 2 — Expense creation: skipped when job.ExpenseStatus == StatusSuccess.
//
// The overall job Status is set to StatusSuccess only when both sub-steps succeed.
func (uc *llmUsecase) RetryJob(ctx context.Context, job *model.ExtractExpenseJob) error {
	// ── Step 1: LLM ────────────────────────────────────────────────────────────
	if job.LLMStatus != constant.StatusSuccess {

		var rawText string

		if uc.openRouterApi != nil {
			res, err := uc.openRouterApi.Messages.New(ctx, anthropic.MessageNewParams{
				Model:     "qwen/qwen3-235b-a22b",
				MaxTokens: 1024,
				Messages: []anthropic.MessageParam{
					anthropic.NewUserMessage(
						anthropic.NewTextBlock(prompt.BuildExpenseExtractionPrompt(job.UserInput)),
					),
				},
			},
				option.WithJSONSet("enable_thinking", false),
			)
			if err != nil {
				_ = uc.llmRepository.UpdateLLMStatus(job.ID, constant.StatusFailed, err.Error())
				_ = uc.llmRepository.UpdateExtractExpenseJobStatus(job.ID, constant.StatusFailed, err.Error())
				_ = uc.llmRepository.SetNextRetryAt(job.ID, job.RetryCount)
				return err
			}
			for _, block := range res.Content {
				if block.Type == "text" {
					rawText = block.AsText().Text
					break
				}
			}
		} else {
			res, err := uc.geminiApi.Models.GenerateContent(
				ctx,
				"gemini-3.5-flash",
				genai.Text(prompt.BuildExpenseExtractionPrompt(job.UserInput)),
				nil,
			)
			if err != nil {
				_ = uc.llmRepository.UpdateLLMStatus(job.ID, constant.StatusFailed, err.Error())
				_ = uc.llmRepository.UpdateExtractExpenseJobStatus(job.ID, constant.StatusFailed, err.Error())
				_ = uc.llmRepository.SetNextRetryAt(job.ID, job.RetryCount)
				return err
			}
			rawText = res.Text()
		}

		if rawText == "" {
			msg := "no text block found in LLM response"
			_ = uc.llmRepository.UpdateLLMStatus(job.ID, constant.StatusFailed, msg)
			_ = uc.llmRepository.UpdateExtractExpenseJobStatus(job.ID, constant.StatusFailed, msg)
			_ = uc.llmRepository.SetNextRetryAt(job.ID, job.RetryCount)
			return fmt.Errorf("%s", msg)
		}

		if _, err := dto.ParseAndValidateLLMResponse(rawText); err != nil {
			msg := "llm response validation failed: " + err.Error()
			_ = uc.llmRepository.UpdateLLMStatus(job.ID, constant.StatusFailed, msg)
			_ = uc.llmRepository.UpdateExtractExpenseJobStatus(job.ID, constant.StatusFailed, msg)
			_ = uc.llmRepository.SetNextRetryAt(job.ID, job.RetryCount)
			return err
		}

		if err := uc.llmRepository.UpdateLLMResult(job.ID, rawText); err != nil {
			return err
		}
		if err := uc.llmRepository.UpdateLLMStatus(job.ID, constant.StatusSuccess, ""); err != nil {
			return err
		}
		job.LLMResult = rawText
		job.LLMStatus = constant.StatusSuccess
	}

	// ── Step 2: Expense creation ────────────────────────────────────────────────
	if job.ExpenseStatus != constant.StatusSuccess {
		parsed, err := dto.ParseAndValidateLLMResponse(job.LLMResult)
		if err != nil {
			msg := "failed to re-parse cached llm result: " + err.Error()
			_ = uc.llmRepository.UpdateExpenseStatus(job.ID, constant.StatusFailed, msg)
			_ = uc.llmRepository.UpdateExtractExpenseJobStatus(job.ID, constant.StatusFailed, msg)
			return err
		}

		ctx := metadata.AppendToOutgoingContext(ctx, "user_id", job.UserId)
		expenseId, err := uc.createExpenses(ctx, parsed, job.UserId, job.WalletId, job.IdempotencyKey)
		if err != nil {
			_ = uc.llmRepository.UpdateExpenseStatus(job.ID, constant.StatusFailed, err.Error())
			_ = uc.llmRepository.UpdateExtractExpenseJobStatus(job.ID, constant.StatusFailed, err.Error())
			if !isRetryableError(err) {
				job.RetryCount = constant.MaxRetryCount
				_ = uc.llmRepository.UpdateExtractExpenseJob(job)
			} else {
				_ = uc.llmRepository.SetNextRetryAt(job.ID, job.RetryCount)
			}
			return err
		}

		if err := uc.llmRepository.UpdateExpenseStatus(job.ID, constant.StatusSuccess, ""); err != nil {
			return err
		}
		job.ExpenseId = expenseId
		job.ExpenseStatus = constant.StatusSuccess
	}

	// Both steps succeeded — mark the overall job done.
	return uc.llmRepository.UpdateExtractExpenseJobStatus(job.ID, constant.StatusSuccess, "")
}

func (uc *llmUsecase) GetLLMJobs(ctx context.Context, userId string) ([]model.ExtractExpenseJob, error) {
	return uc.llmRepository.GetExtractExpenseJobsByUserId(userId)
}

func isRetryableError(err error) bool {
	if err == nil {
		return false
	}

	var tempErr error = err
	for tempErr != nil {
		if st, ok := status.FromError(tempErr); ok {
			switch st.Code() {
			case codes.InvalidArgument, codes.NotFound, codes.PermissionDenied, codes.Unauthenticated, codes.FailedPrecondition, codes.Unimplemented:
				return false
			}
			break
		}
		tempErr = errors.Unwrap(tempErr)
	}

	msg := err.Error()
	nonRetryableKeywords := []string{
		"insufficient balance",
		"unauthorized",
		"not found",
		"invalid",
		"validation failed",
	}
	for _, kw := range nonRetryableKeywords {
		if strings.Contains(strings.ToLower(msg), kw) {
			return false
		}
	}

	return true
}
