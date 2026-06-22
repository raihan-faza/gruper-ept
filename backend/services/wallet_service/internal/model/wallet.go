package model

import "time"

type Wallet struct {
	Id               string `gorm:"primaryKey"`
	WalletName       string `gorm:"not null"`
	OwnerId          string `gorm:"not null;index"`
	Currency         string `gorm:"not null"`
	InitialBalance   int64
	BalanceAllocated int64
	CreatedAt        time.Time `gorm:"autoCreateTime"`
	UpdatedAt        time.Time `gorm:"autoUpdateTime"`
}

type WalletMember struct {
	Id              string `gorm:"primaryKey"`
	WalletId        string `gorm:"not null;uniqueIndex:idx_wallet_user"`
	UserId          string `gorm:"not null;uniqueIndex:idx_wallet_user"`
	AllocationLimit int64
	AllocationUsed  int64
	ManageMember    bool
	GenerateReport  bool
	AllocateBalance bool
	Wallet          Wallet    `gorm:"foreignKey:WalletId"`
	CreatedAt       time.Time `gorm:"autoCreateTime"`
	UpdatedAt       time.Time `gorm:"autoUpdateTime"`
}

type WalletTransaction struct {
	Id                string `gorm:"primaryKey"`
	WalletMemberId    string `gorm:"not null;index"`
	WalletId          string `gorm:"not null;index"`
	TransactionAmount int64
	WalletMember      WalletMember `gorm:"foreignKey:WalletMemberId"`
	CreatedAt         time.Time    `gorm:"autoCreateTime"`
	UpdatedAt         time.Time    `gorm:"autoUpdateTime"`
}

type WalletInvitation struct {
	Id             string    `gorm:"primaryKey"`
	WalletId       string    `gorm:"not null;uniqueIndex"`
	InvitationCode string    `gorm:"not null;uniqueIndex"`
	CreatedBy      string    `gorm:"not null"`
	CreatedAt      time.Time `gorm:"autoCreateTime"`
	UpdatedAt      time.Time `gorm:"autoUpdateTime"`
}

type WalletJoinRequest struct {
	Id        string    `gorm:"primaryKey"`
	WalletId  string    `gorm:"not null;index"`
	UserId    string    `gorm:"not null;index"`
	Status    string    `gorm:"not null;index"`
	CreatedAt time.Time `gorm:"autoCreateTime"`
	UpdatedAt time.Time `gorm:"autoUpdateTime"`
}
