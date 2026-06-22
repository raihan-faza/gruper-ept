package handler_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"google.golang.org/protobuf/types/known/fieldmaskpb"

	handler "github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/handler/grpc"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/pb"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/tests/mocks"
)

// =============================================================================
// CreateUser
// =============================================================================

func TestHandler_CreateUser(t *testing.T) {
	tests := map[string]struct {
		req       *pb.CreateUserRequest
		mockSetup func(mock *mocks.MockUserUsecase)
		wantErr   bool
	}{
		"success": {
			req: &pb.CreateUserRequest{
				Id:          "user-uuid-123",
				Username:    "john_doe",
				FirstName:   "John",
				LastName:    "Doe",
				PhoneNumber: func() *string { s := "+6281234567890"; return &s }(),
			},
			mockSetup: func(mock *mocks.MockUserUsecase) {
				mock.EXPECT().
					CreateUser(gomock.Any(), gomock.Any()).
					Return(&pb.CreateUserResponse{}, nil).
					Times(1)
			},
			wantErr: false,
		},
		"usecase error": {
			req: &pb.CreateUserRequest{
				Id:       "user-uuid-123",
				Username: "john_doe",
			},
			mockSetup: func(mock *mocks.MockUserUsecase) {
				mock.EXPECT().
					CreateUser(gomock.Any(), gomock.Any()).
					Return(nil, errors.New("usecase: failed to hash password")).
					Times(1)
			},
			wantErr: true,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockUC := mocks.NewMockUserUsecase(ctrl)
			tc.mockSetup(mockUC)

			h := handler.NewUserHandler(mockUC)
			resp, err := h.CreateUser(context.Background(), tc.req)

			if tc.wantErr {
				assert.Error(t, err)
				assert.Nil(t, resp)
			} else {
				require.NoError(t, err)
				assert.NotNil(t, resp)
			}
		})
	}
}

// =============================================================================
// UpdateUser
// =============================================================================

func TestHandler_UpdateUser(t *testing.T) {
	tests := map[string]struct {
		req       *pb.UpdateUserRequest
		mockSetup func(mock *mocks.MockUserUsecase)
		wantErr   bool
		wantTrue  bool
	}{
		"success – with field mask": {
			req: &pb.UpdateUserRequest{
				UserId:     "user-uuid-001",
				Username:   "new_username",
				UpdateMask: &fieldmaskpb.FieldMask{Paths: []string{"username"}},
			},
			mockSetup: func(mock *mocks.MockUserUsecase) {
				mock.EXPECT().
					UpdateUser(gomock.Any(), gomock.Any()).
					Return(&pb.UpdateUserResponse{Success: true}, nil).
					Times(1)
			},
			wantErr:  false,
			wantTrue: true,
		},
		"success – no mask (all fields forwarded)": {
			req: &pb.UpdateUserRequest{
				UserId:    "user-uuid-002",
				Username:  "full_update",
				FirstName: "New",
				LastName:  "Name",
			},
			mockSetup: func(mock *mocks.MockUserUsecase) {
				mock.EXPECT().
					UpdateUser(gomock.Any(), gomock.Any()).
					Return(&pb.UpdateUserResponse{Success: true}, nil).
					Times(1)
			},
			wantErr:  false,
			wantTrue: true,
		},
		"usecase error": {
			req: &pb.UpdateUserRequest{
				UserId:   "nonexistent",
				Username: "someone",
			},
			mockSetup: func(mock *mocks.MockUserUsecase) {
				mock.EXPECT().
					UpdateUser(gomock.Any(), gomock.Any()).
					Return(nil, errors.New("record not found")).
					Times(1)
			},
			wantErr: true,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockUC := mocks.NewMockUserUsecase(ctrl)
			tc.mockSetup(mockUC)

			h := handler.NewUserHandler(mockUC)
			resp, err := h.UpdateUser(context.Background(), tc.req)

			if tc.wantErr {
				assert.Error(t, err)
				assert.Nil(t, resp)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.wantTrue, resp.Success)
			}
		})
	}
}

// =============================================================================
// DeleteUser
// =============================================================================

func TestHandler_DeleteUser(t *testing.T) {
	tests := map[string]struct {
		req       *pb.DeleteUserRequest
		mockSetup func(mock *mocks.MockUserUsecase)
		wantErr   bool
	}{
		"success": {
			req: &pb.DeleteUserRequest{UserId: "user-uuid-003"},
			mockSetup: func(mock *mocks.MockUserUsecase) {
				mock.EXPECT().
					DeleteUser(gomock.Any(), gomock.Any()).
					Return(&pb.DeleteUserResponse{Success: true}, nil).
					Times(1)
			},
			wantErr: false,
		},
		"usecase error": {
			req: &pb.DeleteUserRequest{UserId: "ghost-user"},
			mockSetup: func(mock *mocks.MockUserUsecase) {
				mock.EXPECT().
					DeleteUser(gomock.Any(), gomock.Any()).
					Return(nil, errors.New("user not found")).
					Times(1)
			},
			wantErr: true,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockUC := mocks.NewMockUserUsecase(ctrl)
			tc.mockSetup(mockUC)

			h := handler.NewUserHandler(mockUC)
			resp, err := h.DeleteUser(context.Background(), tc.req)

			if tc.wantErr {
				assert.Error(t, err)
				assert.Nil(t, resp)
			} else {
				require.NoError(t, err)
				assert.True(t, resp.Success)
			}
		})
	}
}
