package mapper

import (
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/pb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func ToCreateExpenseInput(req *pb.CreateExpenseRequest) *dto.CreateExpenseInput {
	return &dto.CreateExpenseInput{
		UserID:     req.GetUserId(),
		WalletID:   req.GetWalletId(),
		CategoryID: req.GetCategoryId(),
		Amount:     req.GetAmount(),
	}
}

func ToUpdateExpenseInput(req *pb.UpdateExpenseRequest) *dto.UpdateExpenseInput {
	return &dto.UpdateExpenseInput{
		ID:         req.GetId(),
		UserID:     req.GetUserId(),
		WalletID:   req.GetWalletId(),
		CategoryID: req.GetCategoryId(),
		Amount:     req.GetAmount(),
		UpdateMask: req.GetUpdateMask().GetPaths(),
	}
}

func ToDeleteExpenseInput(req *pb.DeleteExpenseRequest) *dto.DeleteExpenseInput {
	return &dto.DeleteExpenseInput{ID: req.GetId()}
}

func ToCreateExpenseCategoryInput(req *pb.CreateExpenseCategoryRequest) *dto.CreateExpenseCategoryInput {
	return &dto.CreateExpenseCategoryInput{
		UserID:      req.GetUserId(),
		Name:        req.GetName(),
		Description: req.GetDescription(),
	}
}

func ToUpdateExpenseCategoryInput(req *pb.UpdateExpenseCategoryRequest) *dto.UpdateExpenseCategoryInput {
	return &dto.UpdateExpenseCategoryInput{
		UserID:      req.GetUserId(),
		Name:        req.GetName(),
		Description: req.GetDescription(),
		UpdateMask:  req.GetUpdateMask().GetPaths(),
	}
}

func ToDeleteExpenseCategoryInput(req *pb.DeleteExpenseCategoryRequest) *dto.DeleteExpenseCategoryInput {
	return &dto.DeleteExpenseCategoryInput{
		ID:     req.GetId(),
		UserID: req.GetUserId(),
	}
}

func ToGetAllExpensesInput(req *pb.GetAllExpensesRequest) *dto.GetAllExpensesInput {
	return &dto.GetAllExpensesInput{
		UserID:   req.GetUserId(),
		WalletID: req.GetWalletId(),
	}
}

func ToGetAllExpensesCategoryInput(req *pb.GetAllExpensesCategoryRequest) *dto.GetAllExpensesCategoryInput {
	return &dto.GetAllExpensesCategoryInput{
		UserID: req.GetUserId(),
	}
}

func ToCreateExpenseResponse(out *dto.CreateExpenseOutput) *pb.CreateExpenseResponse {
	return &pb.CreateExpenseResponse{
		Success: out.Success,
		Expense: ExpenseToProto(out.Expense),
	}
}

func ToUpdateExpenseResponse(out *dto.UpdateExpenseOutput) *pb.UpdateExpenseResponse {
	return &pb.UpdateExpenseResponse{
		Success: out.Success,
		Expense: ExpenseToProto(out.Expense),
	}
}

func ToDeleteExpenseResponse(out *dto.DeleteExpenseOutput) *pb.DeleteExpenseResponse {
	return &pb.DeleteExpenseResponse{Success: out.Success}
}

func ToCreateUsingLLMResponse(out *dto.CreateUsingLLMOutput) *pb.CreateUsingLLMResponse {
	return &pb.CreateUsingLLMResponse{
		Success: out.Success,
		Expense: ExpenseToProto(out.Expense),
	}
}

func ToCreateExpenseCategoryResponse(out *dto.CreateExpenseCategoryOutput) *pb.CreateExpenseCategoryResponse {
	return &pb.CreateExpenseCategoryResponse{
		Success:         out.Success,
		ExpenseCategory: ExpenseCategoryToProto(out.ExpenseCategory),
	}
}

func ToUpdateExpenseCategoryResponse(out *dto.UpdateExpenseCategoryOutput) *pb.UpdateExpenseCategoryResponse {
	return &pb.UpdateExpenseCategoryResponse{
		Success:         out.Success,
		ExpenseCategory: ExpenseCategoryToProto(out.ExpenseCategory),
	}
}

func ToDeleteExpenseCategoryResponse(out *dto.DeleteExpenseCategoryOutput) *pb.DeleteExpenseCategoryResponse {
	return &pb.DeleteExpenseCategoryResponse{Success: out.Success}
}

func ToGetAllExpensesResponse(out *dto.GetAllExpensesOutput) *pb.GetAllExpensesResponse {
	var expenses []*pb.Expense
	for _, exp := range out.Expenses {
		expenses = append(expenses, ExpenseToProto(exp))
	}
	return &pb.GetAllExpensesResponse{
		Success:  out.Success,
		Expenses: expenses,
	}
}

func ToGetAllExpensesCategoryResponse(out *dto.GetAllExpensesCategoryOutput) *pb.GetAllExpensesCategoryResponse {
	var categories []*pb.ExpenseCategory
	for _, cat := range out.ExpenseCategories {
		categories = append(categories, ExpenseCategoryToProto(cat))
	}
	return &pb.GetAllExpensesCategoryResponse{
		Success:           out.Success,
		ExpenseCategories: categories,
	}
}

func ExpenseCategoryToProto(category *dto.ExpenseCategory) *pb.ExpenseCategory {
	if category == nil {
		return nil
	}
	return &pb.ExpenseCategory{
		Id:          uint32(category.ID),
		UserId:      category.UserID,
		Name:        category.Name,
		Description: category.Description,
		CreatedAt:   timestamppb.New(category.CreatedAt),
		UpdatedAt:   timestamppb.New(category.UpdatedAt),
	}
}

func ExpenseToProto(expense *dto.Expense) *pb.Expense {
	if expense == nil {
		return nil
	}
	return &pb.Expense{
		Id:         expense.ID,
		UserId:     expense.UserID,
		WalletId:   expense.WalletID,
		CategoryId: expense.CategoryID,
		Amount:     expense.Amount,
		Status:     expense.Status,
		CreatedAt:  timestamppb.New(expense.CreatedAt),
		UpdatedAt:  timestamppb.New(expense.UpdatedAt),
	}
}

func CreateExpenseInputToExpenseModel(in *dto.CreateExpenseInput) *model.Expense {
	return &model.Expense{
		UserId:     in.UserID,
		WalletId:   in.WalletID,
		CategoryId: in.CategoryID,
		Amount:     in.Amount,
		Status:     "pending",
	}
}

func ApplyUpdateExpenseInput(existing *model.Expense, in *dto.UpdateExpenseInput) *model.Expense {
	existing.UserId = in.UserID
	existing.WalletId = in.WalletID
	existing.CategoryId = in.CategoryID
	existing.Amount = in.Amount
	return existing
}

func ExpenseModelToDTO(expense *model.Expense) *dto.Expense {
	if expense == nil {
		return nil
	}
	return &dto.Expense{
		ID:         expense.Id,
		UserID:     expense.UserId,
		WalletID:   expense.WalletId,
		CategoryID: expense.CategoryId,
		Amount:     expense.Amount,
		Status:     expense.Status,
		CreatedAt:  expense.CreatedAt,
		UpdatedAt:  expense.UpdatedAt,
	}
}

func ExpenseCategoryModelToDTO(category *model.ExpenseCategory) *dto.ExpenseCategory {
	if category == nil {
		return nil
	}
	return &dto.ExpenseCategory{
		ID:          category.ID,
		UserID:      category.UserId,
		Name:        category.Name,
		Description: category.Description,
		CreatedAt:   category.CreatedAt,
		UpdatedAt:   category.UpdatedAt,
	}
}

func CreateExpenseCategoryInputToModel(in *dto.CreateExpenseCategoryInput) *model.ExpenseCategory {
	return &model.ExpenseCategory{
		UserId:      in.UserID,
		Name:        in.Name,
		Description: in.Description,
	}
}

func ApplyUpdateExpenseCategoryInput(existing *model.ExpenseCategory, in *dto.UpdateExpenseCategoryInput) *model.ExpenseCategory {
	existing.UserId = in.UserID
	existing.Name = in.Name
	existing.Description = in.Description
	return existing
}
