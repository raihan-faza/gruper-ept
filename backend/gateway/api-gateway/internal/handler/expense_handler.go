package handler

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/dto"
	custom_errors "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/errors"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/mapper"
	expensepb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/expense_service"
	"google.golang.org/grpc/metadata"
)

// getUserID extracts the user ID from the Gin context.
func (h *Handler) getUserID(c *gin.Context) (string, error) {
	userID, exists := c.Get("user_id")
	log.Printf("userID: %v", userID)
	if !exists {
		return "", custom_errors.UnauthorizedError
	}

	id, ok := userID.(string)
	if !ok {
		return "", custom_errors.UnauthorizedError
	}

	return id, nil
}

// CreateExpense handles POST /expenses
func (h *Handler) CreateExpense(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)
	var input dto.CreateExpenseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.expenseService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "expense service client is not initialized"})
		return
	}

	req := mapper.ToCreateExpenseRequest(input, userID)
	resp, err := (h.expenseService).CreateExpense(ctx, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, mapper.ToExpenseDTO(resp.GetExpense()))
}

// UpdateExpense handles PUT /expenses/:id
func (h *Handler) UpdateExpense(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)
	expenseID := c.Param("id")
	if expenseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expense id is required"})
		return
	}

	var input dto.UpdateExpenseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.expenseService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "expense service client is not initialized"})
		return
	}

	req := mapper.ToUpdateExpenseRequest(expenseID, userID, input)
	resp, err := (h.expenseService).UpdateExpense(ctx, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, mapper.ToExpenseDTO(resp.GetExpense()))
}

// DeleteExpense handles DELETE /expenses/:id
func (h *Handler) DeleteExpense(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)
	expenseID := c.Param("id")
	if expenseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expense id is required"})
		return
	}

	walletID := c.Query("wallet_id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet_id query parameter is required"})
		return
	}

	if h.expenseService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "expense service client is not initialized"})
		return
	}

	req := &expensepb.DeleteExpenseRequest{
		ExpenseId: expenseID,
		UserId:    userID,
		WalletId:  walletID,
	}

	_, deleteErr := (h.expenseService).DeleteExpense(ctx, req)
	if deleteErr != nil {
		h.handleError(c, deleteErr)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "expense deleted successfully"})
}

// GetAllExpenses handles GET /expenses
func (h *Handler) GetAllExpenses(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)
	walletID := c.Query("wallet_id")

	if h.expenseService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "expense service client is not initialized"})
		return
	}

	var resp *expensepb.GetAllExpensesResponse
	if walletID != "" {
		req := &expensepb.GetAllExpensesByWalletIdRequest{
			WalletId: walletID,
		}
		resp, err = (h.expenseService).GetAllExpensesByWalletId(ctx, req)
	} else {
		req := &expensepb.GetAllExpensesByUserIdRequest{
			UserId: userID,
		}
		resp, err = (h.expenseService).GetAllExpensesByUserId(ctx, req)
	}

	if err != nil {
		h.handleError(c, err)
		return
	}

	expenses := make([]dto.ExpenseDTO, len(resp.GetExpenses()))
	for i, exp := range resp.GetExpenses() {
		expenses[i] = mapper.ToExpenseDTO(exp)
	}

	c.JSON(http.StatusOK, expenses)
}

// CreateExpenseCategory handles POST /expenses/categories
func (h *Handler) CreateExpenseCategory(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)
	var input dto.CreateExpenseCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.expenseService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "expense service client is not initialized"})
		return
	}

	req := mapper.ToCreateExpenseCategoryRequest(input, userID)
	resp, err := (h.expenseService).CreateExpenseCategory(ctx, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, mapper.ToExpenseCategoryDTO(resp.GetExpenseCategory()))
}

// UpdateExpenseCategory handles PUT /expenses/categories/:id
func (h *Handler) UpdateExpenseCategory(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)
	categoryIDStr := c.Param("id")
	if categoryIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "category id is required"})
		return
	}

	categoryID, err := strconv.ParseUint(categoryIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid category id format"})
		return
	}

	var input dto.UpdateExpenseCategoryInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.expenseService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "expense service client is not initialized"})
		return
	}

	req := mapper.ToUpdateExpenseCategoryRequest(categoryID, userID, input)
	resp, err := (h.expenseService).UpdateExpenseCategory(ctx, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, mapper.ToExpenseCategoryDTO(resp.GetExpenseCategory()))
}

// DeleteExpenseCategory handles DELETE /expenses/categories/:id
func (h *Handler) DeleteExpenseCategory(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)
	categoryIDStr := c.Param("id")
	if categoryIDStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "category id is required"})
		return
	}

	categoryID, err := strconv.ParseUint(categoryIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid category id format"})
		return
	}

	if h.expenseService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "expense service client is not initialized"})
		return
	}

	req := &expensepb.DeleteExpenseCategoryRequest{
		Id:     categoryID,
		UserId: userID,
	}

	_, deleteErr := (h.expenseService).DeleteExpenseCategory(ctx, req)
	if deleteErr != nil {
		h.handleError(c, deleteErr)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "expense category deleted successfully"})
}

// GetAllExpensesCategory handles GET /expenses/categories
func (h *Handler) GetAllExpensesCategory(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}
	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)
	if h.expenseService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "expense service client is not initialized"})
		return
	}

	req := &expensepb.GetAllExpensesCategoryRequest{}

	resp, err := (h.expenseService).GetAllExpensesCategory(ctx, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	categories := make([]dto.ExpenseCategoryDTO, len(resp.GetExpenseCategories()))
	for i, cat := range resp.GetExpenseCategories() {
		categories[i] = mapper.ToExpenseCategoryDTO(cat)
	}

	c.JSON(http.StatusOK, categories)
}

// GetExpenseByID handles GET /expenses/:id
func (h *Handler) GetExpenseByID(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)
	expenseID := c.Param("id")
	if expenseID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "expense id is required"})
		return
	}

	if h.expenseService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "expense service client is not initialized"})
		return
	}

	req := &expensepb.GetExpenseByIDRequest{
		ExpenseId: expenseID,
	}
	resp, err := (h.expenseService).GetExpenseByID(ctx, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	if resp.GetExpense() == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "expense not found"})
		return
	}

	c.JSON(http.StatusOK, mapper.ToExpenseDTO(resp.GetExpense()))
}
