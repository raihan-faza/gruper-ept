package repository

import (
	"context"
	"errors"

	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/constant"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/model"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type WalletRepository interface {
	CreateWalletMember(
		ctx context.Context,
		walletMember *model.WalletMember,
	) error

	CreateWallet(
		ctx context.Context,
		wallet *model.Wallet,
	) error

	UpdateWallet(
		ctx context.Context,
		wallet *model.Wallet,
	) error

	DeleteWallet(
		ctx context.Context,
		wallet *model.Wallet,
	) error

	DeleteWalletMember(
		ctx context.Context,
		walletMember *model.WalletMember,
	) error

	GetWalletMember(
		ctx context.Context,
		memberId string,
		walletId string,
	) (*model.WalletMember, error)

	UpdateWalletMember(
		ctx context.Context,
		walletMember *model.WalletMember,
	) error

	AllocateBalance(
		ctx context.Context,
		walletId string,
		walletMember *model.WalletMember,
		balanceAmount int64,
	) error

	GetWallet(
		ctx context.Context,
		walletID string,
	) (*model.Wallet, error)

	GetWalletMembers(
		ctx context.Context,
		walletId string,
	) ([]*model.WalletMember, error)

	GetWalletInvitation(
		ctx context.Context,
		walletID string,
	) (*model.WalletInvitation, error)

	GetWalletInvitationByCode(
		ctx context.Context,
		invitationCode string,
	) (*model.WalletInvitation, error)

	CreateWalletInvitation(
		ctx context.Context,
		invitation *model.WalletInvitation,
	) error

	UpdateWalletInvitation(
		ctx context.Context,
		invitation *model.WalletInvitation,
	) error

	CreateWalletJoinRequest(
		ctx context.Context,
		joinRequest *model.WalletJoinRequest,
	) error

	GetWalletJoinRequest(
		ctx context.Context,
		joinRequestID string,
	) (*model.WalletJoinRequest, error)

	GetWalletJoinRequests(
		ctx context.Context,
		walletID string,
	) ([]*model.WalletJoinRequest, error)

	GetPendingWalletJoinRequest(
		ctx context.Context,
		walletID string,
		userID string,
	) (*model.WalletJoinRequest, error)

	UpdateWalletJoinRequest(
		ctx context.Context,
		joinRequest *model.WalletJoinRequest,
	) error

	GetWalletMemberByUserID(
		ctx context.Context,
		walletID string,
		userID string,
	) (*model.WalletMember, error)

	AdjustBalance(
		ctx context.Context,
		walletID string,
		amount int64,
	) (*model.Wallet, error)

	RefundWalletMemberBalance(
		ctx context.Context,
		user_id string,
		walletID string,
		amount int64) error

	GetWalletsByUserID(
		ctx context.Context,
		userID string,
	) ([]*model.Wallet, error)
}

type walletRepository struct {
	db *gorm.DB
}

func NewWalletRepository(db *gorm.DB) WalletRepository {
	return &walletRepository{
		db: db,
	}
}

func (r *walletRepository) getDB(ctx context.Context) *gorm.DB {
	if tx, ok := ctx.Value(constant.TxKey).(*gorm.DB); ok {
		return tx
	}
	return r.db
}

func (r *walletRepository) CreateWallet(ctx context.Context, wallet *model.Wallet) error {
	return r.getDB(ctx).WithContext(ctx).Create(wallet).Error
}

func (r *walletRepository) UpdateWallet(ctx context.Context, wallet *model.Wallet) error {
	return r.getDB(ctx).WithContext(ctx).Save(wallet).Error
}

func (r *walletRepository) DeleteWallet(ctx context.Context, wallet *model.Wallet) error {
	return r.getDB(ctx).WithContext(ctx).Delete(wallet).Error
}

func (r *walletRepository) CreateWalletMember(ctx context.Context, walletMember *model.WalletMember) error {
	return r.getDB(ctx).WithContext(ctx).Create(walletMember).Error
}

func (r *walletRepository) DeleteWalletMember(ctx context.Context, walletMember *model.WalletMember) error {
	return r.getDB(ctx).WithContext(ctx).Delete(walletMember).Error
}

func (r *walletRepository) AllocateBalance(ctx context.Context, walletId string, walletMember *model.WalletMember, balanceAmount int64) error {
	// take wallet with lock to prevent race conditions
	var wallet model.Wallet
	err := r.getDB(ctx).WithContext(ctx).Clauses(clause.Locking{Strength: "UPDATE"}).Where("id = ?", walletId).First(&wallet).Error
	if err != nil {
		return err
	}
	if balanceAmount > (wallet.InitialBalance - wallet.BalanceAllocated) {
		return errors.New("allocation limit exceed available balance")
	}
	// update wallet_member.allocation limit to new allocation limit
	walletMember.AllocationLimit = balanceAmount
	err = r.getDB(ctx).WithContext(ctx).Save(walletMember).Error
	if err != nil {
		return err
	}
	// update wallet balance allocated
	wallet.BalanceAllocated += balanceAmount
	err = r.getDB(ctx).WithContext(ctx).Save(&wallet).Error
	if err != nil {
		return err
	}
	return nil
}

func (r *walletRepository) GetWallet(ctx context.Context, walletID string) (*model.Wallet, error) {
	var wallet model.Wallet
	err := r.getDB(ctx).WithContext(ctx).Where("id = ?", walletID).First(&wallet).Error
	if err != nil {
		return nil, err
	}
	return &wallet, nil
}

func (r *walletRepository) GetWalletMember(ctx context.Context, memberId string, walletId string) (*model.WalletMember, error) {
	var walletMember model.WalletMember
	err := r.getDB(ctx).WithContext(ctx).Where("user_id = ? AND wallet_id = ?", memberId, walletId).First(&walletMember).Error
	if err != nil {
		return nil, err
	}
	return &walletMember, nil
}

func (r *walletRepository) UpdateWalletMember(ctx context.Context, walletMember *model.WalletMember) error {
	return r.getDB(ctx).WithContext(ctx).Save(walletMember).Error
}

func (r *walletRepository) GetWalletMembers(ctx context.Context, walletId string) ([]*model.WalletMember, error) {
	var walletMembers []*model.WalletMember
	err := r.getDB(ctx).WithContext(ctx).Where("wallet_id = ?", walletId).Find(&walletMembers).Error
	if err != nil {
		return nil, err
	}
	return walletMembers, nil
}

func (r *walletRepository) GetWalletInvitation(ctx context.Context, walletId string) (*model.WalletInvitation, error) {
	var invitation model.WalletInvitation
	err := r.getDB(ctx).WithContext(ctx).Where("wallet_id = ?", walletId).First(&invitation).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &model.WalletInvitation{}, nil
		}
		return nil, err
	}

	return &invitation, nil
}

