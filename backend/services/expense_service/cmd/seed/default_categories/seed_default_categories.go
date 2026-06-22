package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func SeedDefaultCategories(db *gorm.DB) {
	// validCategories holds the accepted category_id uint64 values as defined in the prompt schema.
	// 1=food, 2=transport, 3=utilities, 4=entertainment, 5=health, 6=shopping, 7=other
	categories := []struct {
		id          uint64
		name        string
		description string
	}{
		{
			id:          1,
			name:        "Food & Groceries",
			description: "Food & Groceries",
		},
		{
			id:          2,
			name:        "Transportation",
			description: "Transportation",
		},
		{
			id:          3,
			name:        "Utilities",
			description: "Utilities",
		},
		{
			id:          4,
			name:        "Entertainment",
			description: "Entertainment",
		},
		{
			id:          5,
			name:        "Health",
			description: "Health",
		},
		{
			id:          6,
			name:        "Shopping",
			description: "Shopping",
		},
		{
			id:          7,
			name:        "Other",
			description: "Other",
		},
	}
	for _, category := range categories {
		db.Create(&model.ExpenseCategory{
			Name:        category.name,
			Description: category.description,
		})
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("no .env file found, relying on environment variables: %v", err)
	}

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		getenv("DBHOST", "localhost"),
		getenv("DBUSER", "expense"),
		getenv("DBPASSWORD", "1234"),
		getenv("DBNAME", "expense_service"),
		getenv("DBPORT", "5432"),
		getenv("DBSSLMODE", "disable"),
		getenv("DBTIMEZONE", "UTC"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	SeedDefaultCategories(db)
}
