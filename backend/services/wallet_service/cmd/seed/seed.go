// cmd/seed/seed.go — Run with: go run ./cmd/seed/seed.go
// Inserts correlated test wallets and members using the same user IDs
// defined in user_service/cmd/seed/seed.go.
package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/model"
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
// Wallet IDs
// ---------------------------------------------------------------------------
const (
	walletAlicePersonal = "wa-1111-1111-1111-1111-111111111111" // Alice's personal wallet
	walletSharedTravel  = "wa-2222-2222-2222-2222-222222222222" // Shared travel fund (owner: Alice)
	walletBobPersonal   = "wa-3333-3333-3333-3333-333333333333" // Bob's personal wallet
	walletSharedWork    = "wa-4444-4444-4444-4444-444444444444" // Shared work wallet (owner: Carol)
	walletEvePersonal   = "wa-5555-5555-5555-5555-555555555555" // Eve's personal wallet
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Printf("no .env file found, relying on environment variables: %v", err)
	}

	dsn := fmt.Sprintf(
		"host=%s user=%s password=%s dbname=%s port=%s sslmode=%s TimeZone=%s",
		getenv("DBHOST", "localhost"),
		getenv("DBUSER", "wallet"),
		getenv("DBPASSWORD", "1234"),
		getenv("DBNAME", "wallet_db"),
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

	// Auto-migrate all wallet models
	if err := db.AutoMigrate(
		&model.Wallet{},
		&model.WalletMember{},
		&model.WalletTransaction{},
		&model.WalletInvitation{},
		&model.WalletJoinRequest{},
	); err != nil {
		log.Fatalf("failed to migrate: %v", err)
	}

	seedWallets(db)
	seedMembers(db)
	seedInvitations(db)

	log.Println("Wallet seed complete.")
	printSummary()
}

func seedWallets(db *gorm.DB) {
	log.Println("Seeding wallets ...")

	wallets := []model.Wallet{
		{
			Id:               walletAlicePersonal,
			WalletName:       "Alice Personal",
			OwnerId:          userAlice,
			Currency:         "IDR",
			InitialBalance:   15_000_000,
			BalanceAllocated: 4_500_000,
		},
		{
			Id:               walletSharedTravel,
			WalletName:       "Team Travel Fund",
			OwnerId:          userAlice,
			Currency:         "IDR",
			InitialBalance:   8_000_000,
			BalanceAllocated: 3_200_000,
		},
		{
			Id:               walletBobPersonal,
			WalletName:       "Bob Personal",
			OwnerId:          userBob,
			Currency:         "IDR",
			InitialBalance:   6_000_000,
			BalanceAllocated: 1_750_000,
		},
		{
			Id:               walletSharedWork,
			WalletName:       "Work Expenses",
			OwnerId:          userCarol,
			Currency:         "IDR",
			InitialBalance:   20_000_000,
			BalanceAllocated: 7_800_000,
		},
		{
			Id:               walletEvePersonal,
			WalletName:       "Eve Personal",
			OwnerId:          userEve,
			Currency:         "IDR",
			InitialBalance:   4_500_000,
			BalanceAllocated: 900_000,
		},
	}

	for _, w := range wallets {
		if err := db.Save(&w).Error; err != nil {
			log.Fatalf("failed to save wallet %s: %v", w.WalletName, err)
		}
		log.Printf("  ✓ upserted wallet: %s (%s)", w.WalletName, w.Id)
	}
}

