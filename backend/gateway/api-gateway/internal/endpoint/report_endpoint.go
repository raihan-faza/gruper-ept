package endpoint

import (
	"github.com/gin-gonic/gin"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/handler"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/middleware"
)

// RegisterReportEndpoints registers all report-related routes under /api/v1/reports.
func RegisterReportEndpoints(rg *gin.RouterGroup, h *handler.Handler) {
	reports := rg.Group("/reports", middleware.AuthMiddleware())
	{
		reports.POST("/generate", h.GenerateReport)
		reports.GET("/wallets/:wallet_id/templates", h.ListTemplates)
		reports.POST("/wallets/:wallet_id/templates", h.UploadTemplate)
		reports.DELETE("/wallets/:wallet_id/templates/:template_name", h.DeleteTemplate)
	}
}
