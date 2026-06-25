// cmd/seed/seed.go — Run with: go run ./cmd/seed/seed.go
// Inserts correlated test expense categories and expenses using the same
// user IDs and wallet IDs defined in the other service seed files.
package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/joho/godotenv"
	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/model"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// ---------------------------------------------------------------------------
// Shared user IDs — must match user_service/cmd/seed/seed.go
// ---------------------------------------------------------------------------
const (
	userAlice = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
	userBob   = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb"
	userCarol = "cccccccc-cccc-cccc-cccc-cccccccccccc"
	userDave  = "dddddddd-dddd-dddd-dddd-dddddddddddd"
	userEve   = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
)

// ---------------------------------------------------------------------------
// Wallet IDs — must match wallet_service/cmd/seed/seed.go
// ---------------------------------------------------------------------------
const (
	walletAlicePersonal = "wa-1111-1111-1111-1111-111111111111"
	walletSharedTravel  = "wa-2222-2222-2222-2222-222222222222"
	walletBobPersonal   = "wa-3333-3333-3333-3333-333333333333"
	walletSharedWork    = "wa-4444-4444-4444-4444-444444444444"
	walletEvePersonal   = "wa-5555-5555-5555-5555-555555555555"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("no .env file found, relying on environment variables: %v", err)
	}

	dbSchema := getenv("DBSCHEMA", "expense_service")
	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s search_path=%s",
		getenv("DBHOST", "localhost"),
		getenv("DBUSER", "expense"),
		getenv("DBPASSWORD", "1234"),
		getenv("DBNAME", "expense_service"),
		getenv("DBPORT", "5432"),
		getenv("DBSSLMODE", "disable"),
		getenv("DBTIMEZONE", "UTC"),
		dbSchema,
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	// Ensure schema exists
	if err := db.Exec(fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", dbSchema)).Error; err != nil {
		log.Fatalf("failed to create schema: %v", err)
	}

	// AutoMigrate — categories first (expenses FK → category)
	if err := db.AutoMigrate(
		&model.ExpenseCategory{},
		&model.Expense{},
	); err != nil {
		log.Fatalf("failed to migrate: %v", err)
	}

	catIDs := seedCategories(db)
	seedExpenses(db, catIDs)

	log.Println("Expense seed complete.")
	printSummary()
}

// seedCategories inserts one set of categories per user and returns a
// map[userID][categoryName] → category.ID for use when creating expenses.
func seedCategories(db *gorm.DB) map[string]map[string]uint {
	log.Println("Seeding expense categories ...")

	type catDef struct {
		UserID      string
		Name        string
		Description string
	}

	catNames := []struct{ name, desc string }{
		{"Food & Drinks", "Meals, snacks, and beverages"},
		{"Transport", "Fuel, rides, and public transport"},
		{"Subscriptions", "Monthly digital subscriptions"},
		{"Entertainment", "Movies, games, and outings"},
		{"Accommodation", "Hotels and lodging"},
		{"Office Supplies", "Stationery and equipment"},
	}

	allUsers := []string{userAlice, userBob, userCarol, userDave, userEve}
	result := make(map[string]map[string]uint)

	for _, uid := range allUsers {
		result[uid] = make(map[string]uint)
		for _, c := range catNames {
			cat := model.ExpenseCategory{
				UserId:      &uid,
				Name:        c.name,
				Description: c.desc,
			}
			// FirstOrCreate to avoid duplicates on re-runs
			tx := db.Where(model.ExpenseCategory{UserId: &uid, Name: c.name}).FirstOrCreate(&cat)
			if tx.Error != nil {
				log.Fatalf("failed to seed category %q for user %s: %v", c.name, uid, tx.Error)
			}
			result[uid][c.name] = cat.ID
			log.Printf("  ✓ category [%s] user=%s id=%d", c.name, uid[:8], cat.ID)
		}
	}
	return result
}

