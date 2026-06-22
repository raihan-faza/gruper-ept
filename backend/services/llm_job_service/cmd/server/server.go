package server

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"

	"github.com/joho/godotenv"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/config"
	handler "github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/handler/grpc"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/middleware"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/worker"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/pb"
	expensePb "github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/pb/expense_service"
	"google.golang.org/grpc"
)

func Start(ctx context.Context) {
	if err := godotenv.Load(); err != nil {
		log.Printf("no .env file found, relying on environment variables: %v", err)
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", os.Getenv("LLM_SERVICE_PORT")))
	if err != nil {
		log.Fatalf("failed to setup port, err: %v", err)
	}

	openRouterApi := config.GetAnthropicClient(os.Getenv("OPEN_ROUTER_API_KEY"))
	geminiApi, err := config.GetGeminiClient(ctx, os.Getenv("GEMINI_API_KEY"))
	if err != nil {
		panic(err)
	}

	expenseConn, err := grpc.NewClient(os.Getenv("EXPENSE_SERVICE_ENDPOINT"), grpc.WithInsecure())
	if err != nil {
		panic(err)
	}
	db, err := config.GetDatabase()
	if err != nil {
		panic(err)
	}

	err = db.AutoMigrate(&model.ExtractExpenseJob{})
	if err != nil {
		log.Fatalf("failed to migrate database, err: %v", err)
	}

	expenseClient := expensePb.NewExpenseServiceClient(expenseConn)
	llmRepository := repository.NewLlmRepositoryImpl(db)
	llmUsecase := usecase.NewLLMUsecase(openRouterApi, geminiApi, expenseClient, llmRepository)

	// Start the background polling worker that retries pending/failed jobs.
	jobWorker := worker.NewJobWorker(llmUsecase, llmRepository)
	go jobWorker.Start(ctx)

	llmServer := handler.NewLLMHandler(llmUsecase)

	s := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			middleware.LoggerInterceptor,
			middleware.UserIdMetadataInterceptor,
		),
	)
	pb.RegisterLLMServiceServer(s, llmServer)

	log.Printf("LLM service starting on port %s", os.Getenv("LLM_SERVICE_PORT"))
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve, err: %v", err)
	}
}
