package dto

type ExtractExpenseInput struct {
	UserId         string
	WalletId       string
	UserInput      string
	IdempotencyKey string
}

type ExpenseItem struct {
	ItemName   string `json:"item_name"`
	ItemQty    int64  `json:"item_quantity"`
	TotalPrice int64  `json:"total_price"`
}

type Expense struct {
	ExpenseName    string        `json:"expense_name"`
	ExpenseDetails string        `json:"expense_details"`
	CategoryID     uint64        `json:"category_id"`
	Amount         int64         `json:"amount"`
	Date           string        `json:"date"`
	Status         string        `json:"status"`
	ExpenseItems   []ExpenseItem `json:"expense_items"`
}

type ExtractedExpenses struct {
	Expenses []Expense `json:"expenses"`
}
