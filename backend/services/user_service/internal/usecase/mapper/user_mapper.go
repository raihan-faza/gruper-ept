package mapper

import (
	"github.com/google/uuid"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/pb"
)

func ToCreateUserInput(req *pb.CreateUserRequest) dto.CreateUserInput {
	return dto.CreateUserInput{
		Username:    req.Username,
		Password:    req.Password,
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		Email:       req.Email,
		PhoneNumber: req.PhoneNumber,
	}
}

func ToUpdateUserInput(req *pb.UpdateUserRequest) dto.UpdateUserInput {
	input := dto.UpdateUserInput{
		UserID: req.UserId,
	}

	if req.UpdateMask == nil || len(req.UpdateMask.Paths) == 0 {
		input.Username = &req.Username
		input.Password = &req.Password
		input.FirstName = &req.FirstName
		input.LastName = &req.LastName
		input.Email = &req.Email
		input.PhoneNumber = &req.PhoneNumber
		return input
	}

	for _, path := range req.UpdateMask.Paths {
		switch path {
		case "username":
			input.Username = &req.Username
		case "password":
			input.Password = &req.Password
		case "first_name":
			input.FirstName = &req.FirstName
		case "last_name":
			input.LastName = &req.LastName
		case "email":
			input.Email = &req.Email
		case "phone_number":
			input.PhoneNumber = &req.PhoneNumber
		case "update_mask":
			// ini di skip katanya sih gitu, source (trust me)
		}
	}

	return input
}

func ToDeleteUserInput(req *pb.DeleteUserRequest) dto.DeleteUserInput {
	return dto.DeleteUserInput{
		UserID: req.UserId,
	}
}

func ToCreateUserModel(input *dto.CreateUserInput) model.User {
	return model.User{
		ID:          uuid.NewString(),
		Username:    input.Username,
		Password:    input.Password,
		FirstName:   input.FirstName,
		LastName:    input.LastName,
		Email:       input.Email,
		PhoneNumber: input.PhoneNumber,
	}
}
