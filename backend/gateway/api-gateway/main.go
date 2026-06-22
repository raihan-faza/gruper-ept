package main

import (
	"log"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/endpoint"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/handler"
	expensepb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/expense_service"
	llmpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/llm_job_service"
	reportpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/report_service"
	userpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/user_service"
	walletpb "github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/pb/wallet_service"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func mustDial(addr, name string) *grpc.ClientConn {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		log.Fatalf("failed to connect to %s at %s: %v", name, addr, err)
	}
	return conn
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatal("Error loading .env file")
	}

	// --- gRPC service addresses (override via environment variables) ---
	walletAddr := getEnv("WALLET_SERVICE_ADDR", "localhost:50051")
	expenseAddr := getEnv("EXPENSE_SERVICE_ADDR", "localhost:50052")
	userAddr := getEnv("USER_SERVICE_ADDR", "localhost:50053")
	llmAddr := getEnv("LLM_JOB_SERVICE_ADDR", "localhost:50054")
	reportAddr := getEnv("REPORT_SERVICE_ADDR", "localhost:50055")

	log.Printf("walletAddr: %v", walletAddr)
	log.Printf("expenseAddr: %v", expenseAddr)
	log.Printf("userAddr: %v", userAddr)
	log.Printf("llmAddr: %v", llmAddr)
	log.Printf("reportAddr: %v", reportAddr)

	// --- Establish gRPC connections ---
	walletConn := mustDial(walletAddr, "wallet-service")
	expenseConn := mustDial(expenseAddr, "expense-service")
	userConn := mustDial(userAddr, "user-service")
	llmConn := mustDial(llmAddr, "llm-job-service")
	reportConn := mustDial(reportAddr, "report-service")

	defer func() {
		walletConn.Close()
		expenseConn.Close()
		userConn.Close()
		llmConn.Close()
		reportConn.Close()
	}()

	// --- Build gRPC clients ---
	walletClient := walletpb.NewWalletServiceClient(walletConn)
	expenseClient := expensepb.NewExpenseServiceClient(expenseConn)
	userClient := userpb.NewUserServiceClient(userConn)
	llmClient := llmpb.NewLLMServiceClient(llmConn)
	reportClient := reportpb.NewReportServiceClient(reportConn)

	// --- Wire handler ---
	h := handler.NewHandler(walletClient, expenseClient, userClient, llmClient, reportClient)

	// --- Router setup ---
	r := gin.Default()
	r.Use(corsMiddleware())

	// Health check
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	// API v1 group
	v1 := r.Group("/api/v1")
	{
		endpoint.RegisterUserEndpoints(v1, h)
		endpoint.RegisterWalletEndpoints(v1, h)
		endpoint.RegisterExpenseEndpoints(v1, h)
		endpoint.RegisterReportEndpoints(v1, h)
		endpoint.RegisterLLMEndpoints(v1, h)
	}

	port := getEnv("PORT", ":8080")
	log.Printf("API gateway listening on %s", port)
	if err := r.Run(port); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
