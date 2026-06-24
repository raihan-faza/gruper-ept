package usecase

import (
	"context"
	"errors"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/constant"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/db"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/usecase/mapper"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/utils"
	"gorm.io/gorm"
)

type WalletUsecase interface {
	CreateWallet(ctx context.Context, in *dto.CreateWalletInput) (*dto.CreateWalletOutput, error)
	UpdateWallet(ctx context.Context, in *dto.UpdateWalletInput) (*dto.UpdateWalletOutput, error)
	DeleteWallet(ctx context.Context, in *dto.DeleteWalletInput) error
	GetWallet(ctx context.Context, in *dto.GetWalletInput) (*dto.GetWalletOutput, error)
	ValidateAndDeductBalance(ctx context.Context, in *dto.ValidateAndDeductBalanceInput) error
	GetWalletMembers(ctx context.Context, in *dto.GetWalletMembersInput) (*dto.GetWalletMembersOutput, error)
	DeleteWalletMember(ctx context.Context, in *dto.DeleteWalletMemberInput) (*dto.DeleteWalletMemberOutput, error)
	AllocateBalance(ctx context.Context, in *dto.AllocateBalanceInput) (*dto.AllocateBalanceOutput, error)
	AdjustBalance(ctx context.Context, in *dto.AdjustBalanceInput) (*dto.AdjustBalanceOutput, error)
	GetWalletInvitation(ctx context.Context, in *dto.GetWalletInvitationInput) (*dto.GetWalletInvitationOutput, error)
	RegenerateWalletInvitation(ctx context.Context, in *dto.RegenerateWalletInvitationInput) (*dto.RegenerateWalletInvitationOutput, error)
	RequestJoinWallet(ctx context.Context, in *dto.RequestJoinWalletInput) (*dto.RequestJoinWalletOutput, error)
	ApproveJoinRequest(ctx context.Context, in *dto.ApproveJoinRequestInput) error
	RejectJoinRequest(ctx context.Context, in *dto.RejectJoinRequestInput) error
	GetWalletJoinRequests(ctx context.Context, in *dto.GetWalletJoinRequestsInput) (*dto.GetWalletJoinRequestsOutput, error)
	GetWalletPendingJoinRequest(ctx context.Context, in *dto.GetWalletPendingJoinRequestInput) (*dto.GetWalletPendingJoinRequestOutput, error)
	RefundWalletMemberBalance(ctx context.Context, in *dto.RefundWalletMemberBalanceInput) error
	GetWalletsByUserId(ctx context.Context, in *dto.GetWalletsByUserIdInput) (*dto.GetWalletsByUserIdOutput, error)
}

type walletUsecase struct {
	walletRepository      repository.WalletRepository
	idempotencyRepository repository.IdempotencyRepository
	txManager             db.TxManager
}

func NewWalletUsecase(repo repository.WalletRepository, idempotencyRepo repository.IdempotencyRepository, txManager db.TxManager) WalletUsecase {
	return &walletUsecase{
		walletRepository:      repo,
		idempotencyRepository: idempotencyRepo,
		txManager:             txManager,
	}
}

func (u *walletUsecase) CreateWallet(
	ctx context.Context,
	in *dto.CreateWalletInput,
) (*dto.CreateWalletOutput, error) {
	if in.WalletId != "" {
		existingWallet, err := u.walletRepository.GetWallet(ctx, in.WalletId)
		if err == nil && existingWallet != nil {
			return &dto.CreateWalletOutput{
				Wallet: existingWallet,
			}, nil
		}
	}

	var newWallet *model.Wallet

	err := u.txManager.WithTransaction(
		ctx,
		func(txCtx context.Context) error {
			newWallet = mapper.CreateWalletInputToWalletModel(in)

			if err := u.walletRepository.CreateWallet(
				txCtx,
				newWallet,
			); err != nil {
				return err
			}

			newWalletMember := &model.WalletMember{
				Id:              uuid.NewString(),
				WalletId:        newWallet.Id,
				UserId:          in.OwnerId,
				AllocationLimit: 0,
				AllocationUsed:  0,
				ManageMember:    true,
				GenerateReport:  true,
				AllocateBalance: true,
			}

			if err := u.walletRepository.CreateWalletMember(
				txCtx,
				newWalletMember,
			); err != nil {
				return err
			}

			return nil
		},
	)

	if err != nil {
		return nil, err
	}

	return mapper.WalletModelToCreateWalletOutput(newWallet), nil
}

