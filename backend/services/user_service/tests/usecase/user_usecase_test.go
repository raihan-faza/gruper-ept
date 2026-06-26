package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"

	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/tests/mocks"
	"google.golang.org/grpc/metadata"
)

// =============================================================================
// CreateUser
// =============================================================================

func TestCreateUser(t *testing.T) {
	tests := map[string]struct {
		input     dto.CreateUserInput
		mockSetup func(mock *mocks.MockUserRepository)
		wantErr   bool
	}{
		"success": {
			input: dto.CreateUserInput{
				ID:          "user-uuid-123",
				Username:    "john_doe",
				FirstName:   "John",
				LastName:    "Doe",
				PhoneNumber: func() *string { s := "+6281234567890"; return &s }(),
			},
			mockSetup: func(mock *mocks.MockUserRepository) {
				mock.EXPECT().
					Save(gomock.Any(), gomock.Any()).
					Return(nil).
					Times(1)
			},
			wantErr: false,
		},
		"repository error": {
			input: dto.CreateUserInput{
				ID:       "user-uuid-123",
				Username: "john_doe",
			},
			mockSetup: func(mock *mocks.MockUserRepository) {
				mock.EXPECT().
					Save(gomock.Any(), gomock.Any()).
					Return(errors.New("db: connection refused")).
					Times(1)
			},
			wantErr: true,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mocks.NewMockUserRepository(ctrl)
			tc.mockSetup(mockRepo)

			uc := usecase.NewUserUsecase(mockRepo)
			resp, err := uc.CreateUser(context.Background(), tc.input)

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

func TestUpdateUser(t *testing.T) {
	newUsername  := "new_name"
	newFirstName := "Janet"
	updatedUser  := "alice_updated"

	tests := map[string]struct {
		input     dto.UpdateUserInput
		mockSetup func(mock *mocks.MockUserRepository)
		wantErr   bool
		wantTrue  bool
	}{
		"success – update username": {
			input: dto.UpdateUserInput{
				UserID:   "user-uuid-001",
				Username: &newUsername,
			},
			mockSetup: func(mock *mocks.MockUserRepository) {
				mock.EXPECT().
					GetUserById(gomock.Any(), "user-uuid-001").
					Return(&model.UserProfile{
						ID:        "user-uuid-001",
						Username:  "old_name",
						FirstName: "John",
						LastName:  "Doe",
					}, nil).
					Times(1)
				mock.EXPECT().
					Save(gomock.Any(), gomock.AssignableToTypeOf(&model.UserProfile{})).
					DoAndReturn(func(_ context.Context, u *model.UserProfile) error {
						assert.Equal(t, newUsername, u.Username)
						return nil
					}).
					Times(1)
			},
			wantErr:  false,
			wantTrue: true,
		},
		"success – multiple fields": {
			input: dto.UpdateUserInput{
				UserID:    "user-uuid-002",
				Username:  &newUsername,
				FirstName: &newFirstName,
			},
			mockSetup: func(mock *mocks.MockUserRepository) {
				mock.EXPECT().
					GetUserById(gomock.Any(), "user-uuid-002").
					Return(&model.UserProfile{
						ID:        "user-uuid-002",
						Username:  "old",
						FirstName: "Jane",
						LastName:  "Smith",
					}, nil)
				mock.EXPECT().
					Save(gomock.Any(), gomock.AssignableToTypeOf(&model.UserProfile{})).
					DoAndReturn(func(_ context.Context, u *model.UserProfile) error {
						assert.Equal(t, newUsername, u.Username)
						assert.Equal(t, newFirstName, u.FirstName)
						return nil
					})
			},
			wantErr:  false,
			wantTrue: true,
		},
		"success – no fields changed": {
			input: dto.UpdateUserInput{UserID: "user-uuid-004"},
			mockSetup: func(mock *mocks.MockUserRepository) {
				mock.EXPECT().
					GetUserById(gomock.Any(), "user-uuid-004").
					Return(&model.UserProfile{
						ID:       "user-uuid-004",
						Username: "bob",
					}, nil)
				mock.EXPECT().
					Save(gomock.Any(), gomock.AssignableToTypeOf(&model.UserProfile{})).
					DoAndReturn(func(_ context.Context, u *model.UserProfile) error {
						assert.Equal(t, "bob", u.Username)
						return nil
					})
			},
			wantErr:  false,
			wantTrue: true,
		},
		"user not found": {
			input: dto.UpdateUserInput{UserID: "nonexistent-uuid"},
			mockSetup: func(mock *mocks.MockUserRepository) {
				mock.EXPECT().
					GetUserById(gomock.Any(), "nonexistent-uuid").
					Return(nil, errors.New("record not found")).
					Times(1)
				// Save must NOT be called.
				mock.EXPECT().Save(gomock.Any(), gomock.Any()).Times(0)
			},
			wantErr: true,
		},
		"save error": {
			input: dto.UpdateUserInput{
				UserID:   "user-uuid-003",
				Username: &updatedUser,
			},
			mockSetup: func(mock *mocks.MockUserRepository) {
				mock.EXPECT().
					GetUserById(gomock.Any(), "user-uuid-003").
					Return(&model.UserProfile{ID: "user-uuid-003", Username: "alice"}, nil)
				mock.EXPECT().
					Save(gomock.Any(), gomock.Any()).
					Return(errors.New("db: write error"))
			},
			wantErr: true,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mocks.NewMockUserRepository(ctrl)
			tc.mockSetup(mockRepo)

			uc := usecase.NewUserUsecase(mockRepo)
			ctx := metadata.NewIncomingContext(context.Background(), metadata.Pairs("user_id", tc.input.UserID))
			resp, err := uc.UpdateUser(ctx, tc.input)

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

func TestDeleteUser(t *testing.T) {
	tests := map[string]struct {
		input     dto.DeleteUserInput
		mockSetup func(mock *mocks.MockUserRepository)
		wantErr   bool
	}{
		"success": {
			input: dto.DeleteUserInput{UserID: "user-uuid-005"},
			mockSetup: func(mock *mocks.MockUserRepository) {
				mock.EXPECT().
					Delete(gomock.Any(), "user-uuid-005").
					Return(nil).
					Times(1)
			},
			wantErr: false,
		},
		"user not found": {
			input: dto.DeleteUserInput{UserID: "ghost-user"},
			mockSetup: func(mock *mocks.MockUserRepository) {
				mock.EXPECT().
					Delete(gomock.Any(), "ghost-user").
					Return(errors.New("user not found")).
					Times(1)
			},
			wantErr: true,
		},
		"repository error": {
			input: dto.DeleteUserInput{UserID: "user-uuid-006"},
			mockSetup: func(mock *mocks.MockUserRepository) {
				mock.EXPECT().
					Delete(gomock.Any(), "user-uuid-006").
					Return(errors.New("db: timeout")).
					Times(1)
			},
			wantErr: true,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockRepo := mocks.NewMockUserRepository(ctrl)
			tc.mockSetup(mockRepo)

			uc := usecase.NewUserUsecase(mockRepo)
			resp, err := uc.DeleteUser(context.Background(), tc.input)

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
