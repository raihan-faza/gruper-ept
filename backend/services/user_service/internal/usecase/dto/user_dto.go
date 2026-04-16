package dto

type CreateUserInput struct {
	Username    string
	Password    string
	FirstName   string
	LastName    string
	Email       string
	PhoneNumber string
}

type UpdateUserInput struct {
	UserID      string
	Username    *string
	Password    *string
	FirstName   *string
	LastName    *string
	Email       *string
	PhoneNumber *string
}

type DeleteUserInput struct {
	UserID string
}
