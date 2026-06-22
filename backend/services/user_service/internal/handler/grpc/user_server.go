package handler

import (
	"context"

	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase/mapper"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/pb"
)

type UserHandler struct {
	pb.UnimplementedUserServiceServer
	userUsecase usecase.UserUsecase
}

func NewUserHandler(userUsecase usecase.UserUsecase) *UserHandler {
	return &UserHandler{
		userUsecase: userUsecase,
	}
}

func (s *UserHandler) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.CreateUserResponse, error) {
	input := mapper.ToCreateUserInput(req)
	return s.userUsecase.CreateUser(ctx, input)
}

func (s *UserHandler) UpdateUser(ctx context.Context, req *pb.UpdateUserRequest) (*pb.UpdateUserResponse, error) {
	input := mapper.ToUpdateUserInput(req)
	return s.userUsecase.UpdateUser(ctx, input)
}

func (s *UserHandler) DeleteUser(ctx context.Context, req *pb.DeleteUserRequest) (*pb.DeleteUserResponse, error) {
	input := mapper.ToDeleteUserInput(req)
	return s.userUsecase.DeleteUser(ctx, input)
}

func (s *UserHandler) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
	return s.userUsecase.GetUser(ctx, req.UserId)
}
