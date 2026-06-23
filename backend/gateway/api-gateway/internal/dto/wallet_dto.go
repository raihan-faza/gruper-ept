package dto

import "time"

// --- Core DTOs ---

type PermissionDTO struct {
	ManageUser      bool `json:"manage_user"`
	AllocateBalance bool `json:"allocate_balance"`
	GenerateReport  bool `json:"generate_report"`
}

type WalletDTO struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	OwnerID      string `json:"owner_id"`
	TotalBalance int64  `json:"total_balance"`
	Currency     string `json:"currency"`
}

type WalletMemberDTO struct {
	WalletID        string        `json:"wallet_id"`
	UserID          string        `json:"user_id"`
	AllocationLimit int64         `json:"allocation_limit"`
	AllocationUsed  int64         `json:"allocation_used"`
	Permission      PermissionDTO `json:"permission"`
}

type WalletInvitationDTO struct {
	ID             string `json:"id"`
	WalletID       string `json:"wallet_id"`
	InvitationCode string `json:"invitation_code"`
	CreatedBy      string `json:"created_by"`
}

type WalletJoinRequestDTO struct {
	ID         string    `json:"id"`
	WalletID   string    `json:"wallet_id"`
	UserID     string    `json:"user_id"`
	Status     string    `json:"status"`
	WalletName string    `json:"wallet_name,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// --- Input DTOs ---

type CreateWalletInput struct {
	WalletName     string `json:"wallet_name" binding:"required"`
	InitialBalance int64  `json:"initial_balance" binding:"min=0"`
	Currency       string `json:"currency" binding:"required"`
}

type UpdateWalletInput struct {
	WalletName string `json:"wallet_name"`
	Currency   string `json:"currency"`
}

type AllocateBalanceInput struct {
	UserID          string `json:"user_id" binding:"required"`
	AllocationLimit int64  `json:"allocation_limit" binding:"min=0"`
}

type AdjustBalanceInput struct {
	Amount int64 `json:"amount" binding:"required"`
}

type ApproveJoinRequestInput struct {
	AllocationLimit int64         `json:"allocation_limit" binding:"min=0"`
	Permission      PermissionDTO `json:"permission"`
}

type RequestJoinWalletInput struct {
	InvitationCode string `json:"invitation_code" binding:"required"`
}

// --- Response DTOs ---

type GetWalletResponseDTO struct {
	Wallet  WalletDTO         `json:"wallet"`
	Members []WalletMemberDTO `json:"members"`
}
