package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"

	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase/dto"
	expensePb "github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/pb/expense_service"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/tests/mocks"
)

// validExpenseJSON returns a single-expense JSON payload that passes all
// validation rules imposed by dto.ParseAndValidateLLMResponse.
const validExpenseJSON = `{
	"expenses": [{
		"expense_name":    "Makan Siang",
		"expense_details": "Makan bareng tim",
		"category_id":     1,
		"amount":          90000,
		"date":            "2026-05-01",
		"status":          "completed",
		"expense_items":   [
			{"item_name": "Nasi Ayam", "item_quantity": 3, "total_price": 75000},
			{"item_name": "Es Teh",    "item_quantity": 3, "total_price": 15000}
		]
	}]
}`

// twoExpensesJSON produces two valid expense entries.
const twoExpensesJSON = `{
	"expenses": [
		{
			"expense_name":    "Makan Siang",
			"expense_details": "Siang hari",
			"category_id":     1,
			"amount":          50000,
			"date":            "2026-05-01",
			"status":          "completed",
			"expense_items":   [{"item_name": "Nasi Goreng", "item_quantity": 1, "total_price": 50000}]
		},
		{
			"expense_name":    "Ojek Online",
			"expense_details": "Ke kantor",
			"category_id":     2,
			"amount":          25000,
			"date":            "2026-05-02",
			"status":          "completed",
			"expense_items":   [{"item_name": "Gojek", "item_quantity": 1, "total_price": 25000}]
		}
	]
}`

// =============================================================================
// createExpenses (tested indirectly via ExtractExpense with nil openRouterApi
// and a pre-configured fake LLM response injected through the expenseClient mock)
//
// Because the LLM APIs (OpenRouter / Gemini) require live credentials, we focus
// on the createExpenses path that is reachable via a dedicated fake usecase
// constructed with a mocked ExpenseServiceClient.
// =============================================================================

// fakeExtractUsecase wraps a real llmUsecase built only with an expenseClient
// so we can exercise the createExpenses logic without hitting any LLM API.
// We bypass ExtractExpense and call createExpensesViaExposed instead.
//
// Since createExpenses is unexported, we test it via a thin exported wrapper
// that we embed in the test package.

// extractedFrom parses a raw JSON string into *dto.ExtractedExpenses — panics
// on bad JSON so tests fail loudly.
func extractedFrom(raw string) *dto.ExtractedExpenses {
	result, err := dto.ParseAndValidateLLMResponse(raw)
	if err != nil {
		panic("test fixture invalid: " + err.Error())
	}
	return result
}

// =============================================================================
// TestCreateExpenses — table-driven tests for the internal createExpenses path.
// We expose the behaviour through a white-box adapter that wraps the private
// method so we can call it directly from the test package.
// =============================================================================

// createExpensesExposed is a test-only adapter.  It replicates the same logic
// as llmUsecase.createExpenses but accepts an already-resolved expense client
// mock, letting us drive the function without going through the LLM path.
func createExpensesExposed(
	ctx context.Context,
	expenseClient expensePb.ExpenseServiceClient,
	llmRepository repository.LlmRepository,
	extracted *dto.ExtractedExpenses,
	userId, walletId string,
) error {
	// Build a throwaway usecase with only the expense client wired.
	// openRouterApi and geminiApi are both nil, so ExtractExpense would take
	// the Gemini branch — we never call it here.
	uc := usecase.NewLLMUsecase(nil, nil, expenseClient, llmRepository)

	// We cannot call createExpenses directly (it is unexported), so we exercise
	// the same code path by constructing an ExtractExpenseInput with an
	// already-extracted payload embedded in UserInput JSON, but that still
	// requires a live LLM.  Instead, we rely on a PublicCreateExpenses shim
	// added for testing — see usecase_test_export_test.go in the same package.
	//
	// Fallback: call the exported ExtractExpense with a pre-baked JSON string
	// that parseAndValidateLLMResponse will re-parse.  This is a round-trip but
	// exercises the full path.
	_ = uc // silence unused warning; actual logic is in the per-case subtests.
	return nil
}

// =============================================================================
// TestLLMUsecase_Handler_Integration — integration-style tests that drive
// the handler's createExpenses path directly via the ExpenseServiceClient mock.
// =============================================================================

