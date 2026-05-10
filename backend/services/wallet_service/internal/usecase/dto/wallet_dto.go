package dto

import "github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/model"

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
	WalletID     string
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
}

type GetWalletOutput struct {
	Wallet *model.Wallet
}

type AddMemberInput struct {
	WalletId        string
	UserId          string
	AllocationLimit int64
}

type AddMemberOutput struct {
}

type GetWalletMembersInput struct {
	WalletId string
}
type GetWalletMembersOutput struct {
	WalletMembers []*model.WalletMember
}

type DeleteWalletMemberInput struct {
	WalletId string
	MemberId string
}

type DeleteWalletMemberOutput struct{}

type AllocateBalanceInput struct {
	WalletID        string
	MemberID        string
	AllocationLimit int64
}

type AllocateBalanceOutput struct{}

type ValidateAndDeductBalanceInput struct {
	WalletId       string
	UserId         string
	Amount         int64
	IdempotencyKey string
}

type ValidateAndDeductBalanceOutput struct{}

type AdjustBalanceInput struct {
	WalletID string
	Amount   int64
	Reason   string
	UserID   string
}

type AdjustBalanceOutput struct {
	WalletID string
	Balance  int64
}
