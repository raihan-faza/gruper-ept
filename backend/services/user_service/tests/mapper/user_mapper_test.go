package mapper_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/protobuf/types/known/fieldmaskpb"

	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase/mapper"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/pb"
)

// =============================================================================
// ToCreateUserInput
// =============================================================================

func TestToCreateUserInput(t *testing.T) {
	phoneNumber := "+6281234567890"
	tests := map[string]struct {
		req  *pb.CreateUserRequest
		want dto.CreateUserInput
	}{
		"all fields": {
			req: &pb.CreateUserRequest{
				Id:          "user-uuid-123",
				Username:    "john_doe",
				FirstName:   "John",
				LastName:    "Doe",
				PhoneNumber: &phoneNumber,
			},
			want: dto.CreateUserInput{
				ID:          "user-uuid-123",
				Username:    "john_doe",
				FirstName:   "John",
				LastName:    "Doe",
				PhoneNumber: &phoneNumber,
			},
		},
		"empty request": {
			req:  &pb.CreateUserRequest{},
			want: dto.CreateUserInput{},
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			got := mapper.ToCreateUserInput(tc.req)
			assert.Equal(t, tc.want, got)
		})
	}
}

// =============================================================================
// ToUpdateUserInput
// =============================================================================

func TestToUpdateUserInput(t *testing.T) {
	phoneNumber := "+6281234567890"
	tests := map[string]struct {
		req    *pb.UpdateUserRequest
		assert func(t *testing.T, got dto.UpdateUserInput)
	}{
		"no mask – all fields forwarded": {
			req: &pb.UpdateUserRequest{
				UserId:      "user-uuid-001",
				Username:    "new_user",
				FirstName:   "New",
				LastName:    "Name",
				PhoneNumber: &phoneNumber,
			},
			assert: func(t *testing.T, got dto.UpdateUserInput) {
				require.NotNil(t, got.Username)
				assert.Equal(t, "new_user", *got.Username)
				require.NotNil(t, got.FirstName)
				assert.Equal(t, "New", *got.FirstName)
				require.NotNil(t, got.LastName)
				assert.Equal(t, "Name", *got.LastName)
				require.NotNil(t, got.PhoneNumber)
				assert.Equal(t, phoneNumber, *got.PhoneNumber)
			},
		},
		"empty mask – all fields forwarded": {
			req: &pb.UpdateUserRequest{
				UserId:     "user-uuid-002",
				Username:   "alice",
				UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{}},
			},
			assert: func(t *testing.T, got dto.UpdateUserInput) {
				require.NotNil(t, got.Username)
				assert.Equal(t, "alice", *got.Username)
			},
		},
		"mask – username only": {
			req: &pb.UpdateUserRequest{
				UserId:     "user-uuid-003",
				Username:   "only_username",
				UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{"username"}},
			},
			assert: func(t *testing.T, got dto.UpdateUserInput) {
				require.NotNil(t, got.Username)
				assert.Equal(t, "only_username", *got.Username)
				assert.Nil(t, got.FirstName)
				assert.Nil(t, got.LastName)
			},
		},
		"mask – first_name and last_name": {
			req: &pb.UpdateUserRequest{
				UserId:     "user-uuid-005",
				Username:   "charlie",
				FirstName:  "Charlie",
				LastName:   "Brown",
				UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{"first_name", "last_name"}},
			},
			assert: func(t *testing.T, got dto.UpdateUserInput) {
				assert.Nil(t, got.Username)
				require.NotNil(t, got.FirstName)
				assert.Equal(t, "Charlie", *got.FirstName)
				require.NotNil(t, got.LastName)
				assert.Equal(t, "Brown", *got.LastName)
			},
		},
		"mask – phone_number only": {
			req: &pb.UpdateUserRequest{
				UserId:      "user-uuid-007",
				PhoneNumber: &phoneNumber,
				UpdateMask:  &fieldmaskpb.FieldMask{Paths: []string{"phone_number"}},
			},
			assert: func(t *testing.T, got dto.UpdateUserInput) {
				require.NotNil(t, got.PhoneNumber)
				assert.Equal(t, phoneNumber, *got.PhoneNumber)
				assert.Nil(t, got.Username)
			},
		},
		"mask – update_mask path is silently ignored": {
			req: &pb.UpdateUserRequest{
				UserId:     "user-uuid-008",
				Username:   "diana",
				UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{"update_mask", "username"}},
			},
			assert: func(t *testing.T, got dto.UpdateUserInput) {
				require.NotNil(t, got.Username)
				assert.Equal(t, "diana", *got.Username)
			},
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			got := mapper.ToUpdateUserInput(tc.req)
			tc.assert(t, got)
		})
	}
}

// =============================================================================
// ToDeleteUserInput
// =============================================================================

func TestToDeleteUserInput(t *testing.T) {
	tests := map[string]struct {
		req    *pb.DeleteUserRequest
		wantID string
	}{
		"maps user id": {
			req:    &pb.DeleteUserRequest{UserId: "user-uuid-009"},
			wantID: "user-uuid-009",
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			got := mapper.ToDeleteUserInput(tc.req)
			assert.Equal(t, tc.wantID, got.UserID)
		})
	}
}

// =============================================================================
// ToCreateUserModel
// =============================================================================

func TestToCreateUserModel(t *testing.T) {
	phoneNumber := "+628111111111"
	tests := map[string]struct {
		input  *dto.CreateUserInput
		assert func(t *testing.T, input *dto.CreateUserInput)
	}{
		"all fields are copied": {
			input: &dto.CreateUserInput{
				ID:          "user-uuid-123",
				Username:    "eve",
				FirstName:   "Eve",
				LastName:    "Online",
				PhoneNumber: &phoneNumber,
			},
			assert: func(t *testing.T, input *dto.CreateUserInput) {
				got := mapper.ToCreateUserModel(input)
				assert.Equal(t, input.ID, got.ID)
				assert.Equal(t, input.Username, got.Username)
				assert.Equal(t, input.FirstName, got.FirstName)
				assert.Equal(t, input.LastName, got.LastName)
				assert.Equal(t, input.PhoneNumber, got.PhoneNumber)
			},
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			tc.assert(t, tc.input)
		})
	}
}
