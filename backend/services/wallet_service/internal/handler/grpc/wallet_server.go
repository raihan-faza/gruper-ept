package handler

import (
	"context"
	"log"

	"github.com/google/uuid"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/usecase/dto"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/usecase/mapper"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/utils"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/pb"
	"github.com/samber/lo"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/types/known/emptypb"
	"google.golang.org/protobuf/types/known/timestamppb"
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
	var idempotencyKey string
	var walletId string
	if md, ok := metadata.FromIncomingContext(ctx); ok {
		if keys := md.Get("idempotency_key"); len(keys) > 0 {
			idempotencyKey = keys[0]
		}
		if keys := md.Get("wallet_id"); len(keys) > 0 {
			walletId = keys[0]
		}
	}
	input.IdempotencyKey = idempotencyKey
	input.WalletId = walletId
	res, err := s.walletUsecase.CreateWallet(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.CreateWalletResultToPb(res), nil
}

func (s *WalletServer) UpdateWallet(ctx context.Context, request *pb.UpdateWalletRequest) (*pb.UpdateWalletResponse, error) {
	userID, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}
	input := mapper.UpdateWalletPbToUpdateWalletInput(request)
	input.UserId = userID
	res, err := s.walletUsecase.UpdateWallet(ctx, input)
	if err != nil {
		return nil, err
	}
	return mapper.UpdateWalletResultToPb(res), nil
}

func (s *WalletServer) DeleteWallet(ctx context.Context, request *pb.DeleteWalletRequest) (*emptypb.Empty, error) {
	userID, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}

	err := s.walletUsecase.DeleteWallet(ctx, &dto.DeleteWalletInput{
		WalletId: request.GetWalletId(),
		UserId:   userID,
	})

	if err != nil {
		return nil, err
	}

	return &emptypb.Empty{}, nil
}

func (s *WalletServer) GetWallet(ctx context.Context, request *pb.GetWalletRequest) (*pb.GetWalletResponse, error) {
	userId, err := utils.GetUserIdFromMetadata(ctx)
	if err != nil {
		return nil, err
	}

	res, err := s.walletUsecase.GetWallet(ctx, &dto.GetWalletInput{
		WalletId: request.GetWalletId(),
		UserId:   userId,
	})

	if err != nil {
		return nil, err
	}

	pbMembers := make([]*pb.WalletMember, len(res.Members))
	for i, member := range res.Members {
		pbMembers[i] = &pb.WalletMember{
			WalletId:        member.WalletId,
			UserId:          member.UserId,
			AllocationLimit: member.AllocationLimit,
			AllocationUsed:  member.AllocationUsed,
			Permission: &pb.Permission{
				ManageUser:      member.ManageMember,
				GenerateReport:  member.GenerateReport,
				AllocateBalance: member.AllocateBalance,
			},
		}
	}

	return &pb.GetWalletResponse{
		Wallet: &pb.Wallet{
			Id:           res.Wallet.Id,
			Name:         res.Wallet.WalletName,
			OwnerId:      res.Wallet.OwnerId,
			TotalBalance: res.Wallet.InitialBalance,
			Currency:     res.Wallet.Currency,
		},
		Members: pbMembers,
	}, nil
}

func (s *WalletServer) ValidateAndDeductBalance(ctx context.Context, request *pb.ValidateAndDeductBalanceRequest) (*emptypb.Empty, error) {
	userId, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}
	err := s.walletUsecase.ValidateAndDeductBalance(ctx, &dto.ValidateAndDeductBalanceInput{
		WalletId:       request.GetWalletId(),
		UserId:         userId,
		Amount:         request.GetAmount(),
		IdempotencyKey: request.GetIdempotencyKey(),
	})
	if err != nil {
		return nil, err
	}
	return &emptypb.Empty{}, nil
}

func (s *WalletServer) GetWalletMembers(ctx context.Context, request *pb.GetWalletMembersRequest) (*pb.GetWalletMembersResponse, error) {
	userId, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}
	res, err := s.walletUsecase.GetWalletMembers(ctx, &dto.GetWalletMembersInput{
		WalletId: request.GetWalletId(),
		UserId:   userId,
	})
	if err != nil {
		return nil, err
	}
	return &pb.GetWalletMembersResponse{
		WalletMembers: lo.Map(
			res.WalletMembers,
			func(member *model.WalletMember, _ int) *pb.WalletMember {
				return &pb.WalletMember{
					WalletId:        member.WalletId,
					UserId:          member.UserId,
					AllocationLimit: member.AllocationLimit,
					AllocationUsed:  member.AllocationUsed,
					Permission: &pb.Permission{
						ManageUser:      member.ManageMember,
						GenerateReport:  member.GenerateReport,
						AllocateBalance: member.AllocateBalance,
					},
				}
			},
		),
	}, nil
}

