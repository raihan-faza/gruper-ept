package server

import (
	"fmt"
	"log"
	"net"
	"os"

	"github.com/joho/godotenv"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/db"
	grpchandler "github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/handler/grpc"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/middleware"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/pb"
	walletPb "github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/pb/wallet_service"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/cmd/seed/default_categories"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
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

func Start() {
	if err := godotenv.Load(); err != nil {
		log.Printf("no .env file found, relying on environment variables: %v", err)
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", os.Getenv("EXPENSE_SERVICE_PORT")))
	if err != nil {
		log.Fatalf("failed to setup port, err: %v", err)
	}

	dbSchema := os.Getenv("DBSCHEMA")
	if dbSchema == "" {
		dbSchema = "public"
	}
	dsn := fmt.Sprintf(
		"host=%v user=%v password=%v dbname=%v port=%v sslmode=%v TimeZone=%v search_path=%v",
		os.Getenv("DBHOST"),
		os.Getenv("DBUSER"),
		os.Getenv("DBPASSWORD"),
		os.Getenv("DBNAME"),
		os.Getenv("DBPORT"),
		os.Getenv("DBSSLMODE"),
		os.Getenv("DBTIMEZONE"),
		dbSchema,
	)
	dbConn, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database, err: %v", err)
	}

	// Ensure schema exists
	if err := dbConn.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", dbSchema)).Error; err != nil {
		log.Fatalf("failed to create schema, err: %v", err)
	}

	// Run migrations
	models := []interface{}{
		&model.Expense{},
		&model.ExpenseCategory{},
	}
	err = dbConn.AutoMigrate(models...)
	if err != nil {
		log.Fatalf("failed to migrate database, err: %v", err)
	}

	// Seed default categories if none exist
	var count int64
	if err := dbConn.Model(&model.ExpenseCategory{}).Count(&count).Error; err == nil && count == 0 {
		log.Println("Database is empty. Seeding default categories...")
		default_categories.SeedDefaultCategories(dbConn)
	}

	walletAddr := getEnv("WALLET_SERVICE_ADDR", "localhost:50051")
	walletConn := mustDial(walletAddr, "wallet-service")
	// Initialize dependencies
	expenseRepository := repository.NewExpenseRepository(dbConn)
	txManager := db.NewTxManager(dbConn)
	walletServiceClient := walletPb.NewWalletServiceClient(walletConn)
	expenseUsecase := usecase.NewExpenseUsecase(expenseRepository, txManager, walletServiceClient)
	expenseServer := grpchandler.NewExpenseServer(expenseUsecase)

	s := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			middleware.LoggerInterceptor,
			middleware.UserIdMetadataInterceptor,
			middleware.ErrorInterceptor,
		),
	)
	pb.RegisterExpenseServiceServer(s, expenseServer)

	log.Printf("Expense service starting on port %s", os.Getenv("EXPENSE_SERVICE_PORT"))
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve, err: %v", err)
	}
}


