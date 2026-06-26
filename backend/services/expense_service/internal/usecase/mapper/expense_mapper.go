package mapper

import (
	"time"

	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/constant"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/pb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func ToCreateExpenseInput(req *pb.CreateExpenseRequest) *dto.Expense {
	var dateVal time.Time
	if req.GetExpense().GetDate() != "" {
		if t, err := time.Parse(time.RFC3339, req.GetExpense().GetDate()); err == nil {
			dateVal = t
		} else if t, err := time.Parse("2006-01-02", req.GetExpense().GetDate()); err == nil {
			dateVal = t
		}
	}
	return &dto.Expense{
		ExpenseName:    req.GetExpense().GetExpenseName(),
		ExpenseDetails: req.GetExpense().GetExpenseDetails(),
		ExpenseItems:   MapExpenseItemsFromProto(req.Expense.GetExpenseItems()),
		UserID:         req.GetExpense().GetUserId(),
		WalletID:       req.GetExpense().GetWalletId(),
		CategoryID:     req.Expense.GetCategoryId(),
		Amount:         req.GetExpense().GetAmount(),
		IdempotencyKey: req.GetExpense().GetIdempotencyKey(),
		Status:         constant.StatusPending,
		Date:           dateVal,
	}
}

func ToUpdateExpenseInput(req *pb.UpdateExpenseRequest) *dto.UpdateExpenseInput {
	var dateVal time.Time
	if req.GetExpense().GetDate() != "" {
		if t, err := time.Parse(time.RFC3339, req.GetExpense().GetDate()); err == nil {
			dateVal = t
		} else if t, err := time.Parse("2006-01-02", req.GetExpense().GetDate()); err == nil {
			dateVal = t
		}
	}
	return &dto.UpdateExpenseInput{
		Expense: dto.Expense{
			ID:             req.GetExpense().GetId(),
			ExpenseName:    req.GetExpense().GetExpenseName(),
			ExpenseDetails: req.GetExpense().GetExpenseDetails(),
			ExpenseItems:   MapExpenseItemsFromProto(req.GetExpense().GetExpenseItems()),
			UserID:         req.GetExpense().GetUserId(),
			WalletID:       req.GetExpense().GetWalletId(),
			CategoryID:     req.Expense.GetCategoryId(),
			Amount:         req.GetExpense().GetAmount(),
			Status:         req.GetExpense().GetStatus(),
			Date:           dateVal,
		},
		UpdateMask: req.GetUpdateMask().GetPaths(),
	}
}

func ToDeleteExpenseInput(req *pb.DeleteExpenseRequest) *dto.DeleteExpenseInput {
	return &dto.DeleteExpenseInput{
		ExpenseId: req.GetExpenseId(),
	}
}

func ToCreateExpenseCategoryInput(req *pb.CreateExpenseCategoryRequest) *dto.ExpenseCategory {
	return &dto.ExpenseCategory{
		UserID:      req.GetExpenseCategory().GetUserId(),
		Name:        req.GetExpenseCategory().GetName(),
		Description: req.GetExpenseCategory().GetDescription(),
	}
}

func ToUpdateExpenseCategoryInput(req *pb.UpdateExpenseCategoryRequest) *dto.UpdateExpenseCategoryInput {
	return &dto.UpdateExpenseCategoryInput{
		ExpenseCategory: dto.ExpenseCategory{
			ID:          uint(req.GetExpenseCategory().GetId()),
			UserID:      req.GetExpenseCategory().GetUserId(),
			Name:        req.GetExpenseCategory().GetName(),
			Description: req.GetExpenseCategory().GetDescription(),
		},
		UpdateMask: req.GetUpdateMask().GetPaths(),
	}
}

func ToDeleteExpenseCategoryInput(req *pb.DeleteExpenseCategoryRequest) *dto.DeleteExpenseCategoryInput {
	return &dto.DeleteExpenseCategoryInput{
		ID:     uint(req.GetId()),
		UserID: req.GetUserId(),
	}
}

func ToGetAllExpensesByWalletIdInput(req *pb.GetAllExpensesByWalletIdRequest) *dto.GetAllExpensesByWalletIdInput {
	return &dto.GetAllExpensesByWalletIdInput{
		WalletID: req.GetWalletId(),
	}
}

func ToGetAllExpensesByUserIdInput(req *pb.GetAllExpensesByUserIdRequest) *dto.GetAllExpensesByUserIdInput {
	return &dto.GetAllExpensesByUserIdInput{
		UserID: req.GetUserId(),
	}
}

