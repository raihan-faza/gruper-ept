package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/mapper"
	userpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/user_service"
	"google.golang.org/grpc/metadata"
)

// CreateUser handles POST /users
// Used for user registration; does not require an authenticated user_id.
func (h *Handler) CreateUser(c *gin.Context) {
	var input dto.CreateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.userService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user service client is not initialized"})
		return
	}

	req := mapper.ToCreateUserRequest(input)
	resp, err := h.userService.CreateUser(c.Request.Context(), req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	if !resp.GetSuccess() {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "user creation failed"})
		return
	}

	c.JSON(http.StatusCreated, mapper.ToUserDTO(resp.GetUser()))
}

// UpdateUser handles PUT /users/me
// Updates the currently authenticated user's profile.
func (h *Handler) UpdateUser(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	ctx := metadata.AppendToOutgoingContext(c.Request.Context(), "user_id", userID)

	var input dto.UpdateUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.userService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user service client is not initialized"})
		return
	}

	req := mapper.ToUpdateUserRequest(userID, input)
	resp, err := h.userService.UpdateUser(ctx, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	if !resp.GetSuccess() {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "user update failed"})
		return
	}

	c.JSON(http.StatusOK, mapper.ToUserDTO(resp.GetUser()))
}

// DeleteUser handles DELETE /users/me
// Deletes the currently authenticated user's account.
func (h *Handler) DeleteUser(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if h.userService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user service client is not initialized"})
		return
	}

	resp, err := h.userService.DeleteUser(c.Request.Context(), &userpb.DeleteUserRequest{UserId: userID})
	if err != nil {
		h.handleError(c, err)
		return
	}

	if !resp.GetSuccess() {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "user deletion failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "user deleted successfully"})
}

func (h *Handler) GetUser(c *gin.Context) {
	userID, err := h.getUserID(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	if h.userService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user service client is not initialized"})
		return
	}

	resp, err := h.userService.GetUser(c.Request.Context(), &userpb.GetUserRequest{UserId: userID})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, mapper.ToUserDTO(resp.GetUser()))
}

// GetUserByID handles GET /users/:id
// Gets a specific user's public info by ID.
func (h *Handler) GetUserByID(c *gin.Context) {
	targetUserID := c.Param("id")
	if targetUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user id is required"})
		return
	}

	if h.userService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "user service client is not initialized"})
		return
	}

	resp, err := h.userService.GetUser(c.Request.Context(), &userpb.GetUserRequest{UserId: targetUserID})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, mapper.ToUserDTO(resp.GetUser()))
}

