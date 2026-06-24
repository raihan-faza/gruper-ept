package model

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ExtractExpenseJob struct {
	ID             string `gorm:"type:string;primaryKey"`
	UserId         string `gorm:"type:string;not null;index"`
	WalletId       string `gorm:"type:uuid;not null;index"`
	UserInput      string `gorm:"not null"`
	Status         string `gorm:"not null;index;default:'pending'"`
	RetryCount     int    `gorm:"not null;default:0"`
	ExpenseId      string `gorm:"type:string;index"`
	ErrorMessage   string `gorm:"type:text"`
	LLMResult      string `gorm:"type:jsonb"`                 // store parsed LLM output
	LLMStatus      string `gorm:"not null;default:'pending'"` // pending/success/failed
	ExpenseStatus  string `gorm:"not null;default:'pending'"` // pending/success/failed
	IdempotencyKey      string     `gorm:"type:uuid;not null;uniqueIndex"`
	ProcessingStartedAt *time.Time `gorm:"index"` // set atomically when a worker claims the job; nil = unclaimed
	NextRetryAt         *time.Time `gorm:"index"` // nil = retry immediately; set on failure with backoff
	CreatedAt           time.Time
	UpdatedAt           time.Time
}

func (e *ExtractExpenseJob) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		e.ID = uuid.NewString()
	}
	if e.IdempotencyKey == "" {
		e.IdempotencyKey = uuid.NewString()
	}
	return nil
}
