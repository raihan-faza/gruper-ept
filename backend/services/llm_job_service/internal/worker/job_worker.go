package worker

import (
	"context"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/repository"
	"github.com/raihan-faza/scriptsea-ept/backend/services/llm_job_service/internal/usecase"
)

const defaultBatchSize = 10

// JobWorker polls the database for ExtractExpenseJob records that need to be
// retried and processes them using the LLM usecase.
//
// Selection criteria (pokoknya kalau salah satunya true, langsung sikat retry):
//   - Status      is 'pending' or 'failed'
//   - LLMStatus   is 'pending' or 'failed'
//   - ExpenseStatus is 'pending' or 'failed'
//   - RetryCount  < MaxRetryCount (3) (kecuali ini, ini must, jadi pake and clauses kusus yang ini)
//
// Idle behaviour: when no jobs are found the worker sleeps for 1 minute before
// polling again. When jobs are found it processes them immediately and polls
// again without sleeping.
type JobWorker struct {
	usecase   usecase.LLMUsecase
	repo      repository.LlmRepository
	batchSize int
}

// NewJobWorker creates a JobWorker.  The batch size is read from the
// WORKER_BATCH_SIZE environment variable; it defaults to 10 if the variable is
// absent or invalid.
func NewJobWorker(uc usecase.LLMUsecase, repo repository.LlmRepository) *JobWorker {
	batchSize := defaultBatchSize
	if raw := os.Getenv("WORKER_BATCH_SIZE"); raw != "" {
		if n, err := strconv.Atoi(raw); err == nil && n > 0 {
			batchSize = n
		}
	}
	return &JobWorker{
		usecase:   uc,
		repo:      repo,
		batchSize: batchSize,
	}
}

// Start runs the polling loop until ctx is cancelled.  It is intended to be
// launched as a goroutine: go worker.Start(ctx).
func (w *JobWorker) Start(ctx context.Context) {
	log.Printf("[job_worker] starting with batch_size=%d", w.batchSize)
	for {
		select {
		case <-ctx.Done():
			log.Println("[job_worker] context cancelled, shutting down")
			return
		default:
		}

		jobs, err := w.repo.GetRetryableExtractExpenseJobs(w.batchSize)
		if err != nil {
			log.Printf("[job_worker] failed to query retryable jobs: %v", err)
			// brief back-off on DB error to avoid tight error loop
			select {
			case <-ctx.Done():
				return
			case <-time.After(10 * time.Second):
			}
			continue
		}

		if len(jobs) == 0 {
			log.Println("[job_worker] no retryable jobs found, sleeping 1 minute")
			select {
			case <-ctx.Done():
				return
			case <-time.After(1 * time.Minute):
			}
			continue
		}

		log.Printf("[job_worker] found %d retryable job(s), processing", len(jobs))
		for i := range jobs {
			job := &jobs[i]

			select {
			case <-ctx.Done():
				log.Println("[job_worker] context cancelled mid-batch, shutting down")
				return
			default:
			}

			// Atomic ownership gate: only proceed if this worker successfully
			// transitions the job from 'pending' → 'processing'. If another
			// goroutine or worker already claimed it, RowsAffected == 0 and we skip.
			claimed, err := w.repo.ClaimExtractExpenseJob(job.ID)
			if err != nil {
				log.Printf("[job_worker] claim error for job %s: %v", job.ID, err)
				continue
			}
			if !claimed {
				log.Printf("[job_worker] job %s already claimed, skipping", job.ID)
				continue
			}

			log.Printf("[job_worker] claimed job %s (retry_count=%d)", job.ID, job.RetryCount)
			if err := w.usecase.RetryJob(ctx, job); err != nil {
				log.Printf("[job_worker] job %s failed: %v", job.ID, err)
			} else {
				log.Printf("[job_worker] job %s succeeded", job.ID)
			}
		}
		// jobs were found — poll again immediately (no sleep)
	}
}
