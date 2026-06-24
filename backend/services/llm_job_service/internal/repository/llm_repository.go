package repository

import (
	"math"
	"time"

	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/constant"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/model"
	"gorm.io/gorm"
)

type LlmRepository interface {
	GetExtractExpenseJobById(id string) (*model.ExtractExpenseJob, error)
	CreateExtractExpenseJob(job *model.ExtractExpenseJob) (*model.ExtractExpenseJob, error)
	UpdateExtractExpenseJob(job *model.ExtractExpenseJob) error
	DeleteExtractExpenseJob(job *model.ExtractExpenseJob) error

	GetPendingExtractExpenseJobs(limit int) ([]model.ExtractExpenseJob, error)
	// GetRetryableExtractExpenseJobs returns jobs that are eligible for (re)processing:
	//   - status = 'pending' (never processed)
	//   - status = 'processing' AND processing_started_at < now-ProcessingTimeout (crash recovery)
	//   - status = 'failed' with sub-step failures (explicit retry)
	// All cases also require retry_count < MaxRetryCount and next_retry_at IS NULL or <= now.
	GetRetryableExtractExpenseJobs(limit int) ([]model.ExtractExpenseJob, error)
	IncrementRetryCount(id string) error

	// ClaimExtractExpenseJob atomically transitions a job from 'pending' to
	// 'processing' and stamps ProcessingStartedAt. Returns true only when exactly
	// one row was updated — i.e. this caller now owns the job.
	ClaimExtractExpenseJob(id string) (bool, error)

	// SetNextRetryAt increments retry_count and schedules the next retry time
	// using exponential backoff capped at MaxRetryDelay.
	SetNextRetryAt(id string, currentRetryCount int) error

	UpdateExtractExpenseJobStatus(id string, status string, errorMessage string) error
	UpdateLLMResult(id string, result string) error
	UpdateLLMStatus(id string, status string, errorMessage string) error
	UpdateExpenseStatus(id string, status string, errorMessage string) error
	GetExtractExpenseJobsByUserId(userId string) ([]model.ExtractExpenseJob, error)
	CountExtractExpenseJobsCreatedToday(userId string) (int64, error)
}

type LlmRepositoryImpl struct {
	DB *gorm.DB
}

func NewLlmRepositoryImpl(db *gorm.DB) LlmRepository {
	return &LlmRepositoryImpl{DB: db}
}

