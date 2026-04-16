package usecase

import (
	"context"

	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase/mapper"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/pb"
	"golang.org/x/crypto/bcrypt"
)

type UserUsecase interface {
	CreateUser(ctx context.Context, input dto.CreateUserInput) (*pb.CreateUserResponse, error)
	UpdateUser(ctx context.Context, input dto.UpdateUserInput) (*pb.UpdateUserResponse, error)
	DeleteUser(ctx context.Context, input dto.DeleteUserInput) (*pb.DeleteUserResponse, error)
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
	hash, err := bcrypt.GenerateFromPassword([]byte(newUser.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	newUser.Password = string(hash)
	createUserErr := u.userRepo.Save(ctx, &newUser)
	if createUserErr != nil {
		return nil, err
	}
	return &pb.CreateUserResponse{}, nil
}

func (u *userUsecase) UpdateUser(ctx context.Context, input dto.UpdateUserInput) (*pb.UpdateUserResponse, error) {
	user, err := u.userRepo.GetUserById(ctx, input.UserID)
	if err != nil {
		return nil, err
	}
	if input.Username != nil {
		user.Username = *input.Username
	}
	if input.Password != nil {
		user.Password = *input.Password
	}
	if input.FirstName != nil {
		user.FirstName = *input.FirstName
	}
	if input.LastName != nil {
		user.LastName = *input.LastName
	}
	if input.Email != nil {
		user.Email = *input.Email
	}
	updateErr := u.userRepo.Save(ctx, user)
	if updateErr != nil {
		return nil, updateErr
	}

	return &pb.UpdateUserResponse{
		Success: true,
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
