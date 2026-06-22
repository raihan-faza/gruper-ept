package usecase

import (
	"context"
	"errors"

	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase/mapper"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/pb"
	"google.golang.org/grpc/metadata"
)

type UserUsecase interface {
	CreateUser(ctx context.Context, input dto.CreateUserInput) (*pb.CreateUserResponse, error)
	UpdateUser(ctx context.Context, input dto.UpdateUserInput) (*pb.UpdateUserResponse, error)
	DeleteUser(ctx context.Context, input dto.DeleteUserInput) (*pb.DeleteUserResponse, error)
	GetUser(ctx context.Context, userId string) (*pb.GetUserResponse, error)
}

type userUsecase struct {
	userRepo repository.UserRepository
}

func NewUserUsecase(userRepo repository.UserRepository) UserUsecase {
	return &userUsecase{
		userRepo: userRepo,
	}
}

func (u *userUsecase) CreateUser(ctx context.Context, input dto.CreateUserInput) (*pb.CreateUserResponse, error) {
	newUser := mapper.ToCreateUserModel(&input)
	createUserErr := u.userRepo.Save(ctx, &newUser)
	if createUserErr != nil {
		return nil, createUserErr
	}
	return &pb.CreateUserResponse{
		Success: true,
		User:    mapper.ToUserPb(&newUser),
	}, nil
}

func (u *userUsecase) UpdateUser(ctx context.Context, input dto.UpdateUserInput) (*pb.UpdateUserResponse, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, errors.New("UserService.usecase.UpdateUser(): failed to get metadata from context")
	}

	userId := md.Get("user_id")[0]
	if userId != input.UserID {
		return nil, errors.New("UserService.usecase.UpdateUser(): unauthorized access")
	}

	user, err := u.userRepo.GetUserById(ctx, input.UserID)
	if err != nil {
		return nil, err
	}
	if input.Username != nil {
		user.Username = *input.Username
	}
	if input.FirstName != nil {
		user.FirstName = *input.FirstName
	}
	if input.LastName != nil {
		user.LastName = *input.LastName
	}
	if input.PhoneNumber != nil {
		user.PhoneNumber = input.PhoneNumber
	}
	updateErr := u.userRepo.Save(ctx, user)
	if updateErr != nil {
		return nil, updateErr
	}

	return &pb.UpdateUserResponse{
		Success: true,
		User:    mapper.ToUserPb(user),
	}, nil
}

func (u *userUsecase) DeleteUser(ctx context.Context, input dto.DeleteUserInput) (*pb.DeleteUserResponse, error) {
	err := u.userRepo.Delete(ctx, input.UserID)
	if err != nil {
		return nil, err
	}
	return &pb.DeleteUserResponse{
		Success: true,
	}, nil
}

func (u *userUsecase) GetUser(ctx context.Context, userId string) (*pb.GetUserResponse, error) {
	user, err := u.userRepo.GetUserById(ctx, userId)
	if err != nil {
		return nil, err
	}
	return &pb.GetUserResponse{
		Success: true,
		User:    mapper.ToUserPb(user),
	}, nil
}