func seedExpenses(db *gorm.DB, cats map[string]map[string]uint) {
	log.Println("Seeding expenses ...")

	now := time.Now()
	daysAgo := func(d int) time.Time { return now.AddDate(0, 0, -d) }

	type expDef struct {
		ID             string
		ExpenseName    string
		ExpenseDetails string
		Items          model.ExpenseItems
		UserID         string
		WalletID       string
		CategoryKey    string // maps to cats[userID][categoryKey]
		Amount         int64
		Status         string
		Date           time.Time
	}

	expenses := []expDef{
		// ── Alice Personal ──────────────────────────────────────────────
		{
			ID:          "ex-aa01-0000-0000-0000-000000000001",
			ExpenseName: "Warung Makan Siang", ExpenseDetails: "Lunch at the local warung",
			Items:  model.ExpenseItems{{ItemName: "Nasi campur", ItemQuantity: 1, TotalPrice: 25000}, {ItemName: "Es teh", ItemQuantity: 1, TotalPrice: 5000}},
			UserID: userAlice, WalletID: walletAlicePersonal, CategoryKey: "Food & Drinks",
			Amount: 30000, Status: "completed", Date: daysAgo(45),
		},
		{
			ID:          "ex-aa01-0000-0000-0000-000000000002",
			ExpenseName: "Grab Car", ExpenseDetails: "Office commute",
			Items:  model.ExpenseItems{{ItemName: "Ride fare", ItemQuantity: 1, TotalPrice: 28000}},
			UserID: userAlice, WalletID: walletAlicePersonal, CategoryKey: "Transport",
			Amount: 28000, Status: "completed", Date: daysAgo(40),
		},
		{
			ID:          "ex-aa01-0000-0000-0000-000000000003",
			ExpenseName: "Spotify Premium", ExpenseDetails: "Monthly music subscription",
			Items:  model.ExpenseItems{{ItemName: "Spotify Premium 1 month", ItemQuantity: 1, TotalPrice: 54990}},
			UserID: userAlice, WalletID: walletAlicePersonal, CategoryKey: "Subscriptions",
			Amount: 54990, Status: "completed", Date: daysAgo(30),
		},
		{
			ID:          "ex-aa01-0000-0000-0000-000000000004",
			ExpenseName: "Cinema Night", ExpenseDetails: "Movie with friends",
			Items:  model.ExpenseItems{{ItemName: "Ticket x2", ItemQuantity: 2, TotalPrice: 120000}, {ItemName: "Popcorn", ItemQuantity: 1, TotalPrice: 45000}},
			UserID: userAlice, WalletID: walletAlicePersonal, CategoryKey: "Entertainment",
			Amount: 165000, Status: "completed", Date: daysAgo(20),
		},
		{
			ID:          "ex-aa01-0000-0000-0000-000000000005",
			ExpenseName: "Weekly Groceries", ExpenseDetails: "Supermarket run",
			Items:  model.ExpenseItems{{ItemName: "Vegetables", ItemQuantity: 1, TotalPrice: 75000}, {ItemName: "Chicken", ItemQuantity: 2, TotalPrice: 90000}, {ItemName: "Dairy", ItemQuantity: 1, TotalPrice: 55000}},
			UserID: userAlice, WalletID: walletAlicePersonal, CategoryKey: "Food & Drinks",
			Amount: 220000, Status: "pending", Date: daysAgo(5),
		},

		// ── Team Travel Fund (Alice's expenses) ─────────────────────────
		{
			ID:          "ex-aa02-0000-0000-0000-000000000001",
			ExpenseName: "Flight Jakarta-Bali", ExpenseDetails: "Team retreat flight",
			Items:  model.ExpenseItems{{ItemName: "Economy ticket", ItemQuantity: 2, TotalPrice: 1_400_000}},
			UserID: userAlice, WalletID: walletSharedTravel, CategoryKey: "Transport",
			Amount: 1_400_000, Status: "completed", Date: daysAgo(60),
		},
		{
			ID:          "ex-aa02-0000-0000-0000-000000000002",
			ExpenseName: "Hotel Bali 3 nights", ExpenseDetails: "Kuta beach area hotel",
			Items:  model.ExpenseItems{{ItemName: "Deluxe room x3 nights", ItemQuantity: 3, TotalPrice: 600_000}},
			UserID: userAlice, WalletID: walletSharedTravel, CategoryKey: "Accommodation",
			Amount: 1_800_000, Status: "completed", Date: daysAgo(58),
		},

		// ── Bob Personal ────────────────────────────────────────────────
		{
			ID:          "ex-bb03-0000-0000-0000-000000000001",
			ExpenseName: "Mie Ayam Bakso", ExpenseDetails: "Dinner near the office",
			Items:  model.ExpenseItems{{ItemName: "Mie ayam", ItemQuantity: 2, TotalPrice: 30000}},
			UserID: userBob, WalletID: walletBobPersonal, CategoryKey: "Food & Drinks",
			Amount: 30000, Status: "completed", Date: daysAgo(35),
		},
		{
			ID:          "ex-bb03-0000-0000-0000-000000000002",
			ExpenseName: "TransJakarta Monthly Pass", ExpenseDetails: "Public transit monthly pass",
			Items:  model.ExpenseItems{{ItemName: "Monthly e-money top-up", ItemQuantity: 1, TotalPrice: 100_000}},
			UserID: userBob, WalletID: walletBobPersonal, CategoryKey: "Transport",
			Amount: 100_000, Status: "completed", Date: daysAgo(28),
		},
		{
			ID:          "ex-bb03-0000-0000-0000-000000000003",
			ExpenseName: "Netflix Premium", ExpenseDetails: "Monthly streaming subscription",
			Items:  model.ExpenseItems{{ItemName: "Netflix Premium", ItemQuantity: 1, TotalPrice: 186_000}},
			UserID: userBob, WalletID: walletBobPersonal, CategoryKey: "Subscriptions",
			Amount: 186_000, Status: "completed", Date: daysAgo(15),
		},

		// ── Work Expenses (Carol's expenses) ────────────────────────────
		{
			ID:          "ex-cc04-0000-0000-0000-000000000001",
			ExpenseName: "Team Lunch Q2 Review", ExpenseDetails: "Post-sprint team lunch",
			Items:  model.ExpenseItems{{ItemName: "Set lunch x5", ItemQuantity: 5, TotalPrice: 75_000}},
			UserID: userCarol, WalletID: walletSharedWork, CategoryKey: "Food & Drinks",
			Amount: 375_000, Status: "completed", Date: daysAgo(50),
		},
		{
			ID:          "ex-cc04-0000-0000-0000-000000000002",
			ExpenseName: "Printer Paper & Toner", ExpenseDetails: "Office supplies restock",
			Items:  model.ExpenseItems{{ItemName: "A4 paper x5 ream", ItemQuantity: 5, TotalPrice: 60_000}, {ItemName: "Toner cartridge", ItemQuantity: 1, TotalPrice: 450_000}},
			UserID: userCarol, WalletID: walletSharedWork, CategoryKey: "Office Supplies",
			Amount: 750_000, Status: "completed", Date: daysAgo(42),
		},
		{
			ID:          "ex-cc04-0000-0000-0000-000000000003",
			ExpenseName: "Figma Pro Plan", ExpenseDetails: "Annual design tool subscription",
			Items:  model.ExpenseItems{{ItemName: "Figma Pro annual", ItemQuantity: 1, TotalPrice: 2_000_000}},
			UserID: userCarol, WalletID: walletSharedWork, CategoryKey: "Subscriptions",
			Amount: 2_000_000, Status: "completed", Date: daysAgo(22),
		},
		{
			ID:          "ex-cc04-0000-0000-0000-000000000004",
			ExpenseName: "Team Building Outing", ExpenseDetails: "Go-kart and dinner",
			Items:  model.ExpenseItems{{ItemName: "Go-kart x4", ItemQuantity: 4, TotalPrice: 150_000}, {ItemName: "BBQ dinner", ItemQuantity: 4, TotalPrice: 120_000}},
			UserID: userCarol, WalletID: walletSharedWork, CategoryKey: "Entertainment",
			Amount: 1_080_000, Status: "pending", Date: daysAgo(3),
		},

		// ── Eve Personal ────────────────────────────────────────────────
		{
			ID:          "ex-ee05-0000-0000-0000-000000000001",
			ExpenseName: "Starbucks Coffee", ExpenseDetails: "Morning coffee",
			Items:  model.ExpenseItems{{ItemName: "Iced latte", ItemQuantity: 1, TotalPrice: 58_000}},
			UserID: userEve, WalletID: walletEvePersonal, CategoryKey: "Food & Drinks",
			Amount: 58_000, Status: "completed", Date: daysAgo(10),
		},
		{
			ID:          "ex-ee05-0000-0000-0000-000000000002",
			ExpenseName: "Gojek Rides", ExpenseDetails: "Weekly ride voucher",
			Items:  model.ExpenseItems{{ItemName: "GoRide credit", ItemQuantity: 1, TotalPrice: 100_000}},
			UserID: userEve, WalletID: walletEvePersonal, CategoryKey: "Transport",
			Amount: 100_000, Status: "completed", Date: daysAgo(7),
		},
		{
			ID:          "ex-ee05-0000-0000-0000-000000000003",
			ExpenseName: "Disney+ Hotstar", ExpenseDetails: "Monthly streaming subscription",
			Items:  model.ExpenseItems{{ItemName: "Disney+ monthly", ItemQuantity: 1, TotalPrice: 49_000}},
			UserID: userEve, WalletID: walletEvePersonal, CategoryKey: "Subscriptions",
			Amount: 49_000, Status: "pending", Date: daysAgo(2),
		},
	}

	for _, e := range expenses {
		catID, ok := cats[e.UserID][e.CategoryKey]
		if !ok {
			log.Fatalf("category %q not found for user %s", e.CategoryKey, e.UserID)
		}

		record := model.Expense{
			Id:             e.ID,
			ExpenseName:    e.ExpenseName,
			ExpenseDetails: e.ExpenseDetails,
			ExpenseItems:   e.Items,
			UserId:         e.UserID,
			WalletId:       e.WalletID,
			CategoryId:     catID,
			Amount:         e.Amount,
			Status:         e.Status,
			Date:           e.Date,
			IdempotencyKey: uuid.NewString(),
		}

		if err := db.Save(&record).Error; err != nil {
			log.Fatalf("failed to save expense %s: %v", e.ID, err)
		}
		log.Printf("  ✓ upserted expense: %s (user=%s wallet=%s amount=%d)",
			e.ExpenseName, e.UserID[:8], e.WalletID[:8], e.Amount)
	}
}

func printSummary() {
	fmt.Println()
	fmt.Println("=================================================================")
	fmt.Println("  expense_service seed complete")
	fmt.Println("-----------------------------------------------------------------")
	fmt.Println("  alice  → 5 expenses (Personal) + 2 expenses (Travel Fund)")
	fmt.Println("  bob    → 3 expenses (Personal)")
	fmt.Println("  carol  → 4 expenses (Work)")
	fmt.Println("  eve    → 3 expenses (Personal)")
	fmt.Println("  dave   → (member of Travel Fund, no direct expenses seeded)")
	fmt.Println("=================================================================")
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