func (u *walletUsecase) UpdateWallet(ctx context.Context, in *dto.UpdateWalletInput) (*dto.UpdateWalletOutput, error) {
	// get existing wallet data
	existingWallet, err := u.walletRepository.GetWallet(ctx, in.WalletId)

	if err != nil {
		return nil, err
	}
	userId := ctx.Value("user_id").(string)
	if userId == "" {
		log.Printf("WalletService.usecase.UdateWallet(): empty userId in metadata")
		return nil, errors.New("WalletService.usecase.UpdateWallet(): unauthorized to update this wallet")
	}

	if existingWallet.OwnerId != userId {
		log.Printf("WalletService.usecase.UpdateWallet(): unauthorized access from user %s to wallet %s", in.UserId, in.WalletId)
		return nil, errors.New("WalletService.usecase.UpdateWallet(): unauthorized to update this wallet")
	}

	// update field that being updated
	for _, field := range in.UpdateFields {
		switch field {
		case "name", "wallet_name":
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
	userId := ctx.Value("user_id").(string)
	if userId == "" {
		log.Printf("WalletService.usecase.UdateWallet(): empty userId in metadata")
		return errors.New("WalletService.usecase.DeleteWallet(): unauthorized to delete this wallet")
	}

	//get existing wallet data
	existingWallet, err := u.walletRepository.GetWallet(ctx, in.WalletId)
	if err != nil {
		return err
	}

	// check if the user is the owner of the wallet
	if existingWallet.OwnerId != userId {
		log.Printf("WalletService.usecase.DeleteWallet(): unauthorized access from user %s to wallet %s", in.UserId, in.WalletId)
		return errors.New("WalletService.usecase.DeleteWallet(): unauthorized to delete this wallet")
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
	walletMember, err := u.walletRepository.GetWalletMember(ctx, in.UserId, in.WalletId)
	if err != nil || walletMember.WalletId != in.WalletId || walletMember == nil {
		log.Printf("WalletService.usecase.GetWallet(): unauthorized access from user %s to wallet %s", in.UserId, in.WalletId)
		return nil, errors.New("WalletService.usecase.GetWallet(): unauthorized to access this wallet")
	}

	// get existing wallet data
	existingWallet, err := u.walletRepository.GetWallet(ctx, in.WalletId)
	if err != nil {
		log.Printf("WalletService.usecase.GetWallet(): failed to get wallet from database, err: %v", err)
		return nil, err
	}

	// get wallet members
	walletMembers, err := u.walletRepository.GetWalletMembers(ctx, in.WalletId)
	if err != nil {
		log.Printf("WalletService.usecase.GetWallet(): failed to get wallet members from database, err: %v", err)
		return nil, err
	}

	// return deh datanya
	output := mapper.WalletModelToGetWalletOutput(existingWallet, walletMembers)
	return output, nil
}

func (u *walletUsecase) ValidateAndDeductBalance(ctx context.Context, in *dto.ValidateAndDeductBalanceInput) error {
	// check if user is a member of the wallet
	walletMember, err := u.walletRepository.GetWalletMember(ctx, in.UserId, in.WalletId)
	if err != nil || walletMember == nil {
		log.Printf("WalletService.usecase.ValidateAndDeductBalance(): unauthorized access from user %s to wallet %s", in.UserId, in.WalletId)
		return errors.New("WalletService.usecase.ValidateAndDeductBalance(): unauthorized to access this wallet")
	}
	// check if user have enough balance
	if walletMember.AllocationLimit-walletMember.AllocationUsed < in.Amount {
		log.Printf("WalletService.usecase.ValidateAndDeductBalance(): insufficient balance for user %s in wallet %s", in.UserId, in.WalletId)
		return errors.New("WalletService.usecase.ValidateAndDeductBalance(): insufficient balance")
	}
	// check idempotency key, if the same key already exist then return success without doing anything
	existingResponse, err := u.idempotencyRepository.GetResponseByIdempotencyKey(ctx, in.IdempotencyKey)
	if err != nil {
		log.Printf("WalletService.usecase.ValidateAndDeductBalance(): failed to get idempotency key from database, err: %v", err)
		return err
	}

	if existingResponse != nil {
		return nil
	}

	// if valid then deduct the balance and save it
	walletMember.AllocationUsed += in.Amount
	err = u.walletRepository.UpdateWalletMember(ctx, walletMember)
	if err != nil {
		log.Printf("WalletService.usecase.ValidateAndDeductBalance(): failed to update wallet member, err: %v", err)
		return err
	}
	u.idempotencyRepository.SaveIdempotencyKey(ctx, in.IdempotencyKey, []byte("{}"))

	return nil
}

func (u *walletUsecase) GetWalletMembers(ctx context.Context, in *dto.GetWalletMembersInput) (*dto.GetWalletMembersOutput, error) {
	// check if user is a wallet owner or have permission to manage user
	walletMember, err := u.walletRepository.GetWalletMember(ctx, in.UserId, in.WalletId)
	if err != nil || walletMember == nil || (walletMember.WalletId != in.WalletId || !walletMember.ManageMember) {
		log.Printf("WalletService.usecase.GetWalletMembers(): unauthorized access from user %s to wallet %s", in.UserId, in.WalletId)
		return nil, errors.New("WalletService.usecase.GetWalletMembers(): unauthorized to access this wallet")
	}
	// get wallet members
	walletMembers, err := u.walletRepository.GetWalletMembers(ctx, in.WalletId)
	if err != nil {
		log.Printf("WalletService.usecase.GetWalletMembers(): failed to get wallet members, err: %v", err)
		return nil, err
	}
	// return wallet members
	return &dto.GetWalletMembersOutput{
		WalletMembers: walletMembers,
	}, nil
}

func (u *walletUsecase) DeleteWalletMember(ctx context.Context, in *dto.DeleteWalletMemberInput) (*dto.DeleteWalletMemberOutput, error) {
	// check if user is a wallet owner or have permission to manage user
	walletMember, err := u.walletRepository.GetWalletMemberByUserID(ctx, in.WalletId, in.UserId)
	if err != nil || !walletMember.ManageMember {
		return nil, errors.New("unauthorized to access this wallet")
	}
	// get wallet member
	memberToDelete, err := u.walletRepository.GetWalletMemberByUserID(ctx, in.WalletId, in.MemberId)
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
	var output *dto.AllocateBalanceOutput
	err := u.txManager.WithTransaction(ctx, func(txCtx context.Context) error {
		// check if user is a wallet owner or have permission to manage user
		walletMember, err := u.walletRepository.GetWalletMemberByUserID(txCtx, in.WalletId, in.UserId)
		if err != nil || !walletMember.ManageMember {
			log.Printf("WalletService.usecase.AllocateBalance(): unauthorized access from user %s to wallet %s", in.UserId, in.WalletId)
			return errors.New("WalletService.usecase.AllocateBalance(): unauthorized to access this wallet")
		}

		// get the target member
		targetMember, err := u.walletRepository.GetWalletMemberByUserID(txCtx, in.WalletId, in.MemberId)
		if err != nil {
			log.Printf("WalletService.usecase.AllocateBalance(): failed to get wallet member, err: %v", err)
			return err
		}

		// allocate balance
		err = u.walletRepository.AllocateBalance(txCtx, in.WalletId, targetMember, in.AllocationLimit)
		if err != nil {
			log.Printf("WalletService.usecase.AllocateBalace(): failed to allocate balance, err: %v", err)
			return err
		}

		output = &dto.AllocateBalanceOutput{}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return output, nil
}

func (u *walletUsecase) GetWalletInvitation(ctx context.Context, in *dto.GetWalletInvitationInput) (*dto.GetWalletInvitationOutput, error) {
	//check if user is owner or can manage user
	walletMember, err := u.walletRepository.GetWalletMember(ctx, in.UserId, in.WalletId)
	if err != nil || walletMember == nil || (walletMember.WalletId != in.WalletId || !walletMember.ManageMember) {
		log.Printf("WalletService.usecase.GetWalletInvitation(): unauthorized access from user %s to wallet %s", in.UserId, in.WalletId)
		return nil, errors.New("unauthorized to access this wallet")
	}
	// get wallet invitation
	walletInvitation, err := u.walletRepository.GetWalletInvitation(ctx, in.WalletId)
	if err != nil {
		log.Printf("WalletService.usecase.GetWalletInvitation(): failed to get wallet invitation, err: %v", err)
		return nil, err
	}

	if walletInvitation == nil {
		return nil, nil
	}

	// return wallet invitation
	return &dto.GetWalletInvitationOutput{
		WalletInvitation: walletInvitation,
	}, nil
}

func (u *walletUsecase) RegenerateWalletInvitation(ctx context.Context, in *dto.RegenerateWalletInvitationInput) (*dto.RegenerateWalletInvitationOutput, error) {
	// check if user is owner or can manage user
	walletMember, err := u.walletRepository.GetWalletMember(ctx, in.UserId, in.WalletId)
	if err != nil || walletMember == nil || (walletMember.WalletId != in.WalletId || !walletMember.ManageMember) {
		log.Printf("WalletService.usecase.RegenerateWalletInvitation(): unauthorized access from user %s to wallet %s", in.UserId, in.WalletId)
		return nil, errors.New("unauthorized to access this wallet")
	}

	// get current wallet invitation
	walletInvitation, err := u.walletRepository.GetWalletInvitation(ctx, in.WalletId)
	if err != nil {
		log.Printf("WalletService.usecase.RegenerateWalletInvitation(): failed to get wallet invitation, err: %v", err)
		return nil, err
	}

	if walletInvitation == nil {
		walletInvitation = &model.WalletInvitation{
			Id:        uuid.NewString(),
			WalletId:  in.WalletId,
			CreatedBy: in.UserId,
		}
	}

	// change the invitation code
	walletInvitation.InvitationCode = utils.GenerateRandomString(10)

	// save
	err = u.walletRepository.UpdateWalletInvitation(ctx, walletInvitation)
	if err != nil {
		log.Printf("WalletService.usecase.RegenerateWalletInvitation(): failed to update wallet invitation")
		return nil, err
	}
	return &dto.RegenerateWalletInvitationOutput{WalletInvitation: walletInvitation}, nil
}

func (u *walletUsecase) RequestJoinWallet(ctx context.Context, in *dto.RequestJoinWalletInput) (*dto.RequestJoinWalletOutput, error) {
	// check if a wallet invitation is a valid invitation
	walletInvitation, err := u.walletRepository.GetWalletInvitationByCode(ctx, in.InvitationCode)

	if err != nil {
		log.Printf("WalletService.usecase.RequestJoinWallet(): failed to get wallet invitation, err: %v", err)
		return nil, err
	}

	if walletInvitation == nil {
		return nil, errors.New("invalid invitation code")
	}

	JoinRequestId := uuid.NewString()
	createErr := u.walletRepository.CreateWalletJoinRequest(ctx, &model.WalletJoinRequest{
		Id:       JoinRequestId,
		WalletId: walletInvitation.WalletId,
		UserId:   in.UserId,
		Status:   constant.JoinRequestPending,
	})

	if createErr != nil {
		return nil, createErr
	}

	return &dto.RequestJoinWalletOutput{
		JoinRequestId: JoinRequestId,
	}, nil
}

func (u *walletUsecase) ApproveJoinRequest(ctx context.Context, in *dto.ApproveJoinRequestInput) error {
	userId := ctx.Value("user_id").(string)
	if userId == "" {
		log.Printf("WalletService.usecase.UdateWallet(): empty userId in metadata")
		return errors.New("WalletService.usecase.UpdateWallet(): unauthorized to update this wallet")
	}

	// check if the join request is exists
	walletJoinRequest, err := u.walletRepository.GetWalletJoinRequest(ctx, in.JoinRequestId)
	if err != nil {
		log.Printf("WalletService.usecase.ApproveJoinRequest(): failed to get wallet join request, err: %v", err)
		return err
	}

	if walletJoinRequest == nil {
		log.Printf("WalletService.usecase.ApproveJoinRequest(): failed to get wallet join request, err: %v", err)
		return errors.New("join request not found")
	}

	// check if user is owner or can manage user
	walletMember, err := u.walletRepository.GetWalletMember(ctx, userId, walletJoinRequest.WalletId)

	if err != nil {
		return err
	}

	if !walletMember.ManageMember {
		return errors.New("unauthorized to access this wallet")
	}

	// check if the request is belongs to the wallet owned by the owner
	if walletJoinRequest.WalletId != walletMember.WalletId {
		log.Printf("WalletService.usecase.ApproveJoinRequest(): unauthorized to access this wallet")
		return errors.New("unauthorized to access this wallet")
	}

	// check if user already a wallet member
	walletMember, walletMemberCheckErr := u.walletRepository.GetWalletMember(ctx, walletJoinRequest.UserId, walletJoinRequest.WalletId)

	if walletMemberCheckErr != nil && walletMemberCheckErr != gorm.ErrRecordNotFound {
		log.Printf("WalletService.usecase.ApproveJoinRequest(): failed to get wallet member, err: %v", err)
		return walletMemberCheckErr
	}

	if walletMember != nil {
		log.Printf("WalletService.usecase.ApproveJoinRequest(): user is already a member of this wallet")
		return errors.New("user is already a member of this wallet")
	}

	txErr := u.txManager.WithTransaction(ctx, func(ctx context.Context) error {
		// create new wallet member
		walletMemberId := uuid.NewString()
		err := u.walletRepository.CreateWalletMember(ctx, &model.WalletMember{
			Id:              walletMemberId,
			WalletId:        walletJoinRequest.WalletId,
			UserId:          walletJoinRequest.UserId,
			AllocationLimit: in.AllocationLimit,
			ManageMember:    in.Permission.ManageUser,
			GenerateReport:  in.Permission.GenerateReport,
			AllocateBalance: in.Permission.AllocateBalance,
		})

		if err != nil {
			log.Printf("WalletService.usecase.ApproveJoinRequest(): failed to create wallet member, err: %v", err)
			return err
		}

		// update join request
		walletJoinRequest.Status = constant.JoinRequestApproved
		walletJoinRequest.UpdatedAt = time.Now()
		err = u.walletRepository.UpdateWalletJoinRequest(ctx, walletJoinRequest)

		if err != nil {
			log.Printf("WalletService.usecase.ApproveJoinRequest(): failed to update wallet join request, err: %v", err)
			return err
		}

		return nil
	})

	return txErr
}

func (u *walletUsecase) RejectJoinRequest(ctx context.Context, in *dto.RejectJoinRequestInput) error {
	RejectErr := u.walletRepository.UpdateWalletJoinRequest(ctx, &model.WalletJoinRequest{
		Id:        in.JoinRequestId,
		Status:    constant.JoinRequestRejected,
		UpdatedAt: time.Now(),
	})
	if RejectErr != nil {
		log.Printf("WalletService.usecase.RejectJoinRequest(): failed to update wallet join request, err: %v", RejectErr)
		return RejectErr
	}
	return nil
}

func (u *walletUsecase) GetWalletJoinRequests(ctx context.Context, in *dto.GetWalletJoinRequestsInput) (*dto.GetWalletJoinRequestsOutput, error) {
	WalletJoinRequests, err := u.walletRepository.GetWalletJoinRequests(ctx, in.WalletId)
	if err != nil {
		log.Printf("WalletService.usecase.GetWalletJoinRequests(): failed to get wallet join requests, err: %v", err)
		return nil, err
	}

	var wjrs []*dto.WalletJoinRequest
	for _, wjr := range WalletJoinRequests {
		wjrs = append(wjrs, &dto.WalletJoinRequest{
			Id:        wjr.Id,
			WalletId:  wjr.WalletId,
			UserId:    wjr.UserId,
			Status:    wjr.Status,
			CreatedAt: wjr.CreatedAt,
		})
	}

	return &dto.GetWalletJoinRequestsOutput{
		WalletJoinRequests: wjrs,
	}, nil
}

func (u *walletUsecase) GetWalletPendingJoinRequest(ctx context.Context, in *dto.GetWalletPendingJoinRequestInput) (*dto.GetWalletPendingJoinRequestOutput, error) {
	WalletJoinRequests, err := u.walletRepository.GetPendingWalletJoinRequestsByUserID(ctx, in.UserId)
	if err != nil {
		log.Printf("WalletService.usecase.GetWalletPendingJoinRequest(): failed to get pending wallet join requests, err: %v", err)
		return nil, err
	}

	var wjrs []*dto.WalletJoinRequest
	for _, wjr := range WalletJoinRequests {
		wjrs = append(wjrs, &dto.WalletJoinRequest{
			Id:         wjr.Id,
			WalletId:   wjr.WalletId,
			UserId:     wjr.UserId,
			Status:     wjr.Status,
			WalletName: wjr.Wallet.WalletName,
			CreatedAt:  wjr.CreatedAt,
		})
	}

	return &dto.GetWalletPendingJoinRequestOutput{
		WalletJoinRequests: wjrs,
	}, nil
}

func (u *walletUsecase) AdjustBalance(ctx context.Context, in *dto.AdjustBalanceInput) (*dto.AdjustBalanceOutput, error) {
	// get existing wallet data
	existingWallet, err := u.walletRepository.GetWallet(ctx, in.WalletId)
	if err != nil {
		log.Printf("WalletService.usecase.AdjustBalance(): failed to get wallet, err: %v", err)
		return nil, err
	}

	// check if the user is the owner of the wallet
	if existingWallet.OwnerId != in.UserId {
		log.Printf("WalletService.usecase.AdjustBalance(): unauthorized to adjust this wallet balance")
		return nil, errors.New("unauthorized to adjust this wallet balance")
	}

	// adjust balance using repository
	updatedWallet, err := u.walletRepository.AdjustBalance(ctx, in.WalletId, in.Amount)
	if err != nil {
		log.Printf("WalletService.usecase.AdjustBalance(): failed to adjust balance, err: %v", err)
		return nil, err
	}

	return &dto.AdjustBalanceOutput{
		WalletId: updatedWallet.Id,
		Balance:  updatedWallet.InitialBalance,
	}, nil
}

func (u *walletUsecase) RefundWalletMemberBalance(ctx context.Context, in *dto.RefundWalletMemberBalanceInput) error {
	// check if user is a member
	walletMember, err := u.walletRepository.GetWalletMember(ctx, in.UserId, in.WalletId)

	if walletMember == nil || err != nil || walletMember.WalletId != in.WalletId {
		log.Printf("WalletService.usecase.RefundWalletMemberBalance(): unauthorized to access this wallet")
		return errors.New("unauthorized to access this wallet")
	}

	err = u.walletRepository.RefundWalletMemberBalance(ctx, in.UserId, in.WalletId, in.Amount)
	if err != nil {
		log.Printf("WalletService.usecase.RefundWalletMemberBalance(): failed to refund wallet member balance, err: %v", err)
		return err
	}
	return nil
}

func (u *walletUsecase) GetWalletsByUserId(ctx context.Context, in *dto.GetWalletsByUserIdInput) (*dto.GetWalletsByUserIdOutput, error) {
	wallets, err := u.walletRepository.GetWalletsByUserID(ctx, in.UserId)
	if err != nil {
		log.Printf("WalletService.usecase.GetWalletsByUserId(): failed to get wallets by user id, err: %v", err)
		return nil, err
	}
	return &dto.GetWalletsByUserIdOutput{
		Wallets: wallets,
	}, nil
}
