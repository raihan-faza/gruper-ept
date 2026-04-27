package server

import (
	"fmt"
	"log"
	"net"
	"os"

	"github.com/joho/godotenv"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/db"
	grpchandler "github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/handler/grpc"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/pb"
	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Start() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("failed to load env, err: %v", err)
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", os.Getenv("EXPENSE_SERVICE_PORT")))
	if err != nil {
		log.Fatalf("failed to setup port, err: %v", err)
	}

	dsn := fmt.Sprintf(
		"host=%v user=%v password=%v dbname=%v port=%v sslmode=%v TimeZone=%v",
		os.Getenv("DBHOST"),
		os.Getenv("DBUSER"),
		os.Getenv("DBPASSWORD"),
		os.Getenv("DBNAME"),
		os.Getenv("DBPORT"),
		os.Getenv("DBSSLMODE"),
		os.Getenv("DBTIMEZONE"),
	)
	dbConn, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database, err: %v", err)
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

	// Initialize dependencies
	expenseRepository := repository.NewExpenseRepository(dbConn)
	txManager := db.NewTxManager(dbConn)
	expenseUsecase := usecase.NewExpenseUsecase(expenseRepository, txManager)
	expenseServer := grpchandler.NewExpenseServer(expenseUsecase)

	s := grpc.NewServer()
	pb.RegisterExpenseServiceServer(s, expenseServer)

	log.Printf("Expense service starting on port %s", os.Getenv("EXPENSE_SERVICE_PORT"))
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve, err: %v", err)
	}
}
