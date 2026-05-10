package usecase

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/usecase/mapper"
)

type WalletUsecase interface {
	CreateWallet(ctx context.Context, in *dto.CreateWalletInput) (*dto.CreateWalletOutput, error)
	UpdateWallet(ctx context.Context, in *dto.UpdateWalletInput) (*dto.UpdateWalletOutput, error)
	DeleteWallet(ctx context.Context, in *dto.DeleteWalletInput) error
	GetWallet(ctx context.Context, in *dto.GetWalletInput) (*dto.GetWalletOutput, error)
	ValidateAndDeductBalance(ctx context.Context, in *dto.ValidateAndDeductBalanceInput) (*dto.ValidateAndDeductBalanceOutput, error)
	AddMember(ctx context.Context, in *dto.AddMemberInput) (*dto.AddMemberOutput, error)
	GetWalletMembers(ctx context.Context, in *dto.GetWalletMembersInput) (*dto.GetWalletMembersOutput, error)
	DeleteWalletMember(ctx context.Context, in *dto.DeleteWalletMemberInput) (*dto.DeleteWalletMemberOutput, error)
	AllocateBalance(ctx context.Context, in *dto.AllocateBalanceInput) (*dto.AllocateBalanceOutput, error)
}

type walletUsecase struct {
	walletRepository      repository.WalletRepository
	idempotencyRepository repository.IdempotencyRepository
}

func NewWalletUsecase(repo repository.WalletRepository, idempotencyRepo repository.IdempotencyRepository) WalletUsecase {
	return &walletUsecase{
		walletRepository:      repo,
		idempotencyRepository: idempotencyRepo,
	}
}

func (u *walletUsecase) CreateWallet(ctx context.Context, in *dto.CreateWalletInput) (*dto.CreateWalletOutput, error) {
	// create dulu walletnya
	newWallet := mapper.CreateWalletInputToWalletModel(in)
	err := u.walletRepository.CreateWallet(ctx, newWallet)
	if err != nil {
		return nil, err
	}

	// tambahin ownernya as a member juga
	newWalletMember := &model.WalletMember{
		ID:              uuid.NewString(),
		Wallet:          *newWallet,
		UserID:          in.OwnerId,
		AllocationLimit: 0,
		AllocationUsed:  0,
	}

	walletMemberErr := u.walletRepository.AddWalletMember(ctx, newWalletMember)
	if walletMemberErr != nil {
		return nil, walletMemberErr
	}

	output := mapper.WalletModelToCreateWalletOutput(newWallet)
	return output, nil
}

func (u *walletUsecase) UpdateWallet(ctx context.Context, in *dto.UpdateWalletInput) (*dto.UpdateWalletOutput, error) {
	// get existing wallet data
	existingWallet, err := u.walletRepository.GetWallet(ctx, in.WalletID)
	if err != nil {
		return nil, err
	}

	// update field that being updated
	for _, field := range in.UpdateFields {
		switch field {
		case "name":
			existingWallet.WalletName = in.WalletName
		case "currency":
			existingWallet.Currency = in.Currency
		}
	}

	// save it using repository
	err = u.walletRepository.UpdateWallet(ctx, existingWallet)
	if err != nil {
		return nil, err
	}

	output := mapper.WalletModelToUpdateWalletOutput(existingWallet)
	return output, nil
}

func (u *walletUsecase) DeleteWallet(ctx context.Context, in *dto.DeleteWalletInput) error {
	//get existing wallet data
	existingWallet, err := u.walletRepository.GetWallet(ctx, in.WalletId)
	if err != nil {
		return err
	}
	// check if the user is the owner of the wallet
	if existingWallet.OwnerID != in.UserId {
		return errors.New("unauthorized to delete this wallet")
	}
	// baru delete dah
	err = u.walletRepository.DeleteWallet(ctx, existingWallet)
	if err != nil {
		return err
	}
	return nil
}

func (u *walletUsecase) GetWallet(ctx context.Context, in *dto.GetWalletInput) (*dto.GetWalletOutput, error) {
	// check if user is a member of the wallet
	userId := ctx.Value("user-id").(string)
	walletMember, err := u.walletRepository.GetWalletMember(ctx, userId)
	if err != nil || walletMember.WalletID != in.WalletId {
		return nil, errors.New("unauthorized to access this wallet")
	}

	// get existing wallet data
	existingWallet, err := u.walletRepository.GetWallet(ctx, in.WalletId)
	if err != nil {
		return nil, err
	}

	// return deh datanya
	output := mapper.WalletModelToGetWalletOutput(existingWallet)
	return output, nil
}

