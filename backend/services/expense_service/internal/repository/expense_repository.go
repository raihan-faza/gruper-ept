package repository

import (
	"context"
	"errors"

	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/constant"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/model"
	"gorm.io/gorm"
)

type ExpenseRepository interface {
	CreateExpense(ctx context.Context, expense *model.Expense) error
	UpdateExpense(ctx context.Context, expense *model.Expense) error
	DeleteExpense(ctx context.Context, expense *model.Expense) error
	GetExpenseByID(ctx context.Context, expenseID string) (*model.Expense, error)
	GetAllExpenses(ctx context.Context, userID, walletID string) ([]*model.Expense, error)
	CreateExpenseCategory(ctx context.Context, category *model.ExpenseCategory) error
	UpdateExpenseCategory(ctx context.Context, category *model.ExpenseCategory) error
	DeleteExpenseCategory(ctx context.Context, categoryID string) error
	GetExpenseCategoryByID(ctx context.Context, categoryID string) (*model.ExpenseCategory, error)
	GetAllExpensesCategory(ctx context.Context, userID string) ([]*model.ExpenseCategory, error)
}

type expenseRepository struct {
	db *gorm.DB
}

func NewExpenseRepository(db *gorm.DB) ExpenseRepository {
	return &expenseRepository{db: db}
}

func (r *expenseRepository) getDB(ctx context.Context) *gorm.DB {
	if tx, ok := ctx.Value(constant.TxKey).(*gorm.DB); ok {
		return tx
	}
	return r.db
}

func (r *expenseRepository) CreateExpense(ctx context.Context, expense *model.Expense) error {
	return r.getDB(ctx).WithContext(ctx).Create(expense).Error
}

func (r *expenseRepository) UpdateExpense(ctx context.Context, expense *model.Expense) error {
	return r.getDB(ctx).WithContext(ctx).Save(expense).Error
}

func (r *expenseRepository) DeleteExpense(ctx context.Context, expense *model.Expense) error {
	result := r.getDB(ctx).WithContext(ctx).Delete(&model.Expense{}, expense.Id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("expense not found")
	}
	return nil
}

func (r *expenseRepository) GetExpenseByID(ctx context.Context, expenseID string) (*model.Expense, error) {
	var expense model.Expense
	if err := r.getDB(ctx).WithContext(ctx).Where("id = ?", expenseID).First(&expense).Error; err != nil {
		return nil, err
	}
	return &expense, nil
}

func (r *expenseRepository) CreateExpenseCategory(ctx context.Context, category *model.ExpenseCategory) error {
	return r.getDB(ctx).WithContext(ctx).Create(category).Error
}

func (r *expenseRepository) UpdateExpenseCategory(ctx context.Context, category *model.ExpenseCategory) error {
	return r.getDB(ctx).WithContext(ctx).Save(category).Error
}

func (r *expenseRepository) DeleteExpenseCategory(ctx context.Context, categoryID string) error {
	result := r.getDB(ctx).WithContext(ctx).Delete(&model.ExpenseCategory{}, categoryID)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("expense category not found")
	}
	return nil
}

func (r *expenseRepository) GetExpenseCategoryByID(ctx context.Context, categoryID string) (*model.ExpenseCategory, error) {
	var category model.ExpenseCategory
	if err := r.getDB(ctx).WithContext(ctx).Where("id = ?", categoryID).First(&category).Error; err != nil {
		return nil, err
	}
	return &category, nil
}

func (r *expenseRepository) GetAllExpenses(ctx context.Context, userID, walletID string) ([]*model.Expense, error) {
	var expenses []*model.Expense
	query := r.getDB(ctx).WithContext(ctx)

	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if walletID != "" {
		query = query.Where("wallet_id = ?", walletID)
	}

	if err := query.Find(&expenses).Error; err != nil {
		return nil, err
	}
	return expenses, nil
}

func (r *expenseRepository) GetAllExpensesCategory(ctx context.Context, userID string) ([]*model.ExpenseCategory, error) {
	var categories []*model.ExpenseCategory
	query := r.getDB(ctx).WithContext(ctx)

	if userID != "" {
		query = query.Where("user_id = ?", userID)
	}

	if err := query.Find(&categories).Error; err != nil {
		return nil, err
	}
	return categories, nil
}
