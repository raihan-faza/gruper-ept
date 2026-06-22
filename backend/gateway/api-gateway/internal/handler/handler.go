package handler

import (
	"context"

	"github.com/gin-gonic/gin"
	expensepb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/expense_service"
	llmpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/llm_job_service"
	reportpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/report_service"
	userpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/user_service"
	walletpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/wallet_service"
	"google.golang.org/grpc/metadata"
)

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
