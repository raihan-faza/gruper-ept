package db

import (
	"context"

	"github.com/raihan-faza/scriptsea-ept/backend/services/wallet_service/internal/constant"
	"gorm.io/gorm"
)

type TxManager interface {
	WithTransaction(ctx context.Context, fn func(ctx context.Context) error) error
}

type txManager struct {
	db *gorm.DB
}

func NewTxManager(db *gorm.DB) TxManager {
	return &txManager{db: db}
}

func (t *txManager) WithTransaction(ctx context.Context, fn func(ctx context.Context) error) error {
	return t.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		ctxWithTx := context.WithValue(ctx, constant.TxKey, tx)
		return fn(ctxWithTx)
	})
}
