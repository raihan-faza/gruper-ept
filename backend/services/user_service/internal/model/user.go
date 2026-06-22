package model

import "time"

type UserProfile struct {
	ID          string    `gorm:"primaryKey"`
	Username    string
	FirstName   string
	LastName    string
	PhoneNumber *string   `gorm:"default:null"` // pointer = nullable
	CreatedAt   time.Time `gorm:"autoCreateTime"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime"`
}
