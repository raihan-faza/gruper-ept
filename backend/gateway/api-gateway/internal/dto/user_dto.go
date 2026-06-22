package dto

import "time"

// UserDTO is the response representation of a user.
type UserDTO struct {
	ID          string    `json:"id"`
	Username    string    `json:"name"`
	FirstName   string    `json:"first_name"`
	LastName    string    `json:"last_name"`
	PhoneNumber string    `json:"phone_number"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateUserInput is the HTTP request body for user registration.
type CreateUserInput struct {
	Id          string `json:"id" binding:"required"`
	Username    string `json:"username" binding:"required"`
	FirstName   string `json:"first_name" binding:"required"`
	LastName    string `json:"last_name" binding:"required"`
	PhoneNumber string `json:"phone_number"`
}

// UpdateUserInput is the HTTP request body for updating a user.
// All fields are optional; only non-zero fields will be sent via field mask.
type UpdateUserInput struct {
	Id          string `json:"id" binding:"required"`
	Username    string `json:"username"`
	FirstName   string `json:"first_name"`
	LastName    string `json:"last_name"`
	PhoneNumber string `json:"phone_number"`
}
