package handler

import (
	"context"
	"log"
	"time"

	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase/mapper"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/pb"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/emptypb"
)

type LLMHandler struct {
	pb.UnimplementedLLMServiceServer
	llmUsecase usecase.LLMUsecase
}

func NewLLMHandler(usecase usecase.LLMUsecase) *LLMHandler {
	return &LLMHandler{
		llmUsecase: usecase,
	}
}

func (h *LLMHandler) ExtractExpense(ctx context.Context, request *pb.ExtractExpenseRequest) (*emptypb.Empty, error) {
	var userId string
	if userIdVal := ctx.Value("user_id"); userIdVal != nil {
		userId, _ = userIdVal.(string)
	}
	if userId == "" {
		if md, ok := metadata.FromIncomingContext(ctx); ok {
			if ids := md.Get("user_id"); len(ids) > 0 {
				userId = ids[0]
			}
		}
	}
	if userId == "" {
		log.Printf("LLMJobService.handler.ExtractExpense(): user id == \"\"")
		return nil, status.Error(codes.Unauthenticated, "unauthorized access")
	}

	if request.GetUserId() != userId {
		return nil, status.Error(codes.PermissionDenied, "unauthorized access")
	}

	in := mapper.DtoToPB(request)
	var idempotencyKey string
	if md, ok := metadata.FromIncomingContext(ctx); ok {
		if keys := md.Get("idempotency_key"); len(keys) > 0 {
			idempotencyKey = keys[0]
		}
	}
	in.IdempotencyKey = idempotencyKey
	usecaseErr := h.llmUsecase.ExtractExpense(ctx, in)

	if usecaseErr != nil {
		return nil, usecaseErr
	}

	return &emptypb.Empty{}, nil
}

func (h *LLMHandler) GetLLMJobs(ctx context.Context, request *pb.GetLLMJobsRequest) (*pb.GetLLMJobsResponse, error) {
	var userId string
	if userIdVal := ctx.Value("user_id"); userIdVal != nil {
		userId, _ = userIdVal.(string)
	}
	if userId == "" {
		if md, ok := metadata.FromIncomingContext(ctx); ok {
			if ids := md.Get("user_id"); len(ids) > 0 {
				userId = ids[0]
			}
		}
	}
	if userId == "" {
		log.Printf("LLMJobService.handler.GetLLMJobs(): user id == \"\"")
		return nil, status.Error(codes.Unauthenticated, "unauthorized access")
	}

	if request.GetUserId() != userId {
		return nil, status.Error(codes.PermissionDenied, "unauthorized access")
	}

	jobs, err := h.llmUsecase.GetLLMJobs(ctx, userId)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	pbJobs := make([]*pb.LLMJob, len(jobs))
	for i, job := range jobs {
		pbJobs[i] = &pb.LLMJob{
			Id:             job.ID,
			UserId:         job.UserId,
			WalletId:       job.WalletId,
			UserInput:      job.UserInput,
			Status:         job.Status,
			RetryCount:     int32(job.RetryCount),
			ExpenseId:      job.ExpenseId,
			ErrorMessage:   job.ErrorMessage,
			LlmResult:      job.LLMResult,
			LlmStatus:      job.LLMStatus,
			ExpenseStatus:  job.ExpenseStatus,
			IdempotencyKey: job.IdempotencyKey,
			CreatedAt:      job.CreatedAt.Format(time.RFC3339),
			UpdatedAt:      job.UpdatedAt.Format(time.RFC3339),
		}
	}

	return &pb.GetLLMJobsResponse{
		Jobs: pbJobs,
	}, nil
}
