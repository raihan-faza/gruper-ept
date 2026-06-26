package handler

import (
	"context"
	"strings"

	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase/mapper"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/pb"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
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

func mapUserError(err error) error {
	if err == nil {
		return nil
	}
	if _, ok := status.FromError(err); ok {
		return err
	}
	msg := err.Error()
	switch {
	case strings.Contains(msg, "unauthorized"), strings.Contains(msg, "unauthorized access"):
		return status.Error(codes.PermissionDenied, msg)
	case strings.Contains(msg, "not found"), strings.Contains(msg, "record not found"):
		return status.Error(codes.NotFound, msg)
	case strings.Contains(msg, "23505") || strings.Contains(msg, "duplicate key") || strings.Contains(msg, "unique constraint"):
		return status.Error(codes.AlreadyExists, "username already exists")
	default:
		return status.Error(codes.Internal, msg)
	}
}

func (s *UserHandler) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.CreateUserResponse, error) {
	input := mapper.ToCreateUserInput(req)
	res, err := s.userUsecase.CreateUser(ctx, input)
	if err != nil {
		return nil, mapUserError(err)
	}
	return res, nil
}

func (s *UserHandler) UpdateUser(ctx context.Context, req *pb.UpdateUserRequest) (*pb.UpdateUserResponse, error) {
	input := mapper.ToUpdateUserInput(req)
	res, err := s.userUsecase.UpdateUser(ctx, input)
	if err != nil {
		return nil, mapUserError(err)
	}
	return res, nil
}

func (s *UserHandler) DeleteUser(ctx context.Context, req *pb.DeleteUserRequest) (*pb.DeleteUserResponse, error) {
	input := mapper.ToDeleteUserInput(req)
	res, err := s.userUsecase.DeleteUser(ctx, input)
	if err != nil {
		return nil, mapUserError(err)
	}
	return res, nil
}

func (s *UserHandler) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.GetUserResponse, error) {
	res, err := s.userUsecase.GetUser(ctx, req.UserId)
	if err != nil {
		return nil, mapUserError(err)
	}
	return res, nil
}
