package mapper

import (
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/dto"
	llmpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/llm_job_service"
)

// ToExtractExpenseRequest maps the HTTP input DTO to the pb.ExtractExpenseRequest.
func ToExtractExpenseRequest(userID string, input dto.ExtractExpenseInput) *llmpb.ExtractExpenseRequest {
	return &llmpb.ExtractExpenseRequest{
		UserId:    userID,
		WalletId:  input.WalletID,
		UserInput: input.UserInput,
	}
}
