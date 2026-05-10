package handler

import (
	"context"

	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/usecase/mapper"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/pb"
	"google.golang.org/protobuf/types/known/emptypb"
)

type WalletServer struct {
	pb.UnimplementedWalletServiceServer
	walletUsecase usecase.WalletUsecase
}

func NewWalletServer(uc usecase.WalletUsecase) *WalletServer {
	return &WalletServer{
		walletUsecase: uc,
	}
}

func (s *WalletServer) CreateWallet(ctx context.Context, request *pb.CreateWalletRequest) (*pb.CreateWalletResponse, error) {
	input := mapper.CreateWalletPbtoCreateWalletInput(request)
	res, err := s.walletUsecase.CreateWallet(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.CreateWalletResultToPb(res), nil
}

func (s *WalletServer) UpdateWallet(ctx context.Context, request *pb.UpdateWalletRequest) (*pb.UpdateWalletResponse, error) {
	input := mapper.UpdateWalletPbToUpdateWalletInput(request)
	res, err := s.walletUsecase.UpdateWallet(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.UpdateWalletResultToPb(res), nil
}

func (s *WalletServer) DeleteWallet(ctx context.Context, request *pb.DeleteWalletRequest) (*emptypb.Empty, error) {
	panic("not implemented") // TODO: Implement
}

func (s *WalletServer) GetWallet(ctx context.Context, request *pb.GetWalletRequest) (*pb.GetWalletResponse, error) {
	panic("not implemented") // TODO: Implement
}

func (s *WalletServer) ValidateAndDeductBalance(ctx context.Context, request *pb.ValidateAndDeductBalanceRequest) (*emptypb.Empty, error) {
	panic("not implemented") // TODO: Implement
}

func (s *WalletServer) AddMember(ctx context.Context, request *pb.AddMemberRequest) (*emptypb.Empty, error) {
	panic("not implemented") // TODO: Implement
}

func (s *WalletServer) GetWalletMembers(ctx context.Context, request *pb.GetWalletMembersRequest) (*pb.GetWalletMembersResponse, error) {
	panic("not implemented") // TODO: Implement
}

func (s *WalletServer) DeleteWalletMember(ctx context.Context, request *pb.DeleteWalletMemberRequest) (*emptypb.Empty, error) {
	panic("not implemented") // TODO: Implement
}

func (s *WalletServer) AllocateBalance(ctx context.Context, request *pb.AllocateBalanceRequest) (*pb.AllocateBalanceResponse, error) {
	panic("not implemented") // TODO: Implement
}