func (r *walletRepository) GetWalletInvitationByCode(ctx context.Context, invitationCode string) (*model.WalletInvitation, error) {
	var invitation model.WalletInvitation
	err := r.getDB(ctx).WithContext(ctx).Where("invitation_code = ?", invitationCode).First(&invitation).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return &model.WalletInvitation{}, nil
		}
		return nil, err
	}

	return &invitation, nil
}

func (r *walletRepository) CreateWalletInvitation(ctx context.Context, invitation *model.WalletInvitation) error {
	return r.getDB(ctx).WithContext(ctx).Create(invitation).Error
}

func (r *walletRepository) UpdateWalletInvitation(ctx context.Context, invitation *model.WalletInvitation) error {
	return r.getDB(ctx).WithContext(ctx).Save(invitation).Error
}

func (r *walletRepository) CreateWalletJoinRequest(ctx context.Context, joinRequest *model.WalletJoinRequest) error {
	return r.getDB(ctx).WithContext(ctx).Create(joinRequest).Error
}

func (r *walletRepository) GetWalletJoinRequest(ctx context.Context, joinRequestID string) (*model.WalletJoinRequest, error) {
	var joinRequest model.WalletJoinRequest
	err := r.getDB(ctx).WithContext(ctx).Where("id = ?", joinRequestID).First(&joinRequest).Error
	if err != nil {
		return nil, err
	}
	return &joinRequest, nil
}

