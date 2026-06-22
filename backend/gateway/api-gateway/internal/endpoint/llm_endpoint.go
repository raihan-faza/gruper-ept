package endpoint

import (
	"github.com/gin-gonic/gin"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/handler"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/middleware"
)

// RegisterLLMEndpoints registers all LLM job-related routes under /api/v1/llm.
func RegisterLLMEndpoints(rg *gin.RouterGroup, h *handler.Handler) {
	llm := rg.Group("/llm", middleware.AuthMiddleware())
	{
		llm.POST("/extract-expense", h.ExtractExpense)
		llm.GET("/jobs", h.GetLLMJobs)
	}
}
