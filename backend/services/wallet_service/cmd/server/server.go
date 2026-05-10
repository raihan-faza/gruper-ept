package server

import (
	"fmt"
	"log"
	"net"
	"os"

	"github.com/joho/godotenv"
	handler "github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/handler/grpc"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/pb"
	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func MigrateDB() {
	db, err := gorm.Open(sqlite.Open("test.db"), &gorm.Config{})
	if err != nil {
		panic("failed to connect database")
	}
	models := []interface{}{
		&model.Wallet{},
		&model.WalletMember{},
		&model.WalletTransaction{},
	}
	db.AutoMigrate(models...)
}

func Start() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("failed to load env, err: %v", err)
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", os.Getenv("WALLER_SERVICE_PORT")))
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
	MigrateDB()
	redisClient := redis.NewClient(
		&redis.Options{
			Addr: fmt.Sprintf(
				"%s:%s",
				os.Getenv("REDIS_HOST"),
				os.Getenv("REDIS_PORT"),
			),
			Password: os.Getenv("REDIS_PASSWORD"),
			DB:       0,
		},
	)

	// Initialize dependencies
	walletRepository := repository.NewWalletRepository(dbConn)
	idempotencyRepository := repository.NewIdempotencyRepository(redisClient)

	//txManager := db.NewTxManager(dbConn)
	walletUsecase := usecase.NewWalletUsecase(walletRepository, idempotencyRepository)
	walletServer := handler.NewWalletServer(walletUsecase)

	s := grpc.NewServer()
	pb.RegisterWalletServiceServer(s, walletServer)

	log.Printf("Expense service starting on port %s", os.Getenv("WALLET_SERVICE_PORT"))
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve, err: %v", err)
	}
}
