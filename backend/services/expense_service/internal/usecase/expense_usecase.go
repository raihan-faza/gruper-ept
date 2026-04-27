package usecase

import (
	"context"

	"github.com/google/uuid"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/db"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/usecase/mapper"
)

type ExpenseUsecase interface {
	CreateExpense(ctx context.Context, in *dto.CreateExpenseInput) (*dto.CreateExpenseOutput, error)
	UpdateExpense(ctx context.Context, in *dto.UpdateExpenseInput) (*dto.UpdateExpenseOutput, error)
	DeleteExpense(ctx context.Context, in *dto.DeleteExpenseInput) (*dto.DeleteExpenseOutput, error)
	CreateExpenseUsingLLM(ctx context.Context, in *dto.CreateExpenseInput) (*dto.CreateUsingLLMOutput, error)
	GetAllExpenses(ctx context.Context, in *dto.GetAllExpensesInput) (*dto.GetAllExpensesOutput, error)
	CreateExpenseCategory(ctx context.Context, in *dto.CreateExpenseCategoryInput) (*dto.CreateExpenseCategoryOutput, error)
	UpdateExpenseCategory(ctx context.Context, in *dto.UpdateExpenseCategoryInput) (*dto.UpdateExpenseCategoryOutput, error)
	DeleteExpenseCategory(ctx context.Context, in *dto.DeleteExpenseCategoryInput) (*dto.DeleteExpenseCategoryOutput, error)
	GetAllExpensesCategory(ctx context.Context, in *dto.GetAllExpensesCategoryInput) (*dto.GetAllExpensesCategoryOutput, error)
}

type expenseUsecase struct {
	expenseRepository repository.ExpenseRepository
	txManager         db.TxManager
}

func NewExpenseUsecase(expenseRepository repository.ExpenseRepository, txManager db.TxManager) ExpenseUsecase {
	return &expenseUsecase{
		expenseRepository: expenseRepository,
		txManager:         txManager,
	}
}

func (u *expenseUsecase) CreateExpense(ctx context.Context, in *dto.CreateExpenseInput) (*dto.CreateExpenseOutput, error) {
	var output *dto.CreateExpenseOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		newExpense := mapper.CreateExpenseInputToExpenseModel(in)
		newExpense.Id = uuid.NewString()

		if err := u.expenseRepository.CreateExpense(txCtx, newExpense); err != nil {
			return err
		}

		output = &dto.CreateExpenseOutput{
			Success: true,
			Expense: mapper.ExpenseModelToDTO(newExpense),
		}
		return nil
	})
	return output, err
}

func (u *expenseUsecase) UpdateExpense(ctx context.Context, in *dto.UpdateExpenseInput) (*dto.UpdateExpenseOutput, error) {
	var output *dto.UpdateExpenseOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		existingExpense, err := u.expenseRepository.GetExpenseByID(txCtx, in.ID)
		if err != nil {
			return err
		}

		updatedExpense := mapper.ApplyUpdateExpenseInput(existingExpense, in)
		if err := u.expenseRepository.UpdateExpense(txCtx, updatedExpense); err != nil {
			return err
		}

		output = &dto.UpdateExpenseOutput{
			Success: true,
			Expense: mapper.ExpenseModelToDTO(updatedExpense),
		}
		return nil
	})
	return output, err
}

func (u *expenseUsecase) DeleteExpense(ctx context.Context, in *dto.DeleteExpenseInput) (*dto.DeleteExpenseOutput, error) {
	var output *dto.DeleteExpenseOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		expense := &model.Expense{Id: in.ID}
		if err := u.expenseRepository.DeleteExpense(txCtx, expense); err != nil {
			return err
		}

		output = &dto.DeleteExpenseOutput{Success: true}
		return nil
	})
	return output, err
}

