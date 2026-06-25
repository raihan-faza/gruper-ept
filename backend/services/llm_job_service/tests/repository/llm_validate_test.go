package dto_test

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase/dto"
)

// =============================================================================
// ParseAndValidateLLMResponse
// =============================================================================

func TestParseAndValidateLLMResponse(t *testing.T) {
	tests := map[string]struct {
		mockSetup   func() // no external deps; kept for pattern consistency
		input       string
		wantErr     bool
		errContains string
		check       func(t *testing.T, result *dto.ExtractedExpenses)
	}{
		// ── Success cases ──────────────────────────────────────────────────────
		"valid single expense with items": {
			mockSetup: func() {},
			input: `{
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
			}`,
			wantErr: false,
			check: func(t *testing.T, r *dto.ExtractedExpenses) {
				require.Len(t, r.Expenses, 1)
				exp := r.Expenses[0]
				assert.Equal(t, "Makan Siang", exp.ExpenseName)
				assert.Equal(t, uint64(1), exp.CategoryID)
				assert.Equal(t, int64(90000), exp.Amount)
				assert.Len(t, exp.ExpenseItems, 2)
			},
		},
		"valid expense with empty items array": {
			mockSetup: func() {},
			input: `{
				"expenses": [{
					"expense_name":    "Parkir",
					"expense_details": "Parkir motor",
					"category_id":     2,
					"amount":          5000,
					"date":            "2026-05-03",
					"status":          "completed",
					"expense_items":   []
				}]
			}`,
			wantErr: false,
			check: func(t *testing.T, r *dto.ExtractedExpenses) {
				assert.Equal(t, int64(5000), r.Expenses[0].Amount)
				assert.Empty(t, r.Expenses[0].ExpenseItems)
			},
		},
		"valid expense with empty date (null-equivalent)": {
			mockSetup: func() {},
			input: `{
				"expenses": [{
					"expense_name":    "Belanja Online",
					"expense_details": "Tokopedia",
					"category_id":     6,
					"amount":          0,
					"date":            "",
					"status":          "pending",
					"expense_items":   []
				}]
			}`,
			wantErr: false,
			check: func(t *testing.T, r *dto.ExtractedExpenses) {
				assert.Equal(t, "", r.Expenses[0].Date)
			},
		},
		"valid expense with empty expense_details": {
			mockSetup: func() {},
			input: `{
				"expenses": [{
					"expense_name":    "Parkir",
					"expense_details": "",
					"category_id":     2,
					"amount":          5000,
					"date":            "2026-05-03",
					"status":          "completed",
					"expense_items":   []
				}]
			}`,
			wantErr: false,
			check: func(t *testing.T, r *dto.ExtractedExpenses) {
				assert.Equal(t, "", r.Expenses[0].ExpenseDetails)
			},
		},
		"leading and trailing whitespace is stripped before parsing": {
			mockSetup: func() {},
			input:     "  \n" + `{"expenses": [{"expense_name":"X","expense_details":"Y","category_id":7,"amount":0,"date":"","status":"completed","expense_items":[]}]}` + "\n  ",
			wantErr:   false,
			check: func(t *testing.T, r *dto.ExtractedExpenses) {
				assert.Len(t, r.Expenses, 1)
			},
		},
		"two valid expenses": {
			mockSetup: func() {},
			input: `{
				"expenses": [
					{"expense_name":"A","expense_details":"d1","category_id":1,"amount":10000,"date":"2026-01-01","status":"completed","expense_items":[]},
					{"expense_name":"B","expense_details":"d2","category_id":2,"amount":5000,"date":"2026-01-02","status":"pending","expense_items":[]}
				]
			}`,
			wantErr: false,
			check: func(t *testing.T, r *dto.ExtractedExpenses) {
				assert.Len(t, r.Expenses, 2)
			},
		},

		// ── LLM rejection signal ───────────────────────────────────────────────
		"LLM rejection signal '{}' returns error": {
			mockSetup:   func() {},
			input:       "{}",
			wantErr:     true,
			errContains: "rejection signal",
		},
		"LLM rejection signal with surrounding whitespace": {
			mockSetup:   func() {},
			input:       "  {}  ",
			wantErr:     true,
			errContains: "rejection signal",
		},

		// ── JSON parsing errors ────────────────────────────────────────────────
		"malformed JSON": {
			mockSetup:   func() {},
			input:       `{not valid json`,
			wantErr:     true,
			errContains: "failed to parse llm response as json",
		},

		// ── Validation errors ──────────────────────────────────────────────────
		"expenses array is empty": {
			mockSetup:   func() {},
			input:       `{"expenses": []}`,
			wantErr:     true,
			errContains: "'expenses' array is missing or empty",
		},
		"expense_name is empty": {
			mockSetup:   func() {},
			input:       `{"expenses": [{"expense_name":"","expense_details":"d","category_id":1,"amount":0,"date":"","status":"completed","expense_items":[]}]}`,
			wantErr:     true,
			errContains: "expense_name",
		},
		"category_id is invalid": {
			mockSetup:   func() {},
			input:       `{"expenses": [{"expense_name":"X","expense_details":"d","category_id":99,"amount":0,"date":"","status":"completed","expense_items":[]}]}`,
			wantErr:     true,
			errContains: "category_id",
		},
		"amount is negative": {
			mockSetup:   func() {},
			input:       `{"expenses": [{"expense_name":"X","expense_details":"d","category_id":1,"amount":-1,"date":"","status":"completed","expense_items":[]}]}`,
			wantErr:     true,
			errContains: "amount",
		},
		"status is invalid": {
			mockSetup:   func() {},
			input:       `{"expenses": [{"expense_name":"X","expense_details":"d","category_id":1,"amount":0,"date":"","status":"unknown","expense_items":[]}]}`,
			wantErr:     true,
			errContains: "status",
		},
		"date format is invalid": {
			mockSetup:   func() {},
			input:       `{"expenses": [{"expense_name":"X","expense_details":"d","category_id":1,"amount":0,"date":"01-05-2026","status":"completed","expense_items":[]}]}`,
			wantErr:     true,
			errContains: "date",
		},
		"item_name is empty": {
			mockSetup:   func() {},
			input:       `{"expenses": [{"expense_name":"X","expense_details":"d","category_id":1,"amount":100,"date":"","status":"completed","expense_items":[{"item_name":"","item_quantity":1,"total_price":100}]}]}`,
			wantErr:     true,
			errContains: "item_name",
		},
		"item_quantity is zero": {
			mockSetup:   func() {},
			input:       `{"expenses": [{"expense_name":"X","expense_details":"d","category_id":1,"amount":100,"date":"","status":"completed","expense_items":[{"item_name":"A","item_quantity":0,"total_price":100}]}]}`,
			wantErr:     true,
			errContains: "item_quantity",
		},
		"item total_price is negative": {
			mockSetup:   func() {},
			input:       `{"expenses": [{"expense_name":"X","expense_details":"d","category_id":1,"amount":100,"date":"","status":"completed","expense_items":[{"item_name":"A","item_quantity":1,"total_price":-1}]}]}`,
			wantErr:     true,
			errContains: "total_price",
		},
		"item totals do not match amount": {
			mockSetup:   func() {},
			input:       `{"expenses": [{"expense_name":"X","expense_details":"d","category_id":1,"amount":999,"date":"","status":"completed","expense_items":[{"item_name":"A","item_quantity":1,"total_price":100}]}]}`,
			wantErr:     true,
			errContains: "amount",
		},
		"category_id accepts all valid values": {
			mockSetup: func() {},
			input: func() string {
				categories := []string{"1", "2", "3", "4", "5", "6", "7"}
				var expenses []string
				for _, c := range categories {
					expenses = append(expenses, `{"expense_name":"X","expense_details":"d","category_id":`+c+`,"amount":0,"date":"","status":"completed","expense_items":[]}`)
				}
				return `{"expenses": [` + strings.Join(expenses, ",") + `]}`
			}(),
			wantErr: false,
			check: func(t *testing.T, r *dto.ExtractedExpenses) {
				assert.Len(t, r.Expenses, 7)
			},
		},
		"status accepts both 'completed' and 'pending'": {
			mockSetup: func() {},
			input:     `{"expenses": [{"expense_name":"A","expense_details":"d","category_id":1,"amount":0,"date":"","status":"completed","expense_items":[]},{"expense_name":"B","expense_details":"d","category_id":1,"amount":0,"date":"","status":"pending","expense_items":[]}]}`,
			wantErr:   false,
			check: func(t *testing.T, r *dto.ExtractedExpenses) {
				assert.Equal(t, "completed", r.Expenses[0].Status)
				assert.Equal(t, "pending", r.Expenses[1].Status)
			},
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			tc.mockSetup()
			result, err := dto.ParseAndValidateLLMResponse(tc.input)

			if tc.wantErr {
				assert.Error(t, err)
				assert.Nil(t, result)
				if tc.errContains != "" {
					assert.ErrorContains(t, err, tc.errContains)
				}
			} else {
				require.NoError(t, err)
				require.NotNil(t, result)
				if tc.check != nil {
					tc.check(t, result)
				}
			}
		})
	}
}

