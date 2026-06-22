// cmd/seed/seed.go — Run with: go run ./cmd/seed/seed.go
// Inserts 5 correlated test users into the user_service database.
// The same user IDs are reused in wallet_service and expense_service seeds.
package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ---------------------------------------------------------------------------
// Shared seed IDs — must match wallet_service/cmd/seed/seed.go
//                   and expense_service/cmd/seed/seed.go
// ---------------------------------------------------------------------------

func strPtr(s string) *string {
	return &s
}

var users = []struct {
	ID          string
	Username    string
	FirstName   string
	LastName    string
	PhoneNumber *string
}{
	{
		ID:          "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
		Username:    "alice",
		FirstName:   "Alice",
		LastName:    "Santoso",
		PhoneNumber: strPtr("+6281210000001"),
	},
	{
		ID:          "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
		Username:    "bob",
		FirstName:   "Bob",
		LastName:    "Pratama",
		PhoneNumber: strPtr("+6281210000002"),
	},
	{
		ID:          "cccccccc-cccc-cccc-cccc-cccccccccccc",
		Username:    "carol",
		FirstName:   "Carol",
		LastName:    "Wijaya",
		PhoneNumber: strPtr("+6281210000003"),
	},
	{
		ID:          "dddddddd-dddd-dddd-dddd-dddddddddddd",
		Username:    "dave",
		FirstName:   "Dave",
		LastName:    "Nugroho",
		PhoneNumber: strPtr("+6281210000004"),
	},
	{
		ID:          "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
		Username:    "eve",
		FirstName:   "Eve",
		LastName:    "Rahayu",
		PhoneNumber: strPtr("+6281210000005"),
	},
}

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("no .env file found, relying on environment variables: %v", err)
	}

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		getenv("DBHOST", "localhost"),
		getenv("DBUSER", "user"),
		getenv("DBPASSWORD", "1234"),
		getenv("DBNAME", "user_service_db"),
		getenv("DBPORT", "5432"),
		getenv("DBSSLMODE", "disable"),
		getenv("DBTIMEZONE", "Asia/Jakarta"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	// Auto-migrate to ensure table exists
	if err := db.AutoMigrate(&model.UserProfile{}); err != nil {
		log.Fatalf("failed to migrate: %v", err)
	}

	log.Println("Seeding users ...")
	for _, u := range users {
		record := model.UserProfile{
			ID:          u.ID,
			Username:    u.Username,
			FirstName:   u.FirstName,
			LastName:    u.LastName,
			PhoneNumber: u.PhoneNumber,
		}

		// Use Save so it upserts (insert or update by primary key)
		if err := db.Save(&record).Error; err != nil {
			log.Fatalf("failed to save user %s: %v", u.Username, err)
		}
		log.Printf("  ✓ upserted user: %s (%s)", u.Username, u.ID)
	}

	log.Println("User seed complete.")
	printSummary()
}

func printSummary() {
	fmt.Println()
	fmt.Println("=================================================================")
	fmt.Println("  user_service seed complete")
	fmt.Println("-----------------------------------------------------------------")
	for _, u := range users {
		fmt.Printf("  %-10s  id: %s\n", u.Username, u.ID)
	}
	fmt.Println("=================================================================")
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