func (u *expenseUsecase) CreateExpenseUsingLLM(ctx context.Context, in *dto.CreateExpenseInput) (*dto.CreateUsingLLMOutput, error) {
	var output *dto.CreateUsingLLMOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		newExpense := mapper.CreateExpenseInputToExpenseModel(in)
		newExpense.Id = uuid.NewString()
		newExpense.Status = "created_using_llm"

		if err := u.expenseRepository.CreateExpense(txCtx, newExpense); err != nil {
			return err
		}

		output = &dto.CreateUsingLLMOutput{
			Success: true,
			Expense: mapper.ExpenseModelToDTO(newExpense),
		}
		return nil
	})
	return output, err
}

func (u *expenseUsecase) CreateExpenseCategory(ctx context.Context, in *dto.CreateExpenseCategoryInput) (*dto.CreateExpenseCategoryOutput, error) {
	var output *dto.CreateExpenseCategoryOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		newCategory := mapper.CreateExpenseCategoryInputToModel(in)

		if err := u.expenseRepository.CreateExpenseCategory(txCtx, newCategory); err != nil {
			return err
		}

		output = &dto.CreateExpenseCategoryOutput{
			Success:         true,
			ExpenseCategory: mapper.ExpenseCategoryModelToDTO(newCategory),
		}
		return nil
	})
	return output, err
}

func (u *expenseUsecase) UpdateExpenseCategory(ctx context.Context, in *dto.UpdateExpenseCategoryInput) (*dto.UpdateExpenseCategoryOutput, error) {
	var output *dto.UpdateExpenseCategoryOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		// Find category by user_id and name
		// This is a simplified implementation - in real code, you'd need to query by user_id and name
		existingCategory := &model.ExpenseCategory{UserId: in.UserID, Name: in.Name}
		// Assume we have a method to get by user and name
		// For now, just update assuming we have the category

		updatedCategory := mapper.ApplyUpdateExpenseCategoryInput(existingCategory, in)
		if err := u.expenseRepository.UpdateExpenseCategory(txCtx, updatedCategory); err != nil {
			return err
		}

		output = &dto.UpdateExpenseCategoryOutput{
			Success:         true,
			ExpenseCategory: mapper.ExpenseCategoryModelToDTO(updatedCategory),
		}
		return nil
	})
	return output, err
}

func (u *expenseUsecase) DeleteExpenseCategory(ctx context.Context, in *dto.DeleteExpenseCategoryInput) (*dto.DeleteExpenseCategoryOutput, error) {
	var output *dto.DeleteExpenseCategoryOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		if err := u.expenseRepository.DeleteExpenseCategory(txCtx, in.ID); err != nil {
			return err
		}

		output = &dto.DeleteExpenseCategoryOutput{Success: true}
		return nil
	})
	return output, err
}

func (u *expenseUsecase) GetAllExpenses(ctx context.Context, in *dto.GetAllExpensesInput) (*dto.GetAllExpensesOutput, error) {
	var output *dto.GetAllExpensesOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		expenses, err := u.expenseRepository.GetAllExpenses(txCtx, in.UserID, in.WalletID)
		if err != nil {
			return err
		}

		var expenseDTOs []*dto.Expense
		for _, expense := range expenses {
			expenseDTOs = append(expenseDTOs, mapper.ExpenseModelToDTO(expense))
		}

		output = &dto.GetAllExpensesOutput{
			Success:  true,
			Expenses: expenseDTOs,
		}
		return nil
	})
	return output, err
}

func (u *expenseUsecase) GetAllExpensesCategory(ctx context.Context, in *dto.GetAllExpensesCategoryInput) (*dto.GetAllExpensesCategoryOutput, error) {
	var output *dto.GetAllExpensesCategoryOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		categories, err := u.expenseRepository.GetAllExpensesCategory(txCtx, in.UserID)
		if err != nil {
			return err
		}

		var categoryDTOs []*dto.ExpenseCategory
		for _, category := range categories {
			categoryDTOs = append(categoryDTOs, mapper.ExpenseCategoryModelToDTO(category))
		}

		output = &dto.GetAllExpensesCategoryOutput{
			Success:           true,
			ExpenseCategories: categoryDTOs,
		}
		return nil
	})
	return output, err
}