func (r *walletRepository) GetWalletJoinRequests(ctx context.Context, walletID string) ([]*model.WalletJoinRequest, error) {
	var joinRequests []*model.WalletJoinRequest
	err := r.getDB(ctx).WithContext(ctx).Where("wallet_id = ?", walletID).Find(&joinRequests).Error
	if err != nil {
		return nil, err
	}
	return joinRequests, nil
}

func (r *walletRepository) GetPendingWalletJoinRequest(ctx context.Context, walletID string, userID string) (*model.WalletJoinRequest, error) {
	var joinRequest model.WalletJoinRequest
	err := r.getDB(ctx).WithContext(ctx).Where("wallet_id = ? AND user_id = ? AND status = ?", walletID, userID, constant.JoinRequestPending).First(&joinRequest).Error
	if err != nil {
		return nil, err
	}
	return &joinRequest, nil
}

func (r *walletRepository) UpdateWalletJoinRequest(ctx context.Context, joinRequest *model.WalletJoinRequest) error {
	return r.getDB(ctx).WithContext(ctx).Save(joinRequest).Error
}

func (r *walletRepository) GetWalletMemberByUserID(ctx context.Context, walletID string, userID string) (*model.WalletMember, error) {
	var walletMember model.WalletMember
	err := r.getDB(ctx).WithContext(ctx).Where("wallet_id = ? AND user_id = ?", walletID, userID).First(&walletMember).Error
	if err != nil {
		return nil, err
	}
	return &walletMember, nil
}

func (r *walletRepository) AdjustBalance(ctx context.Context, walletID string, amount int64) (*model.Wallet, error) {
	var wallet model.Wallet
	err := r.getDB(ctx).WithContext(ctx).Where("id = ?", walletID).First(&wallet).Error
	if err != nil {
		return nil, err
	}

	newBalance := wallet.InitialBalance + amount
	if newBalance < wallet.BalanceAllocated {
		return nil, errors.New("new balance cannot be smaller than allocated balance")
	}

	wallet.InitialBalance = newBalance
	err = r.getDB(ctx).WithContext(ctx).Save(&wallet).Error
	if err != nil {
		return nil, err
	}

	return &wallet, nil
}

func (r *walletRepository) RefundWalletMemberBalance(ctx context.Context, user_id string, walletID string, amount int64) error {
	var walletMember model.WalletMember
	err := r.getDB(ctx).WithContext(ctx).Where("user_id = ? AND wallet_id = ? ", user_id, walletID).First(&walletMember).Error
	if err != nil {
		return err
	}

	newAllocationUsed := walletMember.AllocationUsed - amount
	if newAllocationUsed > walletMember.AllocationLimit {
		return errors.New("Insufficient balance")
	}
	walletMember.AllocationUsed = newAllocationUsed
	err = r.getDB(ctx).WithContext(ctx).Save(&walletMember).Error
	if err != nil {
		return err
	}
	return nil
}

func (r *walletRepository) GetWalletsByUserID(ctx context.Context, userID string) ([]*model.Wallet, error) {
	var members []*model.WalletMember
	err := r.getDB(ctx).WithContext(ctx).
		Preload("Wallet").
		Where("user_id = ?", userID).
		Find(&members).Error
	if err != nil {
		return nil, err
	}

	wallets := make([]*model.Wallet, 0, len(members))
	for _, m := range members {
		if m.Wallet.Id != "" {
			wallets = append(wallets, &m.Wallet)
		}
	}
	return wallets, nil
}
