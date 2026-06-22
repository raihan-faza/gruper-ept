package mapper_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase/mapper"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/pb"
)

// =============================================================================
// DtoToPB
// =============================================================================

func TestDtoToPB(t *testing.T) {
	tests := map[string]struct {
		mockSetup func()
		input     *pb.ExtractExpenseRequest
		check     func(t *testing.T, out *dto.ExtractExpenseInput)
	}{
		"maps all fields correctly": {
			mockSetup: func() {},
			input: &pb.ExtractExpenseRequest{
				UserId:    "user-uuid-001",
				WalletId:  "wallet-uuid-001",
				UserInput: "Bayar makan siang 50 ribu",
			},
			check: func(t *testing.T, out *dto.ExtractExpenseInput) {
				require.NotNil(t, out)
				assert.Equal(t, "user-uuid-001", out.UserId)
				assert.Equal(t, "wallet-uuid-001", out.WalletId)
				assert.Equal(t, "Bayar makan siang 50 ribu", out.UserInput)
			},
		},
		"empty strings are preserved": {
			mockSetup: func() {},
			input: &pb.ExtractExpenseRequest{
				UserId:    "",
				WalletId:  "",
				UserInput: "",
			},
			check: func(t *testing.T, out *dto.ExtractExpenseInput) {
				require.NotNil(t, out)
				assert.Equal(t, "", out.UserId)
				assert.Equal(t, "", out.WalletId)
				assert.Equal(t, "", out.UserInput)
			},
		},
		"nil request produces zero-value DTO": {
			mockSetup: func() {},
			input:     nil,
			check: func(t *testing.T, out *dto.ExtractExpenseInput) {
				// GetUserId/GetWalletId/GetUserInput on nil proto returns "".
				require.NotNil(t, out)
				assert.Equal(t, "", out.UserId)
				assert.Equal(t, "", out.WalletId)
				assert.Equal(t, "", out.UserInput)
			},
		},
		"unicode input is preserved": {
			mockSetup: func() {},
			input: &pb.ExtractExpenseRequest{
				UserId:    "ผู้ใช้-001",
				WalletId:  "กระเป๋า-002",
				UserInput: "จ่ายข้าวเที่ยง 50 บาท",
			},
			check: func(t *testing.T, out *dto.ExtractExpenseInput) {
				require.NotNil(t, out)
				assert.Equal(t, "ผู้ใช้-001", out.UserId)
				assert.Equal(t, "กระเป๋า-002", out.WalletId)
				assert.Equal(t, "จ่ายข้าวเที่ยง 50 บาท", out.UserInput)
			},
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			tc.mockSetup()
			out := mapper.DtoToPB(tc.input)
			tc.check(t, out)
		})
	}
}

// =============================================================================
// ExpenseDtoToCreateRequest
// =============================================================================

func TestExpenseDtoToCreateRequest(t *testing.T) {
	tests := map[string]struct {
		mockSetup      func()
		expense        *dto.Expense
		userId         string
		walletId       string
		idempotencyKey string
		check          func(t *testing.T, out interface{})
	}{
		"expense with multiple items maps correctly": {
			mockSetup: func() {},
			expense: &dto.Expense{
				ExpenseName:    "Makan Siang",
				ExpenseDetails: "Makan bareng tim",
				CategoryID:     1,
				Amount:         90000,
				Date:           "2026-05-01",
				Status:         "completed",
				ExpenseItems: []dto.ExpenseItem{
					{ItemName: "Nasi Ayam", ItemQty: 3, TotalPrice: 75000},
					{ItemName: "Es Teh", ItemQty: 3, TotalPrice: 15000},
				},
			},
			userId:         "user-uuid-001",
			walletId:       "wallet-uuid-001",
			idempotencyKey: "idempotency-uuid-001",
		},
		"expense with empty items produces empty slice": {
			mockSetup: func() {},
			expense: &dto.Expense{
				ExpenseName:    "Parkir",
				ExpenseDetails: "Parkir motor",
				CategoryID:     2,
				Amount:         5000,
				Date:           "2026-05-03",
				Status:         "completed",
				ExpenseItems:   []dto.ExpenseItem{},
			},
			userId:         "user-uuid-002",
			walletId:       "wallet-uuid-002",
			idempotencyKey: "idempotency-uuid-002",
		},
		"expense with zero amount is mapped correctly": {
			mockSetup: func() {},
			expense: &dto.Expense{
				ExpenseName:    "Belanja Online",
				ExpenseDetails: "Tokopedia",
				CategoryID:     3,
				Amount:         0,
				Date:           "",
				Status:         "pending",
				ExpenseItems:   []dto.ExpenseItem{},
			},
			userId:         "u-001",
			walletId:       "w-001",
			idempotencyKey: "idempotency-001",
		},
		"single item expense maps item fields correctly": {
			mockSetup: func() {},
			expense: &dto.Expense{
				ExpenseName:    "Ojek Online",
				ExpenseDetails: "Ke kantor",
				CategoryID:     4,
				Amount:         25000,
				Date:           "2026-05-02",
				Status:         "completed",
				ExpenseItems: []dto.ExpenseItem{
					{ItemName: "Gojek", ItemQty: 1, TotalPrice: 25000},
				},
			},
			userId:         "user-uuid-010",
			walletId:       "wallet-uuid-010",
			idempotencyKey: "idempotency-uuid-010",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			tc.mockSetup()
			req := mapper.ExpenseDtoToCreateRequest(tc.expense, tc.userId, tc.walletId, tc.idempotencyKey)

			require.NotNil(t, req)
			require.NotNil(t, req.GetExpense())

			exp := req.GetExpense()

			// Identity fields injected by the mapper
			assert.Equal(t, tc.userId, exp.GetUserId(), "UserId mismatch")
			assert.Equal(t, tc.walletId, exp.GetWalletId(), "WalletId mismatch")

			// Fields copied from dto.Expense
			assert.Equal(t, tc.expense.ExpenseName, exp.GetExpenseName(), "ExpenseName mismatch")
			assert.Equal(t, tc.expense.ExpenseDetails, exp.GetExpenseDetails(), "ExpenseDetails mismatch")
			assert.Equal(t, tc.expense.CategoryID, exp.GetCategoryId(), "CategoryId mismatch")
			assert.Equal(t, tc.expense.Amount, exp.GetAmount(), "Amount mismatch")
			assert.Equal(t, tc.expense.Date, exp.GetDate(), "Date mismatch")
			assert.Equal(t, tc.expense.Status, exp.GetStatus(), "Status mismatch")

			// Items
			require.Len(t, exp.GetExpenseItems(), len(tc.expense.ExpenseItems), "ExpenseItems length mismatch")
			for i, item := range tc.expense.ExpenseItems {
				pbItem := exp.GetExpenseItems()[i]
				assert.Equal(t, item.ItemName, pbItem.GetItemName(), "item[%d] ItemName mismatch", i)
				assert.Equal(t, item.ItemQty, pbItem.GetItemQuantity(), "item[%d] ItemQuantity mismatch", i)
				assert.Equal(t, item.TotalPrice, pbItem.GetTotalPrice(), "item[%d] TotalPrice mismatch", i)
			}
		})
	}
}
