package dto

import "time"

type ExpenseItemDTO struct {
	ItemName     string `json:"item_name" binding:"required"`
	ItemQuantity int64  `json:"item_quantity" binding:"required,min=1"`
	TotalPrice   int64  `json:"total_price" binding:"required,min=0"`
}

type ExpenseDTO struct {
	ID             string           `json:"id"`
	UserID         string           `json:"user_id"`
	WalletID       string           `json:"wallet_id"`
	CategoryID     uint64           `json:"category_id"`
	ExpenseName    string           `json:"expense_name"`
	ExpenseDetails string           `json:"expense_details"`
	ExpenseItems   []ExpenseItemDTO `json:"expense_items"`
	Amount         int64            `json:"amount"`
	Status         string           `json:"status"`
	Date           string           `json:"date"`
	CreatedAt      time.Time        `json:"created_at"`
	UpdatedAt      time.Time        `json:"updated_at"`
}

type ExpenseCategoryDTO struct {
	ID          uint64    `json:"id"`
	UserID      string    `json:"user_id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type CreateExpenseInput struct {
	WalletID       string           `json:"wallet_id" binding:"required"`
	CategoryID     uint64           `json:"category_id" binding:"required"`
	ExpenseName    string           `json:"expense_name" binding:"required"`
	ExpenseDetails string           `json:"expense_details"`
	ExpenseItems   []ExpenseItemDTO `json:"expense_items" binding:"dive"`
	Amount         int64            `json:"amount" binding:"required,min=0"`
	Date           string           `json:"date" binding:"required"`
}

type UpdateExpenseInput struct {
	WalletID       string           `json:"wallet_id"`
	CategoryID     uint64           `json:"category_id"`
	ExpenseName    string           `json:"expense_name"`
	ExpenseDetails string           `json:"expense_details"`
	ExpenseItems   []ExpenseItemDTO `json:"expense_items" binding:"dive"`
	Amount         int64            `json:"amount"`
	Status         string           `json:"status"`
	Date           string           `json:"date"`
}

type CreateExpenseCategoryInput struct {
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
}

type UpdateExpenseCategoryInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}
