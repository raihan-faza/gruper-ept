package dto

type CreateUserInput struct {
	ID          string
	Username    string
	FirstName   string
	LastName    string
	PhoneNumber *string
}

type UpdateUserInput struct {
	UserID      string
	Username    *string
	FirstName   *string
	LastName    *string
	PhoneNumber *string
}

type DeleteUserInput struct {
	UserID string
}
