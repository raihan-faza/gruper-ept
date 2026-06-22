package main

import (
	"context"

	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/cmd/server"
)

func main() {
	ctx := context.Background()
	server.Start(ctx)
}
