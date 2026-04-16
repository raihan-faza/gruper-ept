package cmd

import (
	"fmt"
	"log"
	"net"
	"os"

	"github.com/joho/godotenv"
	handler "github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/handler/grpc"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/usecase"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/pb"
	"google.golang.org/grpc"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalf("failed to load env, err: %v", err)
	}
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", os.Getenv("SERVER_PORT")))
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
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})

	repository := repository.NewUserRepository(db)
	usecase := usecase.NewUserUsecase(repository)

	s := grpc.NewServer()
	pb.RegisterUserServiceServer(s, handler.NewUserHandler(usecase))
	s.Serve(lis)
}