func (s *WalletServer) DeleteWalletMember(ctx context.Context, request *pb.DeleteWalletMemberRequest) (*emptypb.Empty, error) {
	userId, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}
	_, err := s.walletUsecase.DeleteWalletMember(ctx, &dto.DeleteWalletMemberInput{
		WalletId: request.GetWalletId(),
		UserId:   userId,              // the one who makes the request
		MemberId: request.GetUserId(), // the one who is being deleted
	})
	if err != nil {
		return nil, err
	}
	return &emptypb.Empty{}, nil
}

func (s *WalletServer) AllocateBalance(ctx context.Context, request *pb.AllocateBalanceRequest) (*emptypb.Empty, error) {
	userId, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}
	_, err := s.walletUsecase.AllocateBalance(ctx, &dto.AllocateBalanceInput{
		WalletId:        request.GetWalletId(),
		UserId:          userId,
		MemberId:        request.GetUserId(),
		AllocationLimit: request.GetAllocationLimit(),
	})
	if err != nil {
		return nil, err
	}
	return &emptypb.Empty{}, nil
}

func (s *WalletServer) AdjustBalance(ctx context.Context, request *pb.AdjustBalanceRequest) (*pb.AdjustBalanceResponse, error) {
	userId, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}
	res, err := s.walletUsecase.AdjustBalance(ctx, &dto.AdjustBalanceInput{
		WalletId: request.GetWalletId(),
		UserId:   userId,
		Amount:   request.GetAmount(),
	})
	if err != nil {
		return nil, err
	}
	return &pb.AdjustBalanceResponse{
		Wallet: &pb.Wallet{
			Id:           res.WalletId,
			TotalBalance: res.Balance,
		},
	}, nil
}

func (s *WalletServer) GetWalletInvitation(ctx context.Context, request *pb.GetWalletInvitationRequest) (*pb.GetWalletInvitationResponse, error) {
	userId, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}

	res, err := s.walletUsecase.GetWalletInvitation(ctx, &dto.GetWalletInvitationInput{
		WalletId: request.GetWalletId(),
		UserId:   userId,
	})

	if err != nil {
		return nil, err
	}

	if res == nil {
		return nil, nil
	}

	return &pb.GetWalletInvitationResponse{
		WalletInvitation: &pb.WalletInvitation{
			Id:             res.WalletInvitation.Id,
			WalletId:       res.WalletInvitation.WalletId,
			InvitationCode: res.WalletInvitation.InvitationCode,
			CreatedBy:      res.WalletInvitation.CreatedBy,
		},
	}, nil
}

func (s *WalletServer) RegenerateWalletInvitation(ctx context.Context, request *pb.RegenerateWalletInvitationRequest) (*pb.RegenerateWalletInvitationResponse, error) {
	userId, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}
	res, err := s.walletUsecase.RegenerateWalletInvitation(ctx, &dto.RegenerateWalletInvitationInput{
		WalletId: request.GetWalletId(),
		UserId:   userId,
	})
	if err != nil {
		return nil, err
	}
	var invitationId string
	if res.WalletInvitation.Id != "" {
		invitationId = res.WalletInvitation.Id
	} else {
		invitationId = uuid.NewString()
	}
	return &pb.RegenerateWalletInvitationResponse{
		WalletInvitation: &pb.WalletInvitation{
			Id:             invitationId,
			WalletId:       res.WalletInvitation.WalletId,
			InvitationCode: res.WalletInvitation.InvitationCode,
			CreatedBy:      res.WalletInvitation.CreatedBy,
		},
	}, nil
}

func (s *WalletServer) RequestJoinWallet(ctx context.Context, request *pb.RequestJoinWalletRequest) (*pb.RequestJoinWalletResponse, error) {
	userId, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}
	res, err := s.walletUsecase.RequestJoinWallet(ctx, &dto.RequestJoinWalletInput{
		InvitationCode: request.GetInvitationCode(),
		UserId:         userId,
	})
	if err != nil {
		return nil, err
	}
	return &pb.RequestJoinWalletResponse{
		JoinRequestId: res.JoinRequestId,
	}, nil
}

func (s *WalletServer) ApproveJoinRequest(ctx context.Context, request *pb.ApproveJoinRequestRequest) (*emptypb.Empty, error) {
	userId, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}

	permission := dto.Permission{}
	if request.GetPermission() != nil {
		permission.ManageUser = request.GetPermission().GetManageUser()
		permission.AllocateBalance = request.GetPermission().GetAllocateBalance()
		permission.GenerateReport = request.GetPermission().GetGenerateReport()
	}

	ctx = context.WithValue(ctx, "user_id", userId)
	err := s.walletUsecase.ApproveJoinRequest(ctx, &dto.ApproveJoinRequestInput{
		JoinRequestId:   request.GetJoinRequestId(),
		AllocationLimit: request.GetAllocationLimit(),
		Permission:      permission,
		UserId:          userId,
	})
	if err != nil {
		return nil, err
	}
	return &emptypb.Empty{}, nil
}

