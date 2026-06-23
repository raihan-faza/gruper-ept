package dto

import (
	"time"

	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/model"
)

type CreateWalletInput struct {
	WalletName     string
	OwnerId        string
	InitialBalance int64
	Currency       string
}

type CreateWalletOutput struct {
	Wallet *model.Wallet
}

type UpdateWalletInput struct {
	UserId       string
	WalletId     string
	WalletName   string
	Currency     string
	UpdateFields []string
}

type UpdateWalletOutput struct {
	Wallet *model.Wallet
}

type DeleteWalletInput struct {
	WalletId string
	UserId   string
}

type DeleteWalletOutput struct {
}

type GetWalletInput struct {
	WalletId string
	UserId   string
}

type GetWalletOutput struct {
	Wallet  *model.Wallet
	Members []*model.WalletMember
}

type Permission struct {
	ManageUser      bool
	AllocateBalance bool
	GenerateReport  bool
}

type AddMemberInput struct {
	WalletId        string
	UserId          string
	AllocationLimit int64
	AllocationUsed  int64
	Permission      Permission
}

type AddMemberOutput struct {
}

type GetWalletMembersInput struct {
	UserId   string
	WalletId string
}
type GetWalletMembersOutput struct {
	WalletMembers []*model.WalletMember
}

type DeleteWalletMemberInput struct {
	WalletId string
	UserId   string
	MemberId string
}

type DeleteWalletMemberOutput struct{}

type AllocateBalanceInput struct {
	WalletId        string
	UserId          string
	MemberId        string
	AllocationLimit int64
}

type AllocateBalanceOutput struct {
	WalletMember *model.WalletMember
}

type ValidateAndDeductBalanceInput struct {
	WalletId       string
	UserId         string
	Amount         int64
	IdempotencyKey string
}

type AdjustBalanceInput struct {
	WalletId string
	Amount   int64
	Reason   string
	UserId   string
}

type AdjustBalanceOutput struct {
	WalletId string
	Balance  int64
}

type ApproveJoinRequestInput struct {
	JoinRequestId   string
	AllocationLimit int64
	Permission      Permission
	UserId          string
}

type RejectJoinRequestInput struct {
	JoinRequestId string
}

type WalletInvitation struct {
	Id             string
	WalletId       string
	InvitationCode string
	CreatedBy      string
}

type GetWalletInvitationInput struct {
	WalletId string
	UserId   string
}

type GetWalletInvitationOutput struct {
	WalletInvitation *model.WalletInvitation
}

type RegenerateWalletInvitationInput struct {
	WalletId string
	UserId   string
}

type RegenerateWalletInvitationOutput struct {
	WalletInvitation *model.WalletInvitation
}

type WalletJoinRequest struct {
	Id         string
	WalletId   string
	UserId     string
	Status     string
	WalletName string
	CreatedAt  time.Time
}

type RequestJoinWalletInput struct {
	InvitationCode string
	UserId         string
}

type RequestJoinWalletOutput struct {
	JoinRequestId string
}

type GetWalletJoinRequestsInput struct {
	WalletId string
	UserId   string
}

type GetWalletJoinRequestsOutput struct {
	WalletJoinRequests []*WalletJoinRequest
}

type GetWalletPendingJoinRequestInput struct {
	UserId string
}

type GetWalletPendingJoinRequestOutput struct {
	WalletJoinRequests []*WalletJoinRequest
}

type RefundWalletMemberBalanceInput struct {
	WalletId string
	UserId   string
	Amount   int64
}

type GetWalletsByUserIdInput struct {
	UserId string
}

type GetWalletsByUserIdOutput struct {
	Wallets []*model.Wallet
}
