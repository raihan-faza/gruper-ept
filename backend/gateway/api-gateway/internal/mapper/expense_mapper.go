package mapper

import (
	"time"

	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/dto"
	expensepb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/expense_service"
	"google.golang.org/protobuf/types/known/fieldmaskpb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// ToExpenseItemPB maps DTO to pb.ExpenseItem
func ToExpenseItemPB(d dto.ExpenseItemDTO) *expensepb.ExpenseItem {
	return &expensepb.ExpenseItem{
		ItemName:     d.ItemName,
		ItemQuantity: d.ItemQuantity,
		TotalPrice:   d.TotalPrice,
	}
}

// ToExpenseItemDTO maps pb.ExpenseItem to DTO
func ToExpenseItemDTO(p *expensepb.ExpenseItem) dto.ExpenseItemDTO {
	if p == nil {
		return dto.ExpenseItemDTO{}
	}
	return dto.ExpenseItemDTO{
		ItemName:     p.ItemName,
		ItemQuantity: p.ItemQuantity,
		TotalPrice:   p.TotalPrice,
	}
}

// ToExpensePB maps DTO to pb.Expense
func ToExpensePB(d dto.ExpenseDTO) *expensepb.Expense {
	var createdAt *timestamppb.Timestamp
	if !d.CreatedAt.IsZero() {
		createdAt = timestamppb.New(d.CreatedAt)
	}
	var updatedAt *timestamppb.Timestamp
	if !d.UpdatedAt.IsZero() {
		updatedAt = timestamppb.New(d.UpdatedAt)
	}

	items := make([]*expensepb.ExpenseItem, len(d.ExpenseItems))
	for i, item := range d.ExpenseItems {
		items[i] = ToExpenseItemPB(item)
	}

	return &expensepb.Expense{
		Id:             d.ID,
		UserId:         d.UserID,
		WalletId:       d.WalletID,
		CategoryId:     d.CategoryID,
		ExpenseName:    d.ExpenseName,
		ExpenseDetails: d.ExpenseDetails,
		ExpenseItems:   items,
		Amount:         d.Amount,
		Status:         d.Status,
		Date:           d.Date,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	}
}

// ToExpenseDTO maps pb.Expense to DTO
func ToExpenseDTO(p *expensepb.Expense) dto.ExpenseDTO {
	if p == nil {
		return dto.ExpenseDTO{}
	}
	var createdAt time.Time
	if p.CreatedAt != nil {
		createdAt = p.CreatedAt.AsTime()
	}
	var updatedAt time.Time
	if p.UpdatedAt != nil {
		updatedAt = p.UpdatedAt.AsTime()
	}

	items := make([]dto.ExpenseItemDTO, len(p.ExpenseItems))
	for i, item := range p.ExpenseItems {
		items[i] = ToExpenseItemDTO(item)
	}

	return dto.ExpenseDTO{
		ID:             p.Id,
		UserID:         p.UserId,
		WalletID:       p.WalletId,
		CategoryID:     p.CategoryId,
		ExpenseName:    p.ExpenseName,
		ExpenseDetails: p.ExpenseDetails,
		ExpenseItems:   items,
		Amount:         p.Amount,
		Status:         p.Status,
		Date:           p.Date,
		CreatedAt:      createdAt,
		UpdatedAt:      updatedAt,
	}
}

// ToExpenseCategoryPB maps DTO to pb.ExpenseCategory
func ToExpenseCategoryPB(d dto.ExpenseCategoryDTO) *expensepb.ExpenseCategory {
	var createdAt *timestamppb.Timestamp
	if !d.CreatedAt.IsZero() {
		createdAt = timestamppb.New(d.CreatedAt)
	}
	var updatedAt *timestamppb.Timestamp
	if !d.UpdatedAt.IsZero() {
		updatedAt = timestamppb.New(d.UpdatedAt)
	}

	return &expensepb.ExpenseCategory{
		Id:          d.ID,
		UserId:      d.UserID,
		Name:        d.Name,
		Description: d.Description,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
	}
}

// ToExpenseCategoryDTO maps pb.ExpenseCategory to DTO
func ToExpenseCategoryDTO(p *expensepb.ExpenseCategory) dto.ExpenseCategoryDTO {
	if p == nil {
		return dto.ExpenseCategoryDTO{}
	}
	var createdAt time.Time
	if p.CreatedAt != nil {
		createdAt = p.CreatedAt.AsTime()
	}
	var updatedAt time.Time
	if p.UpdatedAt != nil {
		updatedAt = p.UpdatedAt.AsTime()
	}

	return dto.ExpenseCategoryDTO{
		ID:          p.Id,
		UserID:      p.UserId,
		Name:        p.Name,
		Description: p.Description,
		CreatedAt:   createdAt,
		UpdatedAt:   updatedAt,
	}
}

// ToCreateExpenseRequest maps Input DTO to pb.CreateExpenseRequest
func ToCreateExpenseRequest(input dto.CreateExpenseInput, userID string) *expensepb.CreateExpenseRequest {
	items := make([]*expensepb.ExpenseItem, len(input.ExpenseItems))
	for i, item := range input.ExpenseItems {
		items[i] = ToExpenseItemPB(item)
	}

	return &expensepb.CreateExpenseRequest{
		Expense: &expensepb.Expense{
			UserId:         userID,
			WalletId:       input.WalletID,
			CategoryId:     input.CategoryID,
			ExpenseName:    input.ExpenseName,
			ExpenseDetails: input.ExpenseDetails,
			ExpenseItems:   items,
			Amount:         input.Amount,
			Date:           input.Date,
			IdempotencyKey: input.IdempotencyKey,
		},
	}
}

// ToUpdateExpenseRequest maps Input DTO and ID to pb.UpdateExpenseRequest
func ToUpdateExpenseRequest(expenseID string, userID string, input dto.UpdateExpenseInput) *expensepb.UpdateExpenseRequest {
	var items []*expensepb.ExpenseItem
	var paths []string

	expense := &expensepb.Expense{
		Id:     expenseID,
		UserId: userID,
	}

	if input.WalletID != "" {
		expense.WalletId = input.WalletID
		paths = append(paths, "wallet_id")
	}
	if input.CategoryID != 0 {
		expense.CategoryId = input.CategoryID
		paths = append(paths, "category_id")
	}
	if input.ExpenseName != "" {
		expense.ExpenseName = input.ExpenseName
		paths = append(paths, "expense_name")
	}
	if input.ExpenseDetails != "" {
		expense.ExpenseDetails = input.ExpenseDetails
		paths = append(paths, "expense_details")
	}
	if len(input.ExpenseItems) > 0 {
		items = make([]*expensepb.ExpenseItem, len(input.ExpenseItems))
		for i, item := range input.ExpenseItems {
			items[i] = ToExpenseItemPB(item)
		}
		expense.ExpenseItems = items
		paths = append(paths, "expense_items")
	}
	if input.Amount != 0 {
		expense.Amount = input.Amount
		paths = append(paths, "amount")
	}
	if input.Status != "" {
		expense.Status = input.Status
		paths = append(paths, "status")
	}
	if input.Date != "" {
		expense.Date = input.Date
		paths = append(paths, "date")
	}

	mask, _ := fieldmaskpb.New(expense, paths...)

	return &expensepb.UpdateExpenseRequest{
		Expense:    expense,
		UpdateMask: mask,
	}
}

// ToCreateExpenseCategoryRequest maps Input DTO to pb.CreateExpenseCategoryRequest
func ToCreateExpenseCategoryRequest(input dto.CreateExpenseCategoryInput, userID string) *expensepb.CreateExpenseCategoryRequest {
	return &expensepb.CreateExpenseCategoryRequest{
		ExpenseCategory: &expensepb.ExpenseCategory{
			UserId:      userID,
			Name:        input.Name,
			Description: input.Description,
		},
	}
}

// ToUpdateExpenseCategoryRequest maps Input DTO and ID to pb.UpdateExpenseCategoryRequest
func ToUpdateExpenseCategoryRequest(categoryID uint64, userID string, input dto.UpdateExpenseCategoryInput) *expensepb.UpdateExpenseCategoryRequest {
	var paths []string

	cat := &expensepb.ExpenseCategory{
		Id:     categoryID,
		UserId: userID,
	}

	if input.Name != "" {
		cat.Name = input.Name
		paths = append(paths, "name")
	}
	if input.Description != "" {
		cat.Description = input.Description
		paths = append(paths, "description")
	}

	mask, _ := fieldmaskpb.New(cat, paths...)

	return &expensepb.UpdateExpenseCategoryRequest{
		ExpenseCategory: cat,
		UpdateMask:      mask,
	}
}
