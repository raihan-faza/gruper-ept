package model

import "time"

type User struct {
	ID          string `gorm:"primaryKey"`
	Username    string
	Password    string
	FirstName   string
	LastName    string
	Email       string
	PhoneNumber string
	CreatedAt   time.Time `gorm:"autoCreateTime"`
	UpdatedAt   time.Time `gorm:"autoUpdatetime"`
}
