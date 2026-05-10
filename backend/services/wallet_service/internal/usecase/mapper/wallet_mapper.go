package mapper

import (
	"github.com/google/uuid"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/pb"
)

func CreateWalletInputToWalletModel(in *dto.CreateWalletInput) *model.Wallet {
	walletId := uuid.NewString()
	return &model.Wallet{
		ID:             walletId,
		WalletName:     in.WalletName,
		OwnerID:        in.OwnerId,
		InitialBalance: in.InitialBalance,
	}
}

func WalletModelToCreateWalletOutput(wallet *model.Wallet) *dto.CreateWalletOutput {
	return &dto.CreateWalletOutput{
		Wallet: wallet,
	}
}

func CreateWalletPbtoCreateWalletInput(in *pb.CreateWalletRequest) *dto.CreateWalletInput {
	return &dto.CreateWalletInput{
		WalletName:     in.GetWalletName(),
		OwnerId:        in.GetOwnerId(),
		InitialBalance: in.GetInitialBalance(),
		Currency:       in.GetCurrency(),
	}
}

func CreateWalletResultToPb(out *dto.CreateWalletOutput) *pb.CreateWalletResponse {
	return &pb.CreateWalletResponse{
		Wallet: &pb.Wallet{
			Id:           out.Wallet.ID,
			Name:         out.Wallet.WalletName,
			OwnerId:      out.Wallet.OwnerID,
			TotalBalance: out.Wallet.InitialBalance,
			Currency:     out.Wallet.Currency,
		},
	}
}

func UpdateWalletPbToUpdateWalletInput(in *pb.UpdateWalletRequest) *dto.UpdateWalletInput {
	return &dto.UpdateWalletInput{
		WalletID:     in.GetWalletId(),
		WalletName:   in.GetWalletName(),
		Currency:     in.GetCurrency(),
		UpdateFields: in.GetUpdateMask().Paths,
	}
}

func UpdateWalletResultToPb(out *dto.UpdateWalletOutput) *pb.UpdateWalletResponse {
	return &pb.UpdateWalletResponse{
		Wallet: &pb.Wallet{
			Id:           out.Wallet.ID,
			Name:         out.Wallet.WalletName,
			OwnerId:      out.Wallet.OwnerID,
			TotalBalance: out.Wallet.InitialBalance,
			Currency:     out.Wallet.Currency,
		},
	}
}

func WalletModelToUpdateWalletOutput(wallet *model.Wallet) *dto.UpdateWalletOutput {
	return &dto.UpdateWalletOutput{
		Wallet: wallet,
	}
}

func WalletModelToGetWalletOutput(wallet *model.Wallet) *dto.GetWalletOutput {
	return &dto.GetWalletOutput{
		Wallet: wallet,
	}
}
