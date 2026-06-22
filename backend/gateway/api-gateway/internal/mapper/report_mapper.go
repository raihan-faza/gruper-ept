package mapper

import (
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/dto"
	reportpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/report_service"
)

// ToGenerateReportRequest maps the HTTP input DTO and userID to pb.GenerateReportRequest.
func ToGenerateReportRequest(userID string, input dto.GenerateReportInput) *reportpb.GenerateReportRequest {
	return &reportpb.GenerateReportRequest{
		UserId:       userID,
		WalletId:     input.WalletID,
		DateStart:    input.DateStart,
		DateEnd:      input.DateEnd,
		TemplateName: input.TemplateName,
	}
}

// ToGenerateReportResponseDTO maps pb.GenerateReportResponse to the HTTP response DTO.
func ToGenerateReportResponseDTO(p *reportpb.GenerateReportResponse) dto.GenerateReportResponseDTO {
	if p == nil {
		return dto.GenerateReportResponseDTO{}
	}
	return dto.GenerateReportResponseDTO{
		DownloadURL: p.DownloadUrl,
		Filename:    p.Filename,
		ExpiresAt:   p.ExpiresAt,
	}
}
