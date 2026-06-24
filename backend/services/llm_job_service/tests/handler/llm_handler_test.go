package handler_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"

	handler "github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/handler/grpc"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/pb"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/tests/mocks"
)

// ─── JWT helpers ─────────────────────────────────────────────────────────────

const testJWTSecret = "test-jwt-secret"
const testAccessKey = "test-access-key"
const testUserID = "user-uuid-001"

func init() {
	os.Setenv("JWT_SECRET_KEY", testJWTSecret)
	os.Setenv("ACCESS_KEY", testAccessKey)
}

// makeJWT signs a JWT token whose Subject claim is set to userId.
func makeJWT(userId string) string {
	claims := jwt.RegisteredClaims{
		Subject:   userId,
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(testJWTSecret))
	if err != nil {
		panic("makeJWT: " + err.Error())
	}
	return signed
}

// ctxWithMeta builds an incoming gRPC context carrying the given metadata pairs.
func ctxWithMeta(pairs ...string) context.Context {
	md := metadata.Pairs(pairs...)

	accessKeys := md.Get("access_key")
	var accessKey string
	if len(accessKeys) > 0 {
		accessKey = accessKeys[0]
	}

	auths := md.Get("authorization")
	var auth string
	if len(auths) > 0 {
		auth = auths[0]
	}

	if accessKey == testAccessKey && len(auth) > 7 && auth[:7] == "Bearer " {
		tokenStr := auth[7:]
		token, err := jwt.ParseWithClaims(tokenStr, &jwt.RegisteredClaims{}, func(token *jwt.Token) (interface{}, error) {
			return []byte(testJWTSecret), nil
		})
		if err == nil && token.Valid {
			if claims, ok := token.Claims.(*jwt.RegisteredClaims); ok {
				md.Set("user_id", claims.Subject)
			}
		}
	}

	return metadata.NewIncomingContext(context.Background(), md)
}

// baseRequest is a valid ExtractExpenseRequest for the matching testUserID.
func baseRequest(overrides ...func(*pb.ExtractExpenseRequest)) *pb.ExtractExpenseRequest {
	req := &pb.ExtractExpenseRequest{
		UserId:    testUserID,
		WalletId:  "wallet-uuid-001",
		UserInput: "Bayar makan siang 50 ribu",
	}
	for _, o := range overrides {
		o(req)
	}
	return req
}

// =============================================================================
// TestLLMHandler_ExtractExpense
// =============================================================================

func TestLLMHandler_ExtractExpense(t *testing.T) {
	validToken := makeJWT(testUserID)

	tests := map[string]struct {
		mockSetup   func(mock *mocks.MockLLMUsecase)
		ctx         context.Context
		req         *pb.ExtractExpenseRequest
		wantErr     bool
		wantCode    codes.Code
	}{
		"success – valid token and matching userId": {
			mockSetup: func(mock *mocks.MockLLMUsecase) {
				mock.EXPECT().
					ExtractExpense(gomock.Any(), gomock.Any()).
					Return(nil).
					Times(1)
			},
			ctx:      ctxWithMeta("access_key", testAccessKey, "authorization", "Bearer "+validToken),
			req:      baseRequest(),
			wantErr:  false,
		},
		"unauthenticated – missing metadata entirely": {
			mockSetup: func(mock *mocks.MockLLMUsecase) {
				// usecase must NOT be called
				mock.EXPECT().ExtractExpense(gomock.Any(), gomock.Any()).Times(0)
			},
			ctx:      context.Background(), // no incoming metadata
			req:      baseRequest(),
			wantErr:  true,
			wantCode: codes.Unauthenticated,
		},
		"unauthenticated – access_key missing": {
			mockSetup: func(mock *mocks.MockLLMUsecase) {
				mock.EXPECT().ExtractExpense(gomock.Any(), gomock.Any()).Times(0)
			},
			ctx:      ctxWithMeta("authorization", "Bearer "+validToken), // no access_key
			req:      baseRequest(),
			wantErr:  true,
			wantCode: codes.Unauthenticated,
		},
		"unauthenticated – access_key is wrong": {
			mockSetup: func(mock *mocks.MockLLMUsecase) {
				mock.EXPECT().ExtractExpense(gomock.Any(), gomock.Any()).Times(0)
			},
			ctx:      ctxWithMeta("access_key", "wrong-key", "authorization", "Bearer "+validToken),
			req:      baseRequest(),
			wantErr:  true,
			wantCode: codes.Unauthenticated,
		},
		"unauthenticated – authorization header missing": {
			mockSetup: func(mock *mocks.MockLLMUsecase) {
				mock.EXPECT().ExtractExpense(gomock.Any(), gomock.Any()).Times(0)
			},
			ctx:      ctxWithMeta("access_key", testAccessKey), // no authorization
			req:      baseRequest(),
			wantErr:  true,
			wantCode: codes.Unauthenticated,
		},
		"unauthenticated – Bearer prefix missing": {
			mockSetup: func(mock *mocks.MockLLMUsecase) {
				mock.EXPECT().ExtractExpense(gomock.Any(), gomock.Any()).Times(0)
			},
			ctx:      ctxWithMeta("access_key", testAccessKey, "authorization", validToken), // no "Bearer "
			req:      baseRequest(),
			wantErr:  true,
			wantCode: codes.Unauthenticated,
		},
		"unauthenticated – JWT is invalid / malformed": {
			mockSetup: func(mock *mocks.MockLLMUsecase) {
				mock.EXPECT().ExtractExpense(gomock.Any(), gomock.Any()).Times(0)
			},
			ctx:      ctxWithMeta("access_key", testAccessKey, "authorization", "Bearer not.a.jwt"),
			req:      baseRequest(),
			wantErr:  true,
			wantCode: codes.Unauthenticated,
		},
		"permission denied – userId in JWT does not match request.UserId": {
			mockSetup: func(mock *mocks.MockLLMUsecase) {
				mock.EXPECT().ExtractExpense(gomock.Any(), gomock.Any()).Times(0)
			},
			ctx: ctxWithMeta(
				"access_key", testAccessKey,
				"authorization", "Bearer "+makeJWT("different-user"),
			),
			req:      baseRequest(), // UserId is testUserID, JWT is for "different-user"
			wantErr:  true,
			wantCode: codes.PermissionDenied,
		},
		"internal error – usecase returns error": {
			mockSetup: func(mock *mocks.MockLLMUsecase) {
				mock.EXPECT().
					ExtractExpense(gomock.Any(), gomock.Any()).
					Return(assert.AnError).
					Times(1)
			},
			ctx:      ctxWithMeta("access_key", testAccessKey, "authorization", "Bearer "+validToken),
			req:      baseRequest(),
			wantErr:  true,
			wantCode: codes.Unknown, // raw error is forwarded as-is
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockUC := mocks.NewMockLLMUsecase(ctrl)
			tc.mockSetup(mockUC)

			h := handler.NewLLMHandler(mockUC)
			resp, err := h.ExtractExpense(tc.ctx, tc.req)

			if tc.wantErr {
				require.Error(t, err)
				assert.Nil(t, resp)
				if tc.wantCode != codes.Unknown || status.Code(err) != codes.OK {
					st, ok := status.FromError(err)
					if ok {
						assert.Equal(t, tc.wantCode, st.Code())
					}
				}
			} else {
				require.NoError(t, err)
				assert.NotNil(t, resp)
			}
		})
	}
}
