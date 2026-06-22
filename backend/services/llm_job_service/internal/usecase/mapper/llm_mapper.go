package mapper

import (
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/pb"
	expensePb "github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/pb/expense_service"
)

func DtoToPB(req *pb.ExtractExpenseRequest) *dto.ExtractExpenseInput {
	return &dto.ExtractExpenseInput{
		UserId:    req.GetUserId(),
		WalletId:  req.GetWalletId(),
		UserInput: req.GetUserInput(),
	}
}

// ExpenseDtoToCreateRequest converts a validated dto.Expense into the gRPC
// CreateExpenseRequest expected by the expense_service, attaching the caller's
// userId and walletId that are not present in the LLM output.
func ExpenseDtoToCreateRequest(e *dto.Expense, userId, walletId string, idempotencyKey string) *expensePb.CreateExpenseRequest {
	items := make([]*expensePb.ExpenseItem, 0, len(e.ExpenseItems))
	for _, item := range e.ExpenseItems {
		items = append(items, &expensePb.ExpenseItem{
			ItemName:     item.ItemName,
			ItemQuantity: item.ItemQty,
			TotalPrice:   item.TotalPrice,
		})
	}

	return &expensePb.CreateExpenseRequest{
		Expense: &expensePb.Expense{
			UserId:         userId,
			WalletId:       walletId,
			CategoryId:     e.CategoryID,
			ExpenseName:    e.ExpenseName,
			ExpenseDetails: e.ExpenseDetails,
			Amount:         e.Amount,
			Status:         e.Status,
			Date:           e.Date,
			ExpenseItems:   items,
			IdempotencyKey: idempotencyKey,
		},
	}
}