func ToGetExpenseByIdInput(req *pb.GetExpenseByIDRequest) *dto.GetExpenseByIdInput {
	return &dto.GetExpenseByIdInput{
		ExpenseID: req.GetExpenseId(),
	}
}

func ToGetExpenseByIdResponse(out *dto.GetExpenseByIdOutput) *pb.GetExpenseByIDResponse {
	return &pb.GetExpenseByIDResponse{
		Expense: ExpenseToProto(out.Expense),
	}
}

func ToGetAllExpensesCategoryInput(req *pb.GetAllExpensesCategoryRequest) *dto.GetAllExpensesCategoryInput {
	return &dto.GetAllExpensesCategoryInput{
		UserID: req.GetUserId(),
	}
}

func ToCreateExpenseResponse(out *dto.CreateExpenseOutput) *pb.CreateExpenseResponse {
	return &pb.CreateExpenseResponse{
		Expense: ExpenseToProto(out.Expense),
	}
}

func ToUpdateExpenseResponse(out *dto.UpdateExpenseOutput) *pb.UpdateExpenseResponse {
	return &pb.UpdateExpenseResponse{
		Expense: ExpenseToProto(out.Expense),
	}
}

func ToCreateExpenseCategoryResponse(out *dto.CreateExpenseCategoryOutput) *pb.CreateExpenseCategoryResponse {
	return &pb.CreateExpenseCategoryResponse{
		ExpenseCategory: ExpenseCategoryToProto(out.ExpenseCategory),
	}
}

func ToUpdateExpenseCategoryResponse(out *dto.UpdateExpenseCategoryOutput) *pb.UpdateExpenseCategoryResponse {
	return &pb.UpdateExpenseCategoryResponse{
		ExpenseCategory: ExpenseCategoryToProto(out.ExpenseCategory),
	}
}

func ToGetAllExpensesResponse(out *dto.GetAllExpensesOutput) *pb.GetAllExpensesResponse {
	var expenses []*pb.Expense
	for _, exp := range out.Expenses {
		expenses = append(expenses, ExpenseToProto(exp))
	}
	return &pb.GetAllExpensesResponse{
		Expenses: expenses,
	}
}

func ToGetAllExpensesCategoryResponse(out *dto.GetAllExpensesCategoryOutput) *pb.GetAllExpensesCategoryResponse {
	var categories []*pb.ExpenseCategory
	for _, cat := range out.ExpenseCategories {
		categories = append(categories, ExpenseCategoryToProto(cat))
	}
	return &pb.GetAllExpensesCategoryResponse{
		ExpenseCategories: categories,
	}
}

func ExpenseCategoryToProto(category *dto.ExpenseCategory) *pb.ExpenseCategory {
	if category == nil {
		return nil
	}
	return &pb.ExpenseCategory{
		Id:          uint64(category.ID),
		UserId:      category.UserID,
		Name:        category.Name,
		Description: category.Description,
		CreatedAt:   timestamppb.New(category.CreatedAt),
		UpdatedAt:   timestamppb.New(category.UpdatedAt),
	}
}

func MapExpenseItemsToProto(items []dto.ExpenseItem) []*pb.ExpenseItem {
	var protoItems []*pb.ExpenseItem
	for _, item := range items {
		protoItems = append(protoItems, &pb.ExpenseItem{
			ItemName:     item.ItemName,
			ItemQuantity: item.ItemQuantity,
			TotalPrice:   item.TotalPrice,
		})
	}
	return protoItems
}

func MapExpenseItemsFromProto(items []*pb.ExpenseItem) []dto.ExpenseItem {
	var expenseItems []dto.ExpenseItem
	for _, item := range items {
		expenseItems = append(expenseItems, dto.ExpenseItem{
			ItemName:     item.GetItemName(),
			ItemQuantity: item.GetItemQuantity(),
			TotalPrice:   item.GetTotalPrice(),
		})
	}
	return expenseItems
}

func ExpenseToProto(expense *dto.Expense) *pb.Expense {
	if expense == nil {
		return nil
	}
	var dateStr string
	if !expense.Date.IsZero() {
		dateStr = expense.Date.Format(time.RFC3339)
	}
	return &pb.Expense{
		Id:             expense.ID,
		ExpenseName:    expense.ExpenseName,
		ExpenseDetails: expense.ExpenseDetails,
		ExpenseItems:   MapExpenseItemsToProto(expense.ExpenseItems),
		UserId:         expense.UserID,
		WalletId:       expense.WalletID,
		CategoryId:     expense.CategoryID,
		Amount:         expense.Amount,
		Status:         expense.Status,
		CreatedAt:      timestamppb.New(expense.CreatedAt),
		UpdatedAt:      timestamppb.New(expense.UpdatedAt),
		Date:           dateStr,
	}
}

