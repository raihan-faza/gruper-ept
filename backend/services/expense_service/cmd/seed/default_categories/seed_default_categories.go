package default_categories

import (
	"log"

	"github.com/raihan-faza/scriptsea-ept/backend/services/expense_service/internal/model"
	"gorm.io/gorm"
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
		if err := db.Create(&model.ExpenseCategory{
			Name:        category.name,
			Description: category.description,
		}).Error; err != nil {
			log.Printf("failed to seed category %s: %v", category.name, err)
		}
	}
}
