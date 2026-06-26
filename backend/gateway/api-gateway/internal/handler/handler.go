package handler

import (
	"context"
	"net/http"

	"github.com/gin-gonic/gin"
	expensepb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/expense_service"
	llmpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/llm_job_service"
	reportpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/report_service"
	userpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/user_service"
	walletpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/wallet_service"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func (h *Handler) handleError(c *gin.Context, err error) {
	if err == nil {
		return
	}

	st, ok := status.FromError(err)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var httpStatus int
	switch st.Code() {
	case codes.InvalidArgument:
		httpStatus = http.StatusBadRequest
	case codes.Unauthenticated:
		httpStatus = http.StatusUnauthorized
	case codes.PermissionDenied:
		httpStatus = http.StatusForbidden
	case codes.NotFound:
		httpStatus = http.StatusNotFound
	case codes.AlreadyExists:
		httpStatus = http.StatusConflict
	case codes.ResourceExhausted:
		httpStatus = http.StatusTooManyRequests
	case codes.FailedPrecondition:
		httpStatus = http.StatusBadRequest
	case codes.Aborted:
		httpStatus = http.StatusConflict
	case codes.OutOfRange:
		httpStatus = http.StatusBadRequest
	case codes.Unimplemented:
		httpStatus = http.StatusNotImplemented
	case codes.Internal:
		httpStatus = http.StatusInternalServerError
	case codes.Unavailable:
		httpStatus = http.StatusServiceUnavailable
	case codes.DeadlineExceeded:
		httpStatus = http.StatusGatewayTimeout
	default:
		httpStatus = http.StatusInternalServerError
	}

	c.JSON(httpStatus, gin.H{"error": st.Message()})
}

type Handler struct {
	walletService  walletpb.WalletServiceClient
	expenseService expensepb.ExpenseServiceClient
	userService    userpb.UserServiceClient
	llmJobService  llmpb.LLMServiceClient
	reportService  reportpb.ReportServiceClient
}

func NewHandler(walletService walletpb.WalletServiceClient, expenseService expensepb.ExpenseServiceClient, userService userpb.UserServiceClient, llmJobService llmpb.LLMServiceClient, reportService reportpb.ReportServiceClient) *Handler {
	return &Handler{
		walletService:  walletService,
		expenseService: expenseService,
		userService:    userService,
		llmJobService:  llmJobService,
		reportService:  reportService,
	}
}

func (h *Handler) getContext(c *gin.Context) context.Context {
	ctx := c.Request.Context()
	mdMap := make(map[string]string)

	if userID, exists := c.Get("user_id"); exists {
		if idStr, ok := userID.(string); ok {
			mdMap["user_id"] = idStr
		}
	}

	authHeader := c.GetHeader("Authorization")
	if authHeader != "" {
		mdMap["authorization"] = authHeader
	}

	if len(mdMap) > 0 {
		md := metadata.New(mdMap)
		return metadata.NewOutgoingContext(ctx, md)
	}

	return ctx
}
