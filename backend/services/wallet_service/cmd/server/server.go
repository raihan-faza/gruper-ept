package server

import (
	"fmt"
	"log"
	"net"
	"os"

	"github.com/joho/godotenv"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/db"
	handler "github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/handler/grpc"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/middleware"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/pb"
	"github.com/redis/go-redis/v9"
	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func MigrateDB(db *gorm.DB) error {
	models := []interface{}{
		&model.Wallet{},
		&model.WalletMember{},
		&model.WalletTransaction{},
		&model.WalletInvitation{},
		&model.WalletJoinRequest{},
	}
	return db.AutoMigrate(models...)
}

func Start() {
	if err := godotenv.Load(); err != nil {
		log.Printf("no .env file found, relying on environment variables: %v", err)
	}

	dbhost := os.Getenv("DBHOST")
	dbuser := os.Getenv("DBUSER")
	dbpassword := os.Getenv("DBPASSWORD")
	dbname := os.Getenv("DBNAME")
	dbport := os.Getenv("DBPORT")
	dbsslmode := os.Getenv("DBSSLMODE")
	dbtimezone := os.Getenv("DBTIMEZONE")

	// 🔍 Log these to see what was actually loaded
	// log.Printf(
	// 	"loaded db config: host=%s user=%s password=%s dbname=%s port=%s sslmode=%s tz=%s",
	// 	dbhost,
	// 	dbuser,
	// 	dbpassword,
	// 	dbname,
	// 	dbport,
	// 	dbsslmode,
	// 	dbtimezone)

	log.Printf("starting grpc")
	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", os.Getenv("WALLET_SERVICE_PORT")))
	if err != nil {
		log.Fatalf("failed to setup port, err: %v", err)
	}

	dsn := fmt.Sprintf(
		"host=%v user=%v password=%v dbname=%v port=%v sslmode=%v TimeZone=%v",
		dbhost, dbuser, dbpassword, dbname, dbport, dbsslmode, dbtimezone,
	)

	log.Printf("establishing database connection")
	dbConn, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database, err: %v", err)
	}

	// Run migrations
	log.Printf("running migration")
	MigrateDB(dbConn)

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
	log.Printf("initializing dependencies")
	walletRepository := repository.NewWalletRepository(dbConn)
	idempotencyRepository := repository.NewIdempotencyRepository(redisClient)

	txManager := db.NewTxManager(dbConn)
	walletUsecase := usecase.NewWalletUsecase(walletRepository, idempotencyRepository, txManager)
	walletServer := handler.NewWalletServer(walletUsecase)

	s := grpc.NewServer(
		grpc.UnaryInterceptor(middleware.LoggerInterceptor),
	)
	pb.RegisterWalletServiceServer(s, walletServer)

	log.Printf("Wallet service starting on port %s", os.Getenv("WALLET_SERVICE_PORT"))
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve, err: %v", err)
	}
}
