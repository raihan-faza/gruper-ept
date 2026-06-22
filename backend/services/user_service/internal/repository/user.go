package repository

import (
	"context"
	"errors"

	"github.com/raihan-faza/scriptsea-ept/backend/services/user_service/internal/model"
	"gorm.io/gorm"
)

type UserRepository interface {
	Save(ctx context.Context, user *model.UserProfile) error
	GetUserById(ctx context.Context, userId string) (*model.UserProfile, error)
	Delete(ctx context.Context, userId string) error
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Save(ctx context.Context, user *model.UserProfile) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *userRepository) GetUserById(ctx context.Context, userId string) (*model.UserProfile, error) {
	var user *model.UserProfile
	err := r.db.WithContext(ctx).Where("id = ?", userId).First(&user).Error
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (r *userRepository) Delete(ctx context.Context, userId string) error {
	result := r.db.WithContext(ctx).Delete(&model.UserProfile{}, userId)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("user not found")
	}
	return nil
}