func (u *walletUsecase) ValidateAndDeductBalance(ctx context.Context, in *dto.ValidateAndDeductBalanceInput) (*dto.ValidateAndDeductBalanceOutput, error) {
	// check if user is a member of the wallet
	userId := ctx.Value("user-id").(string)
	walletMember, err := u.walletRepository.GetWalletMember(ctx, userId)
	if err != nil || walletMember.WalletID != in.WalletId {
		return nil, errors.New("unauthorized to access this wallet")
	}
	// check if user have enough balance
	if walletMember.AllocationLimit-walletMember.AllocationUsed < in.Amount {
		return nil, errors.New("insufficient balance")
	}
	// check idempotency key, if the same key already exist then return success without doing anything
	existingResponse, err := u.idempotencyRepository.GetResponseByIdempotencyKey(ctx, in.IdempotencyKey)
	if err != nil {
		return nil, err
	}

	if existingResponse != nil {
		output := &dto.ValidateAndDeductBalanceOutput{}
		if err := json.Unmarshal(existingResponse, output); err != nil {
			return nil, err
		}
		return output, nil
	}

	// if valid then deduct the balance and save it
	walletMember.AllocationUsed += in.Amount
	err = u.walletRepository.UpdateWalletMember(ctx, walletMember)
	if err != nil {
		return nil, err
	}
	u.idempotencyRepository.SaveIdempotencyKey(ctx, in.IdempotencyKey, []byte("{}"))

	return &dto.ValidateAndDeductBalanceOutput{}, nil
}

func (u *walletUsecase) AddMember(ctx context.Context, in *dto.AddMemberInput) (*dto.AddMemberOutput, error) {
	// check if user is owner of the wallet
	existingWallet, err := u.walletRepository.GetWallet(ctx, in.WalletId)
	if err != nil {
		return nil, err
	}

	if existingWallet.OwnerID != in.UserId {
		return nil, errors.New("unauthorized to add member to this wallet")
	}

	// add member
	newWalletMember := &model.WalletMember{
		ID:              uuid.NewString(),
		WalletID:        in.WalletId,
		UserID:          in.UserId,
		AllocationLimit: in.AllocationLimit,
		AllocationUsed:  0,
	}

	err = u.walletRepository.AddWalletMember(ctx, newWalletMember)
	if err != nil {
		return nil, err
	}

	return &dto.AddMemberOutput{}, nil
}

func (u *walletUsecase) GetWalletMembers(ctx context.Context, in *dto.GetWalletMembersInput) (*dto.GetWalletMembersOutput, error) {
	// check if user is a wallet owner or have permission to manage user
	userId := ctx.Value("user-id").(string)
	walletMember, err := u.walletRepository.GetWalletMember(ctx, userId)
	if err != nil || (walletMember.WalletID != in.WalletId || !walletMember.ManageMember) {
		return nil, errors.New("unauthorized to access this wallet")
	}
	// get wallet members
	walletMembers, err := u.walletRepository.GetWalletMembers(ctx, in.WalletId)
	if err != nil {
		return nil, err
	}
	// return wallet members
	return &dto.GetWalletMembersOutput{
		WalletMembers: walletMembers,
	}, nil
}

func (u *walletUsecase) DeleteWalletMember(ctx context.Context, in *dto.DeleteWalletMemberInput) (*dto.DeleteWalletMemberOutput, error) {
	// check if user is a wallet owner or have permission to manage user
	userId := ctx.Value("user-id").(string)
	walletMember, err := u.walletRepository.GetWalletMember(ctx, userId)
	if err != nil || (walletMember.WalletID != in.WalletId || !walletMember.ManageMember) {
		return nil, errors.New("unauthorized to access this wallet")
	}
	// get wallet member
	memberToDelete, err := u.walletRepository.GetWalletMember(ctx, in.MemberId)
	if err != nil {
		return nil, err
	}
	// delete wallet member
	err = u.walletRepository.DeleteWalletMember(ctx, memberToDelete)
	if err != nil {
		return nil, err
	}
	return &dto.DeleteWalletMemberOutput{}, nil
}

func (u *walletUsecase) AllocateBalance(ctx context.Context, in *dto.AllocateBalanceInput) (*dto.AllocateBalanceOutput, error) {
	// check if user is a wallet owner or have permission to manage user
	userId := ctx.Value("user-id").(string)
	walletMember, err := u.walletRepository.GetWalletMember(ctx, userId)
	if err != nil || (walletMember.WalletID != in.WalletID || !walletMember.ManageMember) {
		return nil, errors.New("unauthorized to access this wallet")
	}
	// allocate balance
	err = u.walletRepository.AllocateBalance(ctx, in.WalletID, walletMember, in.AllocationLimit)
	if err != nil {
		return nil, err
	}
	return &dto.AllocateBalanceOutput{}, nil
}
