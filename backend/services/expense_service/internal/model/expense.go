package model

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"gorm.io/gorm"
)

type ExpenseCategory struct {
	gorm.Model
	UserId      *string
	Name        string
	Description string
}

type ExpenseItem struct {
	ItemName     string
	ItemQuantity int64
	TotalPrice   int64
}

type ExpenseItems []ExpenseItem

func (e ExpenseItems) Value() (driver.Value, error) {
	return json.Marshal(e)
}

func (e *ExpenseItems) Scan(value interface{}) error {
	return json.Unmarshal(value.([]byte), e)
}

type Expense struct {
	Id             string `gorm:"primaryKey"`
	ExpenseName    string
	ExpenseDetails string
	ExpenseItems   ExpenseItems `gorm:"type:jsonb"`
	UserId         string
	WalletId       string
	CategoryId     uint
	Amount         int64
	Status         string
	Date           time.Time
	IdempotencyKey string          `gorm:"type:uuid;not null;uniqueIndex"`
	Category       ExpenseCategory `gorm:"foreignKey:CategoryID;references:ID"`
	CreatedAt      time.Time       `gorm:"autoCreateTime"`
	UpdatedAt      time.Time       `gorm:"autoUpdateTime"`
}
