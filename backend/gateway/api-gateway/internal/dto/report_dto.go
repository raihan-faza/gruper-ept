package dto

// GenerateReportInput is the HTTP request body for the GenerateReport endpoint.
type GenerateReportInput struct {
	WalletID     string `json:"wallet_id" binding:"required"`
	DateStart    string `json:"date_start" binding:"required"`
	DateEnd      string `json:"date_end" binding:"required"`
	TemplateName string `json:"template_name" binding:"required"`
}

// GenerateReportResponseDTO is the HTTP response for a successfully generated report.
type GenerateReportResponseDTO struct {
	DownloadURL string `json:"download_url"`
	Filename    string `json:"filename"`
	ExpiresAt   string `json:"expires_at"`
}
