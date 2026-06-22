package mapper

import (
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/dto"
	userpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/user_service"
	"google.golang.org/protobuf/types/known/fieldmaskpb"
)

// ToUserDTO maps a pb.User to a UserDTO.
func ToUserDTO(p *userpb.UserProfile) dto.UserDTO {
	if p == nil {
		return dto.UserDTO{}
	}
	return dto.UserDTO{
		ID:          p.GetId(),
		Username:    p.GetUsername(),
		FirstName:   p.GetFirstName(),
		LastName:    p.GetLastName(),
		PhoneNumber: p.GetPhoneNumber(),
		CreatedAt:   p.GetCreatedAt().AsTime(),
		UpdatedAt:   p.GetUpdatedAt().AsTime(),
	}
}

// ToCreateUserRequest maps the HTTP input DTO to pb.CreateUserRequest.
func ToCreateUserRequest(input dto.CreateUserInput) *userpb.CreateUserRequest {
	return &userpb.CreateUserRequest{
		Id:          input.Id,
		Username:    input.Username,
		FirstName:   input.FirstName,
		LastName:    input.LastName,
		PhoneNumber: &input.PhoneNumber,
	}
}

// ToUpdateUserRequest maps the HTTP input DTO and userID to pb.UpdateUserRequest,
// building a field mask from only the provided (non-empty) fields.
func ToUpdateUserRequest(userID string, input dto.UpdateUserInput) *userpb.UpdateUserRequest {
	req := &userpb.UpdateUserRequest{
		UserId: userID,
	}

	var paths []string
	if input.Username != "" {
		req.Username = input.Username
		paths = append(paths, "username")
	}
	if input.FirstName != "" {
		req.FirstName = input.FirstName
		paths = append(paths, "first_name")
	}
	if input.LastName != "" {
		req.LastName = input.LastName
		paths = append(paths, "last_name")
	}
	if input.PhoneNumber != "" {
		req.PhoneNumber = &input.PhoneNumber
		paths = append(paths, "phone_number")
	}

	mask, _ := fieldmaskpb.New(req, paths...)
	req.UpdateMask = mask
	return req
}
