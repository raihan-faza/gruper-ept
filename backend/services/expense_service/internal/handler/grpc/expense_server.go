package grpc

import (
	"context"

	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/usecase/mapper"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/pb"
)

type ExpenseServer struct {
	pb.UnimplementedExpenseServiceServer
	expenseUsecase usecase.ExpenseUsecase
}

func NewExpenseServer(expenseUsecase usecase.ExpenseUsecase) *ExpenseServer {
	return &ExpenseServer{expenseUsecase: expenseUsecase}
}

func (s *ExpenseServer) CreateExpense(ctx context.Context, req *pb.CreateExpenseRequest) (*pb.CreateExpenseResponse, error) {
	input := mapper.ToCreateExpenseInput(req)
	output, err := s.expenseUsecase.CreateExpense(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.ToCreateExpenseResponse(output), nil
}

func (s *ExpenseServer) UpdateExpense(ctx context.Context, req *pb.UpdateExpenseRequest) (*pb.UpdateExpenseResponse, error) {
	input := mapper.ToUpdateExpenseInput(req)
	output, err := s.expenseUsecase.UpdateExpense(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.ToUpdateExpenseResponse(output), nil
}

func (s *ExpenseServer) DeleteExpense(ctx context.Context, req *pb.DeleteExpenseRequest) (*pb.DeleteExpenseResponse, error) {
	input := mapper.ToDeleteExpenseInput(req)
	output, err := s.expenseUsecase.DeleteExpense(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.ToDeleteExpenseResponse(output), nil
}

func (s *ExpenseServer) CreateExpenseUsingLLM(ctx context.Context, req *pb.CreateExpenseRequest) (*pb.CreateUsingLLMResponse, error) {
	input := mapper.ToCreateExpenseInput(req)
	output, err := s.expenseUsecase.CreateExpenseUsingLLM(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.ToCreateUsingLLMResponse(output), nil
}

func (s *ExpenseServer) CreateExpenseCategory(ctx context.Context, req *pb.CreateExpenseCategoryRequest) (*pb.CreateExpenseCategoryResponse, error) {
	input := mapper.ToCreateExpenseCategoryInput(req)
	output, err := s.expenseUsecase.CreateExpenseCategory(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.ToCreateExpenseCategoryResponse(output), nil
}

func (s *ExpenseServer) UpdateExpenseCategory(ctx context.Context, req *pb.UpdateExpenseCategoryRequest) (*pb.UpdateExpenseCategoryResponse, error) {
	input := mapper.ToUpdateExpenseCategoryInput(req)
	output, err := s.expenseUsecase.UpdateExpenseCategory(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.ToUpdateExpenseCategoryResponse(output), nil
}

func (s *ExpenseServer) DeleteExpenseCategory(ctx context.Context, req *pb.DeleteExpenseCategoryRequest) (*pb.DeleteExpenseCategoryResponse, error) {
	input := mapper.ToDeleteExpenseCategoryInput(req)
	output, err := s.expenseUsecase.DeleteExpenseCategory(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.ToDeleteExpenseCategoryResponse(output), nil
}

func (s *ExpenseServer) GetAllExpenses(ctx context.Context, req *pb.GetAllExpensesRequest) (*pb.GetAllExpensesResponse, error) {
	input := mapper.ToGetAllExpensesInput(req)
	output, err := s.expenseUsecase.GetAllExpenses(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.ToGetAllExpensesResponse(output), nil
}

func (s *ExpenseServer) GetAllExpensesCategory(ctx context.Context, req *pb.GetAllExpensesCategoryRequest) (*pb.GetAllExpensesCategoryResponse, error) {
	input := mapper.ToGetAllExpensesCategoryInput(req)
	output, err := s.expenseUsecase.GetAllExpensesCategory(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.ToGetAllExpensesCategoryResponse(output), nil
}