func (s *WalletServer) RejectJoinRequest(ctx context.Context, request *pb.RejectJoinRequestRequest) (*emptypb.Empty, error) {
	err := s.walletUsecase.RejectJoinRequest(ctx, &dto.RejectJoinRequestInput{
		JoinRequestId: request.GetJoinRequestId(),
	})
	if err != nil {
		return nil, err
	}
	return &emptypb.Empty{}, nil
}

func (s *WalletServer) GetWalletJoinRequests(ctx context.Context, request *pb.GetWalletJoinRequestsRequest) (*pb.GetWalletJoinRequestsResponse, error) {
	userId, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}
	res, err := s.walletUsecase.GetWalletJoinRequests(ctx, &dto.GetWalletJoinRequestsInput{
		WalletId: request.GetWalletId(),
		UserId:   userId,
	})
	if err != nil {
		return nil, err
	}

	var wjrs []*pb.WalletJoinRequest
	for _, wjr := range res.WalletJoinRequests {
		wjrs = append(wjrs, &pb.WalletJoinRequest{
			Id:        wjr.Id,
			WalletId:  wjr.WalletId,
			UserId:    wjr.UserId,
			Status:    mapJoinRequestStatus(wjr.Status),
			CreatedAt: timestamppb.New(wjr.CreatedAt),
		})
	}

	return &pb.GetWalletJoinRequestsResponse{
		WalletJoinRequests: wjrs,
	}, nil
}

func (s *WalletServer) RefundWalletMemberBalance(ctx context.Context, request *pb.RefundWalletMemberBalanceRequest) (*emptypb.Empty, error) {
	// _, metadataErr := utils.GetUserIdFromMetadata(ctx)
	// if metadataErr != nil {
	// 	return nil, metadataErr
	// }
	log.Printf("request: %v", request)
	err := s.walletUsecase.RefundWalletMemberBalance(ctx, &dto.RefundWalletMemberBalanceInput{
		WalletId: request.GetWalletId(),
		UserId:   request.GetUserId(),
		Amount:   request.GetAmount(),
	})
	if err != nil {
		return nil, err
	}
	return &emptypb.Empty{}, nil
}

func (s *WalletServer) GetWalletsByUserId(ctx context.Context, request *pb.GetWalletsByUserIdRequest) (*pb.GetWalletsByUserIdResponse, error) {
	userId, metadataErr := utils.GetUserIdFromMetadata(ctx)
	if metadataErr != nil {
		return nil, metadataErr
	}

	res, err := s.walletUsecase.GetWalletsByUserId(ctx, &dto.GetWalletsByUserIdInput{
		UserId: userId,
	})
	if err != nil {
		return nil, err
	}

	pbWallets := make([]*pb.Wallet, len(res.Wallets))
	for i, w := range res.Wallets {
		pbWallets[i] = &pb.Wallet{
			Id:           w.Id,
			Name:         w.WalletName,
			OwnerId:      w.OwnerId,
			TotalBalance: w.InitialBalance,
			Currency:     w.Currency,
		}
	}

	return &pb.GetWalletsByUserIdResponse{
		Wallets: pbWallets,
	}, nil
}

func (s *WalletServer) GetWalletPendingJoinRequest(ctx context.Context, request *pb.GetWalletPendingJoinRequestRequest) (*pb.GetWalletPendingJoinRequestResponse, error) {
	userId := request.GetUserId()
	if userId == "" {
		var err error
		userId, err = utils.GetUserIdFromMetadata(ctx)
		if err != nil {
			return nil, err
		}
	}

	res, err := s.walletUsecase.GetWalletPendingJoinRequest(ctx, &dto.GetWalletPendingJoinRequestInput{
		UserId: userId,
	})
	if err != nil {
		return nil, err
	}

	var wjrs []*pb.WalletJoinRequest
	for _, wjr := range res.WalletJoinRequests {
		wjrs = append(wjrs, &pb.WalletJoinRequest{
			Id:         wjr.Id,
			WalletId:   wjr.WalletId,
			UserId:     wjr.UserId,
			Status:     mapJoinRequestStatus(wjr.Status),
			CreatedAt:  timestamppb.New(wjr.CreatedAt),
			WalletName: wjr.WalletName,
		})
	}

	return &pb.GetWalletPendingJoinRequestResponse{
		WalletJoinRequests: wjrs,
	}, nil
}

func mapJoinRequestStatus(status string) pb.JoinRequestStatus {
	switch status {
	case "pending":
		return pb.JoinRequestStatus_JOIN_REQUEST_STATUS_PENDING
	case "approved":
		return pb.JoinRequestStatus_JOIN_REQUEST_STATUS_APPROVED
	case "rejected":
		return pb.JoinRequestStatus_JOIN_REQUEST_STATUS_REJECTED
	default:
		return pb.JoinRequestStatus_JOIN_REQUEST_STATUS_UNSPECIFIED
	}
}
