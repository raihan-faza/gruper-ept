package usecase

import (
	"context"
	"errors"
	"log"

	"github.com/google/uuid"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/constant"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/db"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/usecase/mapper"
	walletPb "github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/pb/wallet_service"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type ExpenseUsecase interface {
	CreateExpense(ctx context.Context, in *dto.Expense) (*dto.CreateExpenseOutput, error)
	UpdateExpense(ctx context.Context, in *dto.UpdateExpenseInput) (*dto.UpdateExpenseOutput, error)
	DeleteExpense(ctx context.Context, in *dto.DeleteExpenseInput) error
	GetAllExpensesByWalletId(ctx context.Context, in *dto.GetAllExpensesByWalletIdInput) (*dto.GetAllExpensesOutput, error)
	GetAllExpensesByUserId(ctx context.Context, in *dto.GetAllExpensesByUserIdInput) (*dto.GetAllExpensesOutput, error)
	GetExpenseById(ctx context.Context, in *dto.GetExpenseByIdInput) (*dto.GetExpenseByIdOutput, error)
	CreateExpenseCategory(ctx context.Context, in *dto.ExpenseCategory) (*dto.CreateExpenseCategoryOutput, error)
	UpdateExpenseCategory(ctx context.Context, in *dto.UpdateExpenseCategoryInput) (*dto.UpdateExpenseCategoryOutput, error)
	DeleteExpenseCategory(ctx context.Context, in *dto.DeleteExpenseCategoryInput) error
	GetAllExpensesCategory(ctx context.Context, in *dto.GetAllExpensesCategoryInput) (*dto.GetAllExpensesCategoryOutput, error)
}

type expenseUsecase struct {
	expenseRepository repository.ExpenseRepository
	txManager         db.TxManager
	walletService     walletPb.WalletServiceClient
}

func NewExpenseUsecase(expenseRepository repository.ExpenseRepository, txManager db.TxManager, walletService walletPb.WalletServiceClient) ExpenseUsecase {
	return &expenseUsecase{
		expenseRepository: expenseRepository,
		txManager:         txManager,
		walletService:     walletService,
	}
}

func (u *expenseUsecase) CreateExpense(ctx context.Context, in *dto.Expense) (*dto.CreateExpenseOutput, error) {
	var output *dto.CreateExpenseOutput
	userId := ctx.Value("user_id").(string)
	if userId == "" {
		return nil, status.Errorf(codes.Unauthenticated, "ExpenseUsecase.CreateExpense(): missing user id")
	}

	existingExpense, idempotencyCheckErr := u.expenseRepository.GetExpenseByIdempotencyKey(ctx, in.IdempotencyKey)
	if existingExpense != nil && idempotencyCheckErr == nil {
		return &dto.CreateExpenseOutput{
			Expense: mapper.ExpenseModelToDTO(existingExpense),
		}, nil
	}

	newExpenseId := uuid.NewString()
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		newExpense := mapper.CreateExpenseInputToExpenseModel(in)
		newExpense.Id = newExpenseId
		newExpense.IdempotencyKey = in.IdempotencyKey

		if err := u.expenseRepository.CreateExpense(txCtx, newExpense); err != nil {
			return err
		}

		output = &dto.CreateExpenseOutput{
			Expense: mapper.ExpenseModelToDTO(newExpense),
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	ctx = metadata.AppendToOutgoingContext(ctx, "user_id", userId)
	_, walletCallErr := u.walletService.ValidateAndDeductBalance(ctx, &walletPb.ValidateAndDeductBalanceRequest{
		WalletId:       in.WalletID,
		Amount:         in.Amount,
		IdempotencyKey: in.IdempotencyKey,
	})

	if walletCallErr != nil {
		deleteErr := u.expenseRepository.DeleteExpense(ctx, &model.Expense{Id: newExpenseId})
		if deleteErr != nil {
			log.Printf("ExpenseUsecase.CreateExpense(): failed to delete pending expense after wallet check failure: %v", deleteErr)
		}
		return nil, walletCallErr
	}

	statusUpdateErr := u.expenseRepository.UpdateExpenseStatusToSuccess(ctx, output.Expense.ID)
	if statusUpdateErr != nil {
		return nil, statusUpdateErr
	}
	return output, nil
}

func (u *expenseUsecase) UpdateExpense(ctx context.Context, in *dto.UpdateExpenseInput) (*dto.UpdateExpenseOutput, error) {
	// hal yang perlu di cek
	// - apakah user member dari walletnya (wallet_service yang ngecek)
	// - apakah balancenya cukup (wallet_service yang ngecek)
	// - berubahnya nambah atau ngurang angka total expensenya (wallet_service yang ngecek)
	//	-- kalau nambah balancenya ngurang, kalau ngurang balancenya nambah(wallet_service yang ngecek)
	var output *dto.UpdateExpenseOutput
	userId := ctx.Value("user_id").(string)
	if userId == "" {
		return nil, status.Errorf(codes.Unauthenticated, "ExpenseUsecase.UpdateExpense(): missing user id")
	}

	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		existingExpense, err := u.expenseRepository.GetExpenseByID(txCtx, in.Expense.ID)
		if err != nil {
			return err
		}

		updatedExpense := mapper.ApplyUpdateExpenseInput(existingExpense, in)
		if err := u.expenseRepository.UpdateExpense(txCtx, updatedExpense); err != nil {
			return err
		}

		output = &dto.UpdateExpenseOutput{
			Expense: mapper.ExpenseModelToDTO(updatedExpense),
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	ctx = metadata.AppendToOutgoingContext(ctx, "user_id", userId)
	_, err = u.walletService.RefundWalletMemberBalance(ctx, &walletPb.RefundWalletMemberBalanceRequest{
		WalletId: in.Expense.WalletID,
		Amount:   in.Expense.Amount,
	})
	return output, err
}

func (u *expenseUsecase) DeleteExpense(ctx context.Context, in *dto.DeleteExpenseInput) error {
	// hal yang perlu di cek
	// - expensenya beneran punya user yang minta bukan
	// - balikin balance dari expense yang di delete
	var expenseAmount int64
	var walletId string
	var expenseStatus string
	userId := ctx.Value("user_id").(string)
	if userId == "" {
		return status.Errorf(codes.Unauthenticated, "ExpenseUsecase.DeleteExpense(): missing user id")
	}

	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		expense, err := u.expenseRepository.GetExpenseByID(txCtx, in.ExpenseId)
		if err != nil {
			return err
		}
		expenseAmount = expense.Amount
		walletId = expense.WalletId
		expenseStatus = expense.Status
		if err := u.expenseRepository.DeleteExpense(txCtx, expense); err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		return err
	}

	if expenseStatus == constant.StatusCompleted {
		ctx = metadata.AppendToOutgoingContext(ctx, "user_id", userId)
		log.Printf("userid from expense usecase.deleteexpense: %v", userId)
		_, err = u.walletService.RefundWalletMemberBalance(ctx, &walletPb.RefundWalletMemberBalanceRequest{
			WalletId: walletId,
			Amount:   expenseAmount,
			UserId:   userId,
		})
		return err
	}

	return nil
}

func (u *expenseUsecase) CreateExpenseCategory(ctx context.Context, in *dto.ExpenseCategory) (*dto.CreateExpenseCategoryOutput, error) {
	var output *dto.CreateExpenseCategoryOutput
	userId := ctx.Value("user_id").(string)
	if userId == "" {
		return nil, status.Errorf(codes.Unauthenticated, "ExpenseUsecase.CreateExpenseCategory(): missing user id")
	}
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		newCategory := mapper.CreateExpenseCategoryInputToModel(in)
		if err := u.expenseRepository.CreateExpenseCategory(txCtx, newCategory); err != nil {
			return err
		}
		output = &dto.CreateExpenseCategoryOutput{
			ExpenseCategory: mapper.ExpenseCategoryModelToDTO(newCategory),
		}
		return nil
	})
	return output, err
}

