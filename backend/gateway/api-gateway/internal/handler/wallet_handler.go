package handler

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/mapper"
	walletpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/wallet_service"
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

	req := mapper.ToCreateWalletRequest(input)
	req.OwnerId = c.GetString("user_id")
	log.Printf("req: %v", req)
	resp, err := h.walletService.CreateWallet(h.getContext(c), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	req := mapper.ToUpdateWalletRequest(walletID, input)
	resp, err := h.walletService.UpdateWallet(h.getContext(c), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	_, err := h.walletService.DeleteWallet(h.getContext(c), &walletpb.DeleteWalletRequest{WalletId: walletID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	resp, err := h.walletService.GetWallet(h.getContext(c), &walletpb.GetWalletRequest{WalletId: walletID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	resp, err := h.walletService.GetWalletMembers(h.getContext(c), &walletpb.GetWalletMembersRequest{WalletId: walletID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	_, err := h.walletService.DeleteWalletMember(h.getContext(c), &walletpb.DeleteWalletMemberRequest{
		WalletId: walletID,
		UserId:   memberUserID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	req := mapper.ToAllocateBalanceRequest(walletID, input)
	_, err := h.walletService.AllocateBalance(h.getContext(c), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	req := mapper.ToAdjustBalanceRequest(walletID, input)
	resp, err := h.walletService.AdjustBalance(h.getContext(c), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	resp, err := h.walletService.GetWalletInvitation(h.getContext(c), &walletpb.GetWalletInvitationRequest{WalletId: walletID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, mapper.ToWalletInvitationDTO(resp.GetWalletInvitation()))
}

// RegenerateWalletInvitation handles POST /wallets/:id/invitation/regenerate
func (h *Handler) RegenerateWalletInvitation(c *gin.Context) {
	walletID := c.Param("id")
	if walletID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "wallet id is required"})
		return
	}

	if h.walletService == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "wallet service client is not initialized"})
		return
	}

	resp, err := h.walletService.RegenerateWalletInvitation(h.getContext(c), &walletpb.RegenerateWalletInvitationRequest{WalletId: walletID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	resp, err := h.walletService.RequestJoinWallet(h.getContext(c), &walletpb.RequestJoinWalletRequest{
		InvitationCode: input.InvitationCode,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	req := mapper.ToApproveJoinRequestRequest(joinRequestID, input)
	_, err := h.walletService.ApproveJoinRequest(h.getContext(c), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	_, err := h.walletService.RejectJoinRequest(h.getContext(c), &walletpb.RejectJoinRequestRequest{
		JoinRequestId: joinRequestID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	resp, err := h.walletService.GetWalletJoinRequests(h.getContext(c), &walletpb.GetWalletJoinRequestsRequest{WalletId: walletID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
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

	resp, err := h.walletService.GetWalletsByUserId(h.getContext(c), &walletpb.GetWalletsByUserIdRequest{
		UserId: userIDStr,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	wallets := make([]dto.WalletDTO, len(resp.GetWallets()))
	for i, w := range resp.GetWallets() {
		wallets[i] = mapper.ToWalletDTO(w)
	}

	c.JSON(http.StatusOK, wallets)
}
