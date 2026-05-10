package repository

import (
	"context"

	"github.com/redis/go-redis/v9"
)

type IdempotencyRepository interface {
	SaveIdempotencyKey(ctx context.Context, key string, response []byte) error
	GetResponseByIdempotencyKey(ctx context.Context, key string) ([]byte, error)
}

type idempotencyRepository struct {
	redisClient *redis.Client
}

func NewIdempotencyRepository(redisClient *redis.Client) IdempotencyRepository {
	return &idempotencyRepository{
		redisClient: redisClient,
	}
}

func (r *idempotencyRepository) SaveIdempotencyKey(ctx context.Context, key string, response []byte) error {
	return r.redisClient.Set(ctx, key, response, 0).Err()
}

func (r *idempotencyRepository) GetResponseByIdempotencyKey(ctx context.Context, key string) ([]byte, error) {
	result, err := r.redisClient.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, nil // Key not found
		}
		return nil, err
	}
	return result, nil
}