func MapExpenseItemsFromDtoToModel(items []dto.ExpenseItem) []model.ExpenseItem {
	var modelItems []model.ExpenseItem
	for _, item := range items {
		modelItems = append(modelItems, model.ExpenseItem{
			ItemName:     item.ItemName,
			ItemQuantity: item.ItemQuantity,
			TotalPrice:   item.TotalPrice,
		})
	}
	return modelItems
}

func MapExpenseItemsFromModelToDto(items []model.ExpenseItem) []dto.ExpenseItem {
	var dtoItems []dto.ExpenseItem
	for _, item := range items {
		dtoItems = append(dtoItems, dto.ExpenseItem{
			ItemName:     item.ItemName,
			ItemQuantity: item.ItemQuantity,
			TotalPrice:   item.TotalPrice,
		})
	}
	return dtoItems
}

func CreateExpenseInputToExpenseModel(in *dto.Expense) *model.Expense {
	return &model.Expense{
		ExpenseName:    in.ExpenseName,
		ExpenseDetails: in.ExpenseDetails,
		ExpenseItems:   MapExpenseItemsFromDtoToModel(in.ExpenseItems),
		UserId:         in.UserID,
		WalletId:       in.WalletID,
		CategoryId:     uint(in.CategoryID),
		Amount:         in.Amount,
		Status:         constant.StatusPending,
		Date:           in.Date,
	}
}

func ApplyUpdateExpenseInput(existing *model.Expense, in *dto.UpdateExpenseInput) *model.Expense {
	for _, path := range in.UpdateMask {
		switch path {
		case "user_id":
			existing.UserId = in.Expense.UserID
		case "wallet_id":
			existing.WalletId = in.Expense.WalletID
		case "category_id":
			existing.CategoryId = uint(in.Expense.CategoryID)
		case "amount":
			existing.Amount = in.Expense.Amount
		case "date":
			existing.Date = in.Expense.Date
		case "expense_name":
			existing.ExpenseName = in.Expense.ExpenseName
		case "expense_details":
			existing.ExpenseDetails = in.Expense.ExpenseDetails
		case "expense_items":
			existing.ExpenseItems = MapExpenseItemsFromDtoToModel(in.Expense.ExpenseItems)
		}
	}
	return existing
}

func ExpenseModelToDTO(expense *model.Expense) *dto.Expense {
	if expense == nil {
		return nil
	}
	return &dto.Expense{
		ID:             expense.Id,
		UserID:         expense.UserId,
		WalletID:       expense.WalletId,
		CategoryID:     uint64(expense.CategoryId),
		Amount:         expense.Amount,
		Status:         expense.Status,
		CreatedAt:      expense.CreatedAt,
		UpdatedAt:      expense.UpdatedAt,
		Date:           expense.Date,
		ExpenseName:    expense.ExpenseName,
		ExpenseDetails: expense.ExpenseDetails,
		ExpenseItems:   MapExpenseItemsFromModelToDto(expense.ExpenseItems),
	}
}

func ExpenseCategoryModelToDTO(category *model.ExpenseCategory) *dto.ExpenseCategory {
	var userId string
	if category == nil {
		return nil
	}

	if category.UserId == nil {
		userId = ""
	} else {
		userId = *category.UserId
	}

	return &dto.ExpenseCategory{
		ID:          category.ID,
		UserID:      userId,
		Name:        category.Name,
		Description: category.Description,
		CreatedAt:   category.CreatedAt,
		UpdatedAt:   category.UpdatedAt,
	}
}

func CreateExpenseCategoryInputToModel(in *dto.ExpenseCategory) *model.ExpenseCategory {
	return &model.ExpenseCategory{
		UserId:      &in.UserID,
		Name:        in.Name,
		Description: in.Description,
	}
}

func ApplyUpdateExpenseCategoryInput(existing *model.ExpenseCategory, in *dto.UpdateExpenseCategoryInput) *model.ExpenseCategory {
	for _, path := range in.UpdateMask {
		switch path {
		case "name":
			existing.Name = in.ExpenseCategory.Name
		case "description":
			existing.Description = in.ExpenseCategory.Description
		}
	}
	return existing
}
