package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/mapper"
	walletpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/wallet_service"
	"google.golang.org/grpc/metadata"
)

// CreateWallet handles POST /wallets
func (h *Handler) CreateWallet(c *gin.Context) {
	var input dto.CreateWalletInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	if input.ID != "" {
		ctx = metadata.AppendToOutgoingContext(ctx, "wallet_id", input.ID)
	}
	if input.IdempotencyKey != "" {
		ctx = metadata.AppendToOutgoingContext(ctx, "idempotency_key", input.IdempotencyKey)
	}
	req := mapper.ToCreateWalletRequest(input)
	req.OwnerId = userIDStr
	log.Printf("req: %v", req)
	resp, err := h.walletService.CreateWallet(ctx, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusCreated, mapper.ToWalletDTO(resp.GetWallet()))
}

// UpdateWallet handles PUT /wallets/:id
func (h *Handler) UpdateWallet(c *gin.Context) {
	walletID := c.Param("id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet id is required"})
		return
	}

	var input dto.UpdateWalletInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	req := mapper.ToUpdateWalletRequest(walletID, input)
	resp, err := h.walletService.UpdateWallet(ctx, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, mapper.ToWalletDTO(resp.GetWallet()))
}

// DeleteWallet handles DELETE /wallets/:id
func (h *Handler) DeleteWallet(c *gin.Context) {
	walletID := c.Param("id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet id is required"})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	_, err := h.walletService.DeleteWallet(ctx, &walletpb.DeleteWalletRequest{WalletId: walletID})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "wallet deleted successfully"})
}

// GetWallet handles GET /wallets/:id
func (h *Handler) GetWallet(c *gin.Context) {
	walletID := c.Param("id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet id is required"})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	resp, err := h.walletService.GetWallet(ctx, &walletpb.GetWalletRequest{WalletId: walletID})
	if err != nil {
		h.handleError(c, err)
		return
	}

	members := make([]dto.WalletMemberDTO, len(resp.GetMembers()))
	for i, m := range resp.GetMembers() {
		members[i] = mapper.ToWalletMemberDTO(m)
	}

	c.JSON(http.StatusOK, dto.GetWalletResponseDTO{
		Wallet:  mapper.ToWalletDTO(resp.GetWallet()),
		Members: members,
	})
}

// GetWalletMembers handles GET /wallets/:id/members
func (h *Handler) GetWalletMembers(c *gin.Context) {
	walletID := c.Param("id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet id is required"})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	resp, err := h.walletService.GetWalletMembers(ctx, &walletpb.GetWalletMembersRequest{WalletId: walletID})
	if err != nil {
		h.handleError(c, err)
		return
	}

	members := make([]dto.WalletMemberDTO, len(resp.GetWalletMembers()))
	for i, m := range resp.GetWalletMembers() {
		members[i] = mapper.ToWalletMemberDTO(m)
	}

	c.JSON(http.StatusOK, members)
}

// DeleteWalletMember handles DELETE /wallets/:id/members/:user_id
func (h *Handler) DeleteWalletMember(c *gin.Context) {
	walletID := c.Param("id")
	memberUserID := c.Param("user_id")
	if walletID == "" || memberUserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet id and user id are required"})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	_, err := h.walletService.DeleteWalletMember(ctx, &walletpb.DeleteWalletMemberRequest{
		WalletId: walletID,
		UserId:   memberUserID,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "wallet member removed successfully"})
}

// AllocateBalance handles POST /wallets/:id/allocate
func (h *Handler) AllocateBalance(c *gin.Context) {
	walletID := c.Param("id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet id is required"})
		return
	}

	var input dto.AllocateBalanceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	req := mapper.ToAllocateBalanceRequest(walletID, input)
	_, err := h.walletService.AllocateBalance(ctx, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "balance allocated successfully"})
}

// AdjustBalance handles POST /wallets/:id/adjust
func (h *Handler) AdjustBalance(c *gin.Context) {
	walletID := c.Param("id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet id is required"})
		return
	}

	var input dto.AdjustBalanceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	req := mapper.ToAdjustBalanceRequest(walletID, input)
	resp, err := h.walletService.AdjustBalance(ctx, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, mapper.ToWalletDTO(resp.GetWallet()))
}