func (u *expenseUsecase) UpdateExpenseCategory(ctx context.Context, in *dto.UpdateExpenseCategoryInput) (*dto.UpdateExpenseCategoryOutput, error) {
	var output *dto.UpdateExpenseCategoryOutput
	userId := ctx.Value("user_id").(string)
	if userId == "" {
		return nil, status.Errorf(codes.Unauthenticated, "ExpenseUsecase.UpdateExpenseCategory(): missing user id")
	}
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		existingCategory := &model.ExpenseCategory{UserId: &in.ExpenseCategory.UserID, Name: in.ExpenseCategory.Name}
		updatedCategory := mapper.ApplyUpdateExpenseCategoryInput(existingCategory, in)
		if err := u.expenseRepository.UpdateExpenseCategory(txCtx, updatedCategory); err != nil {
			return err
		}
		output = &dto.UpdateExpenseCategoryOutput{
			ExpenseCategory: mapper.ExpenseCategoryModelToDTO(updatedCategory),
		}
		return nil
	})
	return output, err
}

func (u *expenseUsecase) DeleteExpenseCategory(ctx context.Context, in *dto.DeleteExpenseCategoryInput) error {
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		category, err := u.expenseRepository.GetExpenseCategoryByID(txCtx, uint(in.ID))
		if err != nil {
			return err
		}

		if category.UserId != nil && *category.UserId != in.UserID {
			return errors.New("you don't have permission to delete this expense category")
		}

		if err := u.expenseRepository.DeleteExpenseCategory(txCtx, uint(in.ID)); err != nil {
			return err
		}
		return nil
	})
	return err
}

func (u *expenseUsecase) GetAllExpensesByWalletId(ctx context.Context, in *dto.GetAllExpensesByWalletIdInput) (*dto.GetAllExpensesOutput, error) {
	var output *dto.GetAllExpensesOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		expenses, err := u.expenseRepository.GetAllExpensesByWalletId(txCtx, in.WalletID)
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

func (u *expenseUsecase) GetAllExpensesByUserId(ctx context.Context, in *dto.GetAllExpensesByUserIdInput) (*dto.GetAllExpensesOutput, error) {
	var output *dto.GetAllExpensesOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		expenses, err := u.expenseRepository.GetAllExpensesByUserId(txCtx, in.UserID)
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

func (u *expenseUsecase) GetExpenseById(ctx context.Context, in *dto.GetExpenseByIdInput) (*dto.GetExpenseByIdOutput, error) {
	var output *dto.GetExpenseByIdOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		expense, err := u.expenseRepository.GetExpenseByID(txCtx, in.ExpenseID)
		if err != nil {
			return err
		}
		output = &dto.GetExpenseByIdOutput{
			Expense: mapper.ExpenseModelToDTO(expense),
		}
		return nil
	})
	return output, err
}