// =============================================================================
// ValidateExtractedExpenses (direct validation, already-decoded structs)
// =============================================================================

func TestValidateExtractedExpenses(t *testing.T) {
	tests := map[string]struct {
		mockSetup   func()
		input       *dto.ExtractedExpenses
		wantErr     bool
		errContains string
	}{
		"valid struct passes": {
			mockSetup: func() {},
			input: &dto.ExtractedExpenses{
				Expenses: []dto.Expense{
					{
						ExpenseName:    "Test",
						ExpenseDetails: "Detail",
						CategoryID:     7,
						Amount:         0,
						Date:           "",
						Status:         "completed",
					},
				},
			},
			wantErr: false,
		},
		"empty expenses slice": {
			mockSetup:   func() {},
			input:       &dto.ExtractedExpenses{Expenses: []dto.Expense{}},
			wantErr:     true,
			errContains: "'expenses' array is missing or empty",
		},
		"amount matches item sum": {
			mockSetup: func() {},
			input: &dto.ExtractedExpenses{
				Expenses: []dto.Expense{
					{
						ExpenseName:    "X",
						ExpenseDetails: "d",
						CategoryID:     1,
						Amount:         300,
						Status:         "completed",
						ExpenseItems: []dto.ExpenseItem{
							{ItemName: "A", ItemQty: 1, TotalPrice: 200},
							{ItemName: "B", ItemQty: 1, TotalPrice: 100},
						},
					},
				},
			},
			wantErr: false,
		},
		"amount does not match item sum": {
			mockSetup: func() {},
			input: &dto.ExtractedExpenses{
				Expenses: []dto.Expense{
					{
						ExpenseName:    "X",
						ExpenseDetails: "d",
						CategoryID:     1,
						Amount:         999,
						Status:         "completed",
						ExpenseItems: []dto.ExpenseItem{
							{ItemName: "A", ItemQty: 1, TotalPrice: 100},
						},
					},
				},
			},
			wantErr:     true,
			errContains: "amount",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			tc.mockSetup()
			err := dto.ValidateExtractedExpenses(tc.input)

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