func seedMembers(db *gorm.DB) {
	log.Println("Seeding wallet members ...")

	type memberSeed struct {
		id              string
		walletId        string
		userId          string
		allocationLimit int64
		allocationUsed  int64
		manageMember    bool
		generateReport  bool
		allocateBalance bool
	}

	members := []memberSeed{
		// Alice Personal — only Alice
		{"wm-0001-0001-0001-0001-000000000001", walletAlicePersonal, userAlice, 15_000_000, 4_500_000, true, true, true},

		// Team Travel Fund — Alice (owner), Bob, Carol, Dave
		{"wm-0002-0002-0002-0002-000000000001", walletSharedTravel, userAlice, 8_000_000, 1_200_000, true, true, true},
		{"wm-0002-0002-0002-0002-000000000002", walletSharedTravel, userBob, 2_000_000, 800_000, false, false, false},
		{"wm-0002-0002-0002-0002-000000000003", walletSharedTravel, userCarol, 2_000_000, 700_000, false, true, false},
		{"wm-0002-0002-0002-0002-000000000004", walletSharedTravel, userDave, 2_000_000, 500_000, false, false, false},

		// Bob Personal — only Bob
		{"wm-0003-0003-0003-0003-000000000001", walletBobPersonal, userBob, 6_000_000, 1_750_000, true, true, true},

		// Work Expenses — Carol (owner), Alice, Bob, Eve
		{"wm-0004-0004-0004-0004-000000000001", walletSharedWork, userCarol, 20_000_000, 3_000_000, true, true, true},
		{"wm-0004-0004-0004-0004-000000000002", walletSharedWork, userAlice, 5_000_000, 2_000_000, false, true, false},
		{"wm-0004-0004-0004-0004-000000000003", walletSharedWork, userBob, 5_000_000, 1_500_000, false, false, false},
		{"wm-0004-0004-0004-0004-000000000004", walletSharedWork, userEve, 3_000_000, 1_300_000, false, false, false},

		// Eve Personal — only Eve
		{"wm-0005-0005-0005-0005-000000000001", walletEvePersonal, userEve, 4_500_000, 900_000, true, true, true},
	}

	for _, m := range members {
		record := model.WalletMember{
			Id:              m.id,
			WalletId:        m.walletId,
			UserId:          m.userId,
			AllocationLimit: m.allocationLimit,
			AllocationUsed:  m.allocationUsed,
			ManageMember:    m.manageMember,
			GenerateReport:  m.generateReport,
			AllocateBalance: m.allocateBalance,
		}
		if err := db.Save(&record).Error; err != nil {
			log.Fatalf("failed to save wallet member %s: %v", m.id, err)
		}
		log.Printf("  ✓ upserted member: wallet=%s user=%s", m.walletId, m.userId)
	}
}

func seedInvitations(db *gorm.DB) {
	log.Println("Seeding wallet invitations ...")

	invitations := []model.WalletInvitation{
		{Id: "wi-1111-1111-1111-1111-111111111111", WalletId: walletAlicePersonal, InvitationCode: "ALICE-PERS-2024", CreatedBy: userAlice},
		{Id: "wi-2222-2222-2222-2222-222222222222", WalletId: walletSharedTravel, InvitationCode: "TRAVEL-TEAM-2024", CreatedBy: userAlice},
		{Id: "wi-3333-3333-3333-3333-333333333333", WalletId: walletBobPersonal, InvitationCode: "BOB-PERS-2024", CreatedBy: userBob},
		{Id: "wi-4444-4444-4444-4444-444444444444", WalletId: walletSharedWork, InvitationCode: "WORK-EXP-2024", CreatedBy: userCarol},
		{Id: "wi-5555-5555-5555-5555-555555555555", WalletId: walletEvePersonal, InvitationCode: "EVE-PERS-2024", CreatedBy: userEve},
	}

	for _, inv := range invitations {
		// Use FirstOrCreate to avoid unique-constraint errors on re-runs
		result := db.Where(model.WalletInvitation{WalletId: inv.WalletId}).FirstOrCreate(&inv)
		if result.Error != nil {
			log.Fatalf("failed to seed invitation for wallet %s: %v", inv.WalletId, result.Error)
		}
		if result.RowsAffected > 0 {
			log.Printf("  ✓ created invitation: wallet=%s code=%s", inv.WalletId, inv.InvitationCode)
		} else {
			log.Printf("  ~ skipped invitation (already exists): wallet=%s", inv.WalletId)
		}
	}

	_ = time.Now() // keep time import used
}

func printSummary() {
	fmt.Println()
	fmt.Println("=================================================================")
	fmt.Println("  wallet_service seed complete")
	fmt.Println("-----------------------------------------------------------------")
	fmt.Printf("  %-30s owner: alice\n", "Alice Personal (15 M IDR)")
	fmt.Printf("  %-30s owner: alice  members: alice, bob, carol, dave\n", "Team Travel Fund (8 M IDR)")
	fmt.Printf("  %-30s owner: bob\n", "Bob Personal (6 M IDR)")
	fmt.Printf("  %-30s owner: carol  members: carol, alice, bob, eve\n", "Work Expenses (20 M IDR)")
	fmt.Printf("  %-30s owner: eve\n", "Eve Personal (4.5 M IDR)")
	fmt.Println("=================================================================")
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
