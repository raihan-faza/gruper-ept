package model

import "time"

type Wallet struct {
	ID               string `gorm:"primaryKey"`
	WalletName       string `gorm:"not null"`
	OwnerID          string `gorm:"not null;index"`
	Currency         string `gorm:"not null"`
	InitialBalance   int64
	BalanceAllocated int64
	CreatedAt        time.Time `gorm:"autoCreateTime"`
	UpdatedAt        time.Time `gorm:"autoUpdateTime"`
}

type WalletMember struct {
	ID              string `gorm:"primaryKey"`
	WalletID        string `gorm:"not null;index"`
	UserID          string `gorm:"not null;index"`
	AllocationLimit int64
	AllocationUsed  int64
	ManageMember    bool
	GenerateReport  bool
	Wallet          Wallet    `gorm:"foreignKey:WalletID"`
	CreatedAt       time.Time `gorm:"autoCreateTime"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime"`
}

type WalletTransaction struct {
	ID                string `gorm:"primaryKey"`
	WalletMemberID    string `gorm:"not null;index"`
	WalletID          string `gorm:"not null;index"`
	TransactionAmount int64
	WalletMember      WalletMember `gorm:"foreignKey:WalletMemberID"`
	CreatedAt         time.Time    `gorm:"autoCreateTime"`
	UpdatedAt         time.Time    `gorm:"autoUpdateTime"`
}
