package handler

import (
	"context"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/mapper"
	llmpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/llm_job_service"
	"google.golang.org/grpc/metadata"
)

func (h *Handler) getLLMContext(c *gin.Context) (context.Context, string, error) {
	userID, err := h.getUserID(c)
	if err != nil {
		return nil, "", err
	}

	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		cookie, err := c.Cookie("better-auth.session_data")
		if err == nil {
			authHeader = "Bearer " + cookie
		}
	}

	accessKey := os.Getenv("ACCESS_KEY")
	if accessKey == "" {
		accessKey = "YES"
	}

	md := metadata.New(map[string]string{
		"user_id":       userID,
		"access_key":    accessKey,
		"authorization": authHeader,
	})
	ctx := metadata.NewOutgoingContext(c.Request.Context(), md)
	return ctx, userID, nil
}

// ExtractExpense handles POST /llm/extract-expense
// It dispatches an async LLM job to extract expense information from free-form user text.
func (h *Handler) ExtractExpense(c *gin.Context) {
	ctx, userID, err := h.getLLMContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var input dto.ExtractExpenseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.llmJobService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "llm job service client is not initialized"})
		return
	}

	if input.IdempotencyKey != "" {
		ctx = metadata.AppendToOutgoingContext(ctx, "idempotency_key", input.IdempotencyKey)
	}

	req := mapper.ToExtractExpenseRequest(userID, input)
	_, err = h.llmJobService.ExtractExpense(ctx, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusAccepted, gin.H{"message": "expense extraction job submitted successfully"})
}

// GetLLMJobs handles GET /llm/jobs
// Retrieves list of LLM jobs for the authenticated user.
func (h *Handler) GetLLMJobs(c *gin.Context) {
	ctx, userID, err := h.getLLMContext(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if h.llmJobService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "llm job service client is not initialized"})
		return
	}

	resp, err := h.llmJobService.GetLLMJobs(ctx, &llmpb.GetLLMJobsRequest{UserId: userID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp.GetJobs())
}
