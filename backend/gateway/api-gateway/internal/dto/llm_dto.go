package dto

// ExtractExpenseInput is the HTTP request body for the ExtractExpense endpoint.
type ExtractExpenseInput struct {
	WalletID  string `json:"wallet_id" binding:"required"`
	UserInput string `json:"user_input" binding:"required"`
}
