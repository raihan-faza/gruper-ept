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

type Expense struct {
	ID         string
	UserID     string
	WalletID   string
	CategoryID string
	Amount     int64
	Status     string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

type CreateExpenseInput struct {
	UserID     string
	WalletID   string
	CategoryID string
	Amount     int64
}

type UpdateExpenseInput struct {
	ID         string
	UserID     string
	WalletID   string
	CategoryID string
	Amount     int64
	UpdateMask []string
}

type DeleteExpenseInput struct {
	ID string
}

type CreateExpenseCategoryInput struct {
	UserID      string
	Name        string
	Description string
}

type UpdateExpenseCategoryInput struct {
	UserID      string
	Name        string
	Description string
	UpdateMask  []string
}

type DeleteExpenseCategoryInput struct {
	ID     string
	UserID string
}

type CreateExpenseOutput struct {
	Success bool
	Expense *Expense
}

type UpdateExpenseOutput struct {
	Success bool
	Expense *Expense
}

type DeleteExpenseOutput struct {
	Success bool
}

type CreateUsingLLMOutput struct {
	Success bool
	Expense *Expense
}

type CreateExpenseCategoryOutput struct {
	Success         bool
	ExpenseCategory *ExpenseCategory
}

type UpdateExpenseCategoryOutput struct {
	Success         bool
	ExpenseCategory *ExpenseCategory
}

type DeleteExpenseCategoryOutput struct {
	Success bool
}

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
