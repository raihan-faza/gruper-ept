package dto

import "time"

type ExpenseCategory struct {
	ID          uint
	UserID      string
	Name        string
	Description string
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type ExpenseItem struct {
	ItemName     string
	ItemQuantity int64
	TotalPrice   int64
}

type Expense struct {
	ID             string
	ExpenseName    string
	ExpenseDetails string
	ExpenseItems   []ExpenseItem
	UserID         string
	WalletID       string
	CategoryID     uint64
	Amount         int64
	Status         string
	Date           time.Time
	IdempotencyKey string
	CreatedAt      time.Time
	UpdatedAt      time.Time
}

type UpdateExpenseInput struct {
	Expense    Expense
	UpdateMask []string
}

type DeleteExpenseInput struct {
	ExpenseId string
	UserId    string
}

type UpdateExpenseCategoryInput struct {
	ExpenseCategory ExpenseCategory
	UpdateMask      []string
}

type DeleteExpenseCategoryInput struct {
	ID     uint
	UserID string
}

type CreateExpenseOutput struct {
	Expense *Expense
}

type UpdateExpenseOutput struct {
	Expense *Expense
}

type DeleteExpenseOutput struct{}

type CreateExpenseCategoryOutput struct {
	ExpenseCategory *ExpenseCategory
}

type UpdateExpenseCategoryOutput struct {
	ExpenseCategory *ExpenseCategory
}

type DeleteExpenseCategoryOutput struct{}

type GetAllExpensesInput struct {
	UserID   string
	WalletID string
}

type GetAllExpensesOutput struct {
	Success  bool
	Expenses []*Expense
}

type GetAllExpensesCategoryInput struct {
	UserID string
}

type GetAllExpensesCategoryOutput struct {
	Success           bool
	ExpenseCategories []*ExpenseCategory
}

func NewExpenseCategory(userID, name, description string) ExpenseCategory {
	return ExpenseCategory{
		UserID:      userID,
		Name:        name,
		Description: description,
	}
}