// GetWalletInvitation handles GET /wallets/:id/invitation
func (h *Handler) GetWalletInvitation(c *gin.Context) {
	walletID := c.Param("id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet id is required"})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	resp, err := h.walletService.GetWalletInvitation(ctx, &walletpb.GetWalletInvitationRequest{WalletId: walletID})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, mapper.ToWalletInvitationDTO(resp.GetWalletInvitation()))
}

// RegenerateWalletInvitation handles POST /wallets/:id/invitation/regenerate
func (h *Handler) RegenerateWalletInvitation(c *gin.Context) {
	walletID := c.Param("id")
	log.Printf("walletIdFromApiGateway: %v", walletID)
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet id is required"})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	resp, err := h.walletService.RegenerateWalletInvitation(ctx, &walletpb.RegenerateWalletInvitationRequest{WalletId: walletID})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, mapper.ToWalletInvitationDTO(resp.GetWalletInvitation()))
}

// RequestJoinWallet handles POST /wallets/join
func (h *Handler) RequestJoinWallet(c *gin.Context) {
	var input dto.RequestJoinWalletInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	resp, err := h.walletService.RequestJoinWallet(ctx, &walletpb.RequestJoinWalletRequest{
		InvitationCode: input.InvitationCode,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"join_request_id": resp.GetJoinRequestId()})
}

// ApproveJoinRequest handles POST /wallets/join/:join_request_id/approve
func (h *Handler) ApproveJoinRequest(c *gin.Context) {
	joinRequestID := c.Param("join_request_id")
	if joinRequestID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "join request id is required"})
		return
	}

	var input dto.ApproveJoinRequestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	req := mapper.ToApproveJoinRequestRequest(joinRequestID, input)
	_, err := h.walletService.ApproveJoinRequest(ctx, req)
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "join request approved successfully"})
}

// RejectJoinRequest handles POST /wallets/join/:join_request_id/reject
func (h *Handler) RejectJoinRequest(c *gin.Context) {
	joinRequestID := c.Param("join_request_id")
	if joinRequestID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "join request id is required"})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	_, err := h.walletService.RejectJoinRequest(ctx, &walletpb.RejectJoinRequestRequest{
		JoinRequestId: joinRequestID,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "join request rejected successfully"})
}

// GetWalletJoinRequests handles GET /wallets/:id/join-requests
func (h *Handler) GetWalletJoinRequests(c *gin.Context) {
	walletID := c.Param("id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet id is required"})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	resp, err := h.walletService.GetWalletJoinRequests(ctx, &walletpb.GetWalletJoinRequestsRequest{WalletId: walletID})
	if err != nil {
		h.handleError(c, err)
		return
	}

	joinRequests := make([]dto.WalletJoinRequestDTO, len(resp.GetWalletJoinRequests()))
	for i, jr := range resp.GetWalletJoinRequests() {
		joinRequests[i] = mapper.ToWalletJoinRequestDTO(jr)
	}

	c.JSON(http.StatusOK, joinRequests)
}

// GetWalletsByUserId handles GET /wallets
func (h *Handler) GetWalletsByUserId(c *gin.Context) {
	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)

	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	resp, err := h.walletService.GetWalletsByUserId(ctx, &walletpb.GetWalletsByUserIdRequest{
		UserId: userIDStr,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	wallets := make([]dto.WalletDTO, len(resp.GetWallets()))
	for i, w := range resp.GetWallets() {
		wallets[i] = mapper.ToWalletDTO(w)
	}

	c.JSON(http.StatusOK, wallets)
}

// GetWalletPendingJoinRequests handles GET /wallets/join/pending
func (h *Handler) GetWalletPendingJoinRequests(c *gin.Context) {
	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	userID, _ := c.Get("user_id")
	userIDStr, _ := userID.(string)
	ctx := metadata.AppendToOutgoingContext(c, "user_id", userIDStr)
	resp, err := h.walletService.GetWalletPendingJoinRequest(ctx, &walletpb.GetWalletPendingJoinRequestRequest{
		UserId: userIDStr,
	})
	if err != nil {
		h.handleError(c, err)
		return
	}

	joinRequests := make([]dto.WalletJoinRequestDTO, len(resp.GetWalletJoinRequests()))
	for i, jr := range resp.GetWalletJoinRequests() {
		joinRequests[i] = mapper.ToWalletJoinRequestDTO(jr)
	}

	c.JSON(http.StatusOK, joinRequests)
}
