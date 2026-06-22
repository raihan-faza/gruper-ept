package main

import (
	"fmt"
	"log"
	"net"
	"os"

	"github.com/joho/godotenv"
	handler "github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/handler/grpc"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/middleware"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/model"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/pb"
	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	log.Printf("starting server")
	if err := godotenv.Load(); err != nil {
		log.Printf("no .env file found, relying on environment variables: %v", err)
	}
	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", os.Getenv("SERVER_PORT")))
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
	log.Printf("connecting to db: %v", dsn)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	log.Printf("connected, doing auto migrate")
	// Auto-migrate to ensure table exists
	if err := db.AutoMigrate(&model.UserProfile{}); err != nil {
		log.Fatalf("failed to migrate: %v", err)
	}

	repository := repository.NewUserRepository(db)
	usecase := usecase.NewUserUsecase(repository)

	log.Printf("creating grpc server")
	s := grpc.NewServer(
		grpc.UnaryInterceptor(middleware.LoggerInterceptor),
	)
	pb.RegisterUserServiceServer(s, handler.NewUserHandler(usecase))
	log.Printf("server running at %v", os.Getenv("SERVER_PORT"))
	s.Serve(lis)
}
