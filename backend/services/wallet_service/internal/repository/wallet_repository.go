package repository

import (
	"context"
	"errors"

	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/constant"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/model"
	"gorm.io/gorm"
)

type WalletRepository interface {
	// FOKUS INI DULU AJA
	// JANGAN LUPA SQL INJECTIONNYA, TOLONG AWARE
	CreateWallet(ctx context.Context, wallet *model.Wallet) error
	UpdateWallet(ctx context.Context, wallet *model.Wallet) error
	DeleteWallet(ctx context.Context, wallet *model.Wallet) error
	AddWalletMember(ctx context.Context, walletMember *model.WalletMember) error
	DeleteWalletMember(ctx context.Context, walletMember *model.WalletMember) error
	GetWalletMember(ctx context.Context, memberId string) (*model.WalletMember, error)
	UpdateWalletMember(ctx context.Context, walletMember *model.WalletMember) error
	AllocateBalance(ctx context.Context, walletId string, walletMember *model.WalletMember, balanceAmount int64) error
	GetWallet(ctx context.Context, walletID string) (*model.Wallet, error)
	GetWalletMembers(ctx context.Context, walletId string) ([]*model.WalletMember, error)
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

func (r *walletRepository) AddWalletMember(ctx context.Context, walletMember *model.WalletMember) error {
	return r.getDB(ctx).WithContext(ctx).Create(walletMember).Error
}

func (r *walletRepository) DeleteWalletMember(ctx context.Context, walletMember *model.WalletMember) error {
	return r.getDB(ctx).WithContext(ctx).Delete(walletMember).Error
}

func (r *walletRepository) AllocateBalance(ctx context.Context, walletId string, walletMember *model.WalletMember, balanceAmount int64) error {
	// take wallet
	var wallet model.Wallet
	err := r.getDB(ctx).WithContext(ctx).Where("id = ?", walletId).First(&wallet).Error
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

func (r *walletRepository) GetWalletMember(ctx context.Context, memberId string) (*model.WalletMember, error) {
	var walletMember model.WalletMember
	err := r.getDB(ctx).WithContext(ctx).Where("id = ?", memberId).First(&walletMember).Error
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
