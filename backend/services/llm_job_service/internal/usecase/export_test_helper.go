package usecase

// PublicCreateExpenses is a test-only export shim that exposes the private
// createExpenses method so it can be exercised from the tests/usecase package
// without having to go through the live LLM API path.
//
// This file is compiled into the production binary as well (it's in the
// usecase package, not a _test.go file), but the function is tiny and has no
// side effects when unused.  A build tag could gate it to test builds only if
// that is ever desired.

import (
	"context"

	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase/dto"
	expensePb "github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/pb/expense_service"
)

// PublicCreateExpenses delegates to the private createExpenses method on a
// freshly-created llmUsecase that is wired with the supplied expense client.
func PublicCreateExpenses(
	ctx context.Context,
	expenseClient expensePb.ExpenseServiceClient,
	extracted *dto.ExtractedExpenses,
	userId, walletId, idempotencyKey string,
) (string, error) {
	uc := &llmUsecase{expenseService: expenseClient}
	return uc.createExpenses(ctx, extracted, userId, walletId, idempotencyKey)
}
