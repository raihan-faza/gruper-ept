package model

import (
	"time"

	"gorm.io/gorm"
)

type Expense struct {
	Id         string `gorm:"primaryKey"`
	UserId     string
	WalletId   string
	CategoryId string
	Amount     int64
	Status     string
	CreatedAt  time.Time `gorm:"autoCreateTime"`
	UpdatedAt  time.Time `gorm:"autoUpdateTime"`
}

type ExpenseCategory struct {
	gorm.Model
	UserId      string
	Name        string
	Description string
}