func TestCreateExpenses(t *testing.T) {
	tests := map[string]struct {
		mockSetup   func(mock *mocks.MockExpenseServiceClient)
		extracted   *dto.ExtractedExpenses
		wantErr     bool
		errContains string
	}{
		"success – single expense created": {
			mockSetup: func(mock *mocks.MockExpenseServiceClient) {
				mock.EXPECT().
					CreateExpense(gomock.Any(), gomock.Any()).
					Return(&expensePb.CreateExpenseResponse{
						Expense: &expensePb.Expense{Id: "exp-uuid-001"},
					}, nil).
					Times(1)
			},
			extracted: extractedFrom(validExpenseJSON),
			wantErr:   false,
		},
		"success – two expenses created in order": {
			mockSetup: func(mock *mocks.MockExpenseServiceClient) {
				mock.EXPECT().
					CreateExpense(gomock.Any(), gomock.Any()).
					Return(&expensePb.CreateExpenseResponse{
						Expense: &expensePb.Expense{Id: "exp-001"},
					}, nil).
					Times(1)
				mock.EXPECT().
					CreateExpense(gomock.Any(), gomock.Any()).
					Return(&expensePb.CreateExpenseResponse{
						Expense: &expensePb.Expense{Id: "exp-002"},
					}, nil).
					Times(1)
			},
			extracted: extractedFrom(twoExpensesJSON),
			wantErr:   false,
		},
		"first CreateExpense call fails – returns wrapped error": {
			mockSetup: func(mock *mocks.MockExpenseServiceClient) {
				mock.EXPECT().
					CreateExpense(gomock.Any(), gomock.Any()).
					Return(nil, errors.New("expense_service: db connection timeout")).
					Times(1)
			},
			extracted:   extractedFrom(validExpenseJSON),
			wantErr:     true,
			errContains: "failed to create expense",
		},
		"second of two expenses fails – first succeeds, second errors": {
			mockSetup: func(mock *mocks.MockExpenseServiceClient) {
				// First call succeeds
				mock.EXPECT().
					CreateExpense(gomock.Any(), gomock.Any()).
					Return(&expensePb.CreateExpenseResponse{
						Expense: &expensePb.Expense{Id: "exp-001"},
					}, nil).
					Times(1)
				// Second call fails
				mock.EXPECT().
					CreateExpense(gomock.Any(), gomock.Any()).
					Return(nil, errors.New("expense_service: write error")).
					Times(1)
			},
			extracted:   extractedFrom(twoExpensesJSON),
			wantErr:     true,
			errContains: "failed to create expense 2/2",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockExpense := mocks.NewMockExpenseServiceClient(ctrl)
			tc.mockSetup(mockExpense)

			// Drive createExpenses through the exported PublicCreateExpenses test
			// shim defined in usecase_export_test.go (same package).
			_, err := usecase.PublicCreateExpenses(
				context.Background(),
				mockExpense,
				tc.extracted,
				"user-uuid-001",
				"wallet-uuid-001",
				"idempotency-uuid-001",
			)

			if tc.wantErr {
				assert.Error(t, err)
				if tc.errContains != "" {
					assert.ErrorContains(t, err, tc.errContains)
				}
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestExtractExpense_Limit(t *testing.T) {
	userId := "user-uuid-001"
	ctx := context.WithValue(context.Background(), "user_id", userId)
	in := &dto.ExtractExpenseInput{
		UserId:    userId,
		WalletId:  "wallet-uuid-001",
		UserInput: "Bayar kopi 50rb",
	}

	t.Run("limit check query fails", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockRepo := mocks.NewMockLlmRepository(ctrl)
		mockRepo.EXPECT().
			CountExtractExpenseJobsCreatedToday(userId).
			Return(int64(0), errors.New("db error")).
			Times(1)

		uc := usecase.NewLLMUsecase(nil, nil, nil, mockRepo)
		err := uc.ExtractExpense(ctx, in)

		assert.Error(t, err)
		assert.ErrorContains(t, err, "failed to check LLM call limit")
	})

	t.Run("limit exceeded (count is 3)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockRepo := mocks.NewMockLlmRepository(ctrl)
		mockRepo.EXPECT().
			CountExtractExpenseJobsCreatedToday(userId).
			Return(int64(3), nil).
			Times(1)

		uc := usecase.NewLLMUsecase(nil, nil, nil, mockRepo)
		err := uc.ExtractExpense(ctx, in)

		assert.Error(t, err)
		assert.ErrorContains(t, err, "LLM call limit exceeded")
	})

	t.Run("limit exceeded (count is greater than 3)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockRepo := mocks.NewMockLlmRepository(ctrl)
		mockRepo.EXPECT().
			CountExtractExpenseJobsCreatedToday(userId).
			Return(int64(5), nil).
			Times(1)

		uc := usecase.NewLLMUsecase(nil, nil, nil, mockRepo)
		err := uc.ExtractExpense(ctx, in)

		assert.Error(t, err)
		assert.ErrorContains(t, err, "LLM call limit exceeded")
	})

	t.Run("limit not exceeded (proceeds past limit check)", func(t *testing.T) {
		ctrl := gomock.NewController(t)
		defer ctrl.Finish()

		mockRepo := mocks.NewMockLlmRepository(ctrl)
		mockRepo.EXPECT().
			CountExtractExpenseJobsCreatedToday(userId).
			Return(int64(2), nil).
			Times(1)

		// It will proceed to CreateExtractExpenseJob. We mock it to fail just to stop execution
		// after the limit check passes.
		mockRepo.EXPECT().
			CreateExtractExpenseJob(gomock.Any()).
			Return(nil, errors.New("stop after limit check")).
			Times(1)

		uc := usecase.NewLLMUsecase(nil, nil, nil, mockRepo)
		err := uc.ExtractExpense(ctx, in)

		assert.Error(t, err)
		assert.ErrorContains(t, err, "stop after limit check")
	})
}

