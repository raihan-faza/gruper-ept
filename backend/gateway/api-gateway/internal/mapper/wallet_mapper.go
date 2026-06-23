package mapper

import (
	"time"

	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/dto"
	walletpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/wallet_service"
	"google.golang.org/protobuf/types/known/fieldmaskpb"
)

// --- Permission ---

func ToPermissionDTO(p *walletpb.Permission) dto.PermissionDTO {
	if p == nil {
		return dto.PermissionDTO{}
	}
	return dto.PermissionDTO{
		ManageUser:      p.ManageUser,
		AllocateBalance: p.AllocateBalance,
		GenerateReport:  p.GenerateReport,
	}
}

func ToPermissionPB(d dto.PermissionDTO) *walletpb.Permission {
	return &walletpb.Permission{
		ManageUser:      d.ManageUser,
		AllocateBalance: d.AllocateBalance,
		GenerateReport:  d.GenerateReport,
	}
}

// --- Wallet ---

func ToWalletDTO(p *walletpb.Wallet) dto.WalletDTO {
	if p == nil {
		return dto.WalletDTO{}
	}
	return dto.WalletDTO{
		ID:           p.Id,
		Name:         p.Name,
		OwnerID:      p.OwnerId,
		TotalBalance: p.TotalBalance,
		Currency:     p.Currency,
	}
}

// --- WalletMember ---

func ToWalletMemberDTO(p *walletpb.WalletMember) dto.WalletMemberDTO {
	if p == nil {
		return dto.WalletMemberDTO{}
	}
	return dto.WalletMemberDTO{
		WalletID:        p.WalletId,
		UserID:          p.UserId,
		AllocationLimit: p.AllocationLimit,
		AllocationUsed:  p.AllocationUsed,
		Permission:      ToPermissionDTO(p.Permission),
	}
}

// --- WalletInvitation ---

func ToWalletInvitationDTO(p *walletpb.WalletInvitation) dto.WalletInvitationDTO {
	if p == nil {
		return dto.WalletInvitationDTO{}
	}
	return dto.WalletInvitationDTO{
		ID:             p.Id,
		WalletID:       p.WalletId,
		InvitationCode: p.InvitationCode,
		CreatedBy:      p.CreatedBy,
	}
}

// --- WalletJoinRequest ---

func mapJoinRequestStatusToString(status walletpb.JoinRequestStatus) string {
	switch status {
	case walletpb.JoinRequestStatus_JOIN_REQUEST_STATUS_PENDING:
		return "pending"
	case walletpb.JoinRequestStatus_JOIN_REQUEST_STATUS_APPROVED:
		return "approved"
	case walletpb.JoinRequestStatus_JOIN_REQUEST_STATUS_REJECTED:
		return "rejected"
	default:
		return "unspecified"
	}
}

func ToWalletJoinRequestDTO(p *walletpb.WalletJoinRequest) dto.WalletJoinRequestDTO {
	if p == nil {
		return dto.WalletJoinRequestDTO{}
	}
	var createdAt time.Time
	if p.CreatedAt != nil {
		createdAt = p.CreatedAt.AsTime()
	}
	return dto.WalletJoinRequestDTO{
		ID:         p.Id,
		WalletID:   p.WalletId,
		UserID:     p.UserId,
		Status:     mapJoinRequestStatusToString(p.Status),
		WalletName: p.WalletName,
		CreatedAt:  createdAt,
	}
}

// --- Request builders ---

func ToCreateWalletRequest(input dto.CreateWalletInput) *walletpb.CreateWalletRequest {
	return &walletpb.CreateWalletRequest{
		WalletName:     input.WalletName,
		InitialBalance: input.InitialBalance,
		Currency:       input.Currency,
	}
}

func ToUpdateWalletRequest(walletID string, input dto.UpdateWalletInput) *walletpb.UpdateWalletRequest {
	req := &walletpb.UpdateWalletRequest{
		WalletId: walletID,
	}

	var paths []string
	if input.WalletName != "" {
		req.WalletName = input.WalletName
		paths = append(paths, "wallet_name")
	}
	if input.Currency != "" {
		req.Currency = input.Currency
		paths = append(paths, "currency")
	}

	mask, _ := fieldmaskpb.New(req, paths...)
	req.UpdateMask = mask
	return req
}

func ToAllocateBalanceRequest(walletID string, input dto.AllocateBalanceInput) *walletpb.AllocateBalanceRequest {
	return &walletpb.AllocateBalanceRequest{
		WalletId:        walletID,
		UserId:          input.UserID,
		AllocationLimit: input.AllocationLimit,
	}
}

func ToAdjustBalanceRequest(walletID string, input dto.AdjustBalanceInput) *walletpb.AdjustBalanceRequest {
	return &walletpb.AdjustBalanceRequest{
		WalletId: walletID,
		Amount:   input.Amount,
	}
}

func ToApproveJoinRequestRequest(joinRequestID string, input dto.ApproveJoinRequestInput) *walletpb.ApproveJoinRequestRequest {
	return &walletpb.ApproveJoinRequestRequest{
		JoinRequestId:   joinRequestID,
		AllocationLimit: input.AllocationLimit,
		Permission:      ToPermissionPB(input.Permission),
	}
}
