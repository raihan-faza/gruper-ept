package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/mapper"
	reportpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/report_service"
	"google.golang.org/grpc/metadata"
)

// GenerateReport handles POST /reports/generate
// Generates a financial report for the specified wallet and date range,
// returning a pre-signed download URL.
func (h *Handler) GenerateReport(c *gin.Context) {
	userID, err := h.getUserID(c)
	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	var input dto.GenerateReportInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.reportService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "report service client is not initialized"})
		return
	}

	req := mapper.ToGenerateReportRequest(userID, input)
	resp, err := h.reportService.GenerateReport(ctx, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapper.ToGenerateReportResponseDTO(resp))
}

// UploadTemplate handles POST /wallets/:wallet_id/reports/templates
func (h *Handler) UploadTemplate(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)

	walletID := c.Param("wallet_id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet_id is required"})
		return
	}

	templateName := c.PostForm("template_name")
	description := c.PostForm("description")
	if templateName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "template_name is required"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "file is required: " + err.Error()})
		return
	}

	openedFile, err := file.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open file: " + err.Error()})
		return
	}
	defer openedFile.Close()

	fileBytes := make([]byte, file.Size)
	_, err = openedFile.Read(fileBytes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read file: " + err.Error()})
		return
	}

	if h.reportService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "report service client is not initialized"})
		return
	}

	req := &reportpb.UploadTemplateRequest{
		WalletId:     walletID,
		TemplateName: templateName,
		Description:  description,
		FileContent:  fileBytes,
	}

	resp, err := h.reportService.UploadTemplate(ctx, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"template_name": resp.TemplateName,
		"status":        resp.Status,
	})
}

// DeleteTemplate handles DELETE /wallets/:wallet_id/reports/templates/:template_name
func (h *Handler) DeleteTemplate(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)

	walletID := c.Param("wallet_id")
	templateName := c.Param("template_name")
	if walletID == "" || templateName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet_id and template_name are required"})
		return
	}

	if h.reportService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "report service client is not initialized"})
		return
	}

	req := &reportpb.DeleteTemplateRequest{
		WalletId:     walletID,
		TemplateName: templateName,
	}

	resp, err := h.reportService.DeleteTemplate(ctx, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status": resp.Status,
	})
}

// ListTemplates handles GET /wallets/:wallet_id/reports/templates
func (h *Handler) ListTemplates(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)

	walletID := c.Param("wallet_id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet_id is required"})
		return
	}

	if h.reportService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "report service client is not initialized"})
		return
	}

	req := &reportpb.ListTemplatesRequest{
		WalletId: walletID,
	}

	resp, err := h.reportService.ListTemplates(ctx, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Map templates to DTO
	type TemplateDTO struct {
		TemplateName string `json:"template_name"`
		Description  string `json:"description"`
	}

	templates := make([]TemplateDTO, 0, len(resp.Templates))
	for _, t := range resp.Templates {
		templates = append(templates, TemplateDTO{
			TemplateName: t.TemplateName,
			Description:  t.Description,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"templates": templates,
	})
}