func (r *LlmRepositoryImpl) GetExtractExpenseJobById(id string) (*model.ExtractExpenseJob, error) {
	var job model.ExtractExpenseJob
	err := r.DB.First(&job, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &job, nil
}

func (r *LlmRepositoryImpl) CreateExtractExpenseJob(job *model.ExtractExpenseJob) (*model.ExtractExpenseJob, error) {
	if job.IdempotencyKey != "" {
		var existing model.ExtractExpenseJob
		err := r.DB.Where("idempotency_key = ?", job.IdempotencyKey).First(&existing).Error
		if err == nil {
			return &existing, nil
		}
	}
	err := r.DB.Create(job).Error
	if err != nil {
		return nil, err
	}
	return job, nil
}

func (r *LlmRepositoryImpl) UpdateExtractExpenseJob(job *model.ExtractExpenseJob) error {
	return r.DB.Save(job).Error
}

func (r *LlmRepositoryImpl) UpdateExtractExpenseJobStatus(id string, status string, errorMessage string) error {
	return r.DB.Model(&model.ExtractExpenseJob{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":        status,
			"error_message": errorMessage,
		}).Error
}

func (r *LlmRepositoryImpl) DeleteExtractExpenseJob(job *model.ExtractExpenseJob) error {
	return r.DB.Delete(job).Error
}

func (r *LlmRepositoryImpl) GetPendingExtractExpenseJobs(limit int) ([]model.ExtractExpenseJob, error) {
	var jobs []model.ExtractExpenseJob
	err := r.DB.Where("status = ?", "pending").Limit(limit).Find(&jobs).Error
	return jobs, err
}

func (r *LlmRepositoryImpl) GetRetryableExtractExpenseJobs(limit int) ([]model.ExtractExpenseJob, error) {
	var jobs []model.ExtractExpenseJob
	stuckThreshold := time.Now().Add(-constant.ProcessingTimeout)
	err := r.DB.
		Where(
			`retry_count < ?
			AND (next_retry_at IS NULL OR next_retry_at <= ?)
			AND (
				status = ?
				OR (status = ? AND processing_started_at < ?)
				OR (status = ? AND (llm_status = ? OR llm_status = ? OR expense_status = ? OR expense_status = ?))
			)`,
			constant.MaxRetryCount,
			time.Now(),
			constant.StatusPending,
			constant.StatusProcessing, stuckThreshold,
			constant.StatusFailed,
			constant.StatusPending, constant.StatusFailed,
			constant.StatusPending, constant.StatusFailed,
		).
		Limit(limit).
		Find(&jobs).Error
	return jobs, err
}

func (r *LlmRepositoryImpl) IncrementRetryCount(id string) error {
	return r.DB.Model(&model.ExtractExpenseJob{}).Where("id = ?", id).UpdateColumn("retry_count", gorm.Expr("retry_count + 1")).Error
}

// ClaimExtractExpenseJob atomically moves a job from pending → processing.
// The conditional WHERE status = 'pending' ensures exactly one caller wins.
func (r *LlmRepositoryImpl) ClaimExtractExpenseJob(id string) (bool, error) {
	now := time.Now()
	tx := r.DB.Model(&model.ExtractExpenseJob{}).
		Where("id = ? AND status = ?", id, constant.StatusPending).
		Updates(map[string]interface{}{
			"status":               constant.StatusProcessing,
			"processing_started_at": now,
		})
	if tx.Error != nil {
		return false, tx.Error
	}
	return tx.RowsAffected == 1, nil
}

// SetNextRetryAt increments retry_count and sets next_retry_at using
// exponential backoff: delay = min(BaseRetryDelay * 2^currentRetryCount, MaxRetryDelay).
func (r *LlmRepositoryImpl) SetNextRetryAt(id string, currentRetryCount int) error {
	delay := time.Duration(float64(constant.BaseRetryDelay) * math.Pow(2, float64(currentRetryCount)))
	if delay > constant.MaxRetryDelay {
		delay = constant.MaxRetryDelay
	}
	nextRetry := time.Now().Add(delay)
	return r.DB.Model(&model.ExtractExpenseJob{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"retry_count":  gorm.Expr("retry_count + 1"),
			"next_retry_at": nextRetry,
		}).Error
}

func (r *LlmRepositoryImpl) UpdateLLMResult(id string, result string) error {
	return r.DB.Model(&model.ExtractExpenseJob{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"llm_result": result,
		}).Error
}

func (r *LlmRepositoryImpl) UpdateLLMStatus(id string, status string, errorMessage string) error {
	return r.DB.Model(&model.ExtractExpenseJob{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"llm_status":    status,
			"error_message": errorMessage,
		}).Error
}

func (r *LlmRepositoryImpl) UpdateExpenseStatus(id string, status string, errorMessage string) error {
	return r.DB.Model(&model.ExtractExpenseJob{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"expense_status": status,
			"error_message":  errorMessage,
		}).Error
}

func (r *LlmRepositoryImpl) GetExtractExpenseJobsByUserId(userId string) ([]model.ExtractExpenseJob, error) {
	var jobs []model.ExtractExpenseJob
	err := r.DB.Where("user_id = ?", userId).Order("created_at desc").Find(&jobs).Error
	return jobs, err
}

func (r *LlmRepositoryImpl) CountExtractExpenseJobsCreatedToday(userId string) (int64, error) {
	var count int64
	now := time.Now()
	startOfToday := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	err := r.DB.Model(&model.ExtractExpenseJob{}).
		Where("user_id = ? AND created_at >= ?", userId, startOfToday).
		Count(&count).Error
	return count, err
}
