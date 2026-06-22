package mapper

import (
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/pb"
	"google.golang.org/protobuf/types/known/timestamppb"
)

func ToCreateUserInput(req *pb.CreateUserRequest) dto.CreateUserInput {
	return dto.CreateUserInput{
		ID:          req.Id,
		Username:    req.Username,
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		PhoneNumber: req.PhoneNumber,
	}
}

func ToUpdateUserInput(req *pb.UpdateUserRequest) dto.UpdateUserInput {
	input := dto.UpdateUserInput{
		UserID: req.UserId,
	}

	if req.UpdateMask == nil || len(req.UpdateMask.Paths) == 0 {
		input.Username = &req.Username
		input.FirstName = &req.FirstName
		input.LastName = &req.LastName
		input.PhoneNumber = req.PhoneNumber
		return input
	}

	for _, path := range req.UpdateMask.Paths {
		switch path {
		case "username":
			input.Username = &req.Username
		case "first_name":
			input.FirstName = &req.FirstName
		case "last_name":
			input.LastName = &req.LastName
		case "phone_number":
			input.PhoneNumber = req.PhoneNumber
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

func ToCreateUserModel(input *dto.CreateUserInput) model.UserProfile {
	return model.UserProfile{
		ID:          input.ID,
		Username:    input.Username,
		FirstName:   input.FirstName,
		LastName:    input.LastName,
		PhoneNumber: input.PhoneNumber,
	}
}

func ToUserPb(user *model.UserProfile) *pb.UserProfile {
	if user == nil {
		return nil
	}
	return &pb.UserProfile{
		Id:          user.ID,
		Username:    user.Username,
		FirstName:   user.FirstName,
		LastName:    user.LastName,
		PhoneNumber: user.PhoneNumber,
		CreatedAt:   timestamppb.New(user.CreatedAt),
		UpdatedAt:   timestamppb.New(user.UpdatedAt),
	}
}

