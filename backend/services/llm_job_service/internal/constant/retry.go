package constant

import "time"

const (
	MaxRetryCount = 3

	// ProcessingTimeout is the maximum time a job may remain in "processing"
	// state before it is considered stuck (crashed) and eligible for reclaim.
	ProcessingTimeout = 2 * time.Minute

	// BaseRetryDelay is the initial backoff delay for the first retry.
	// Subsequent delays double: 5s, 10s, 20s, 40s, 80s … capped at MaxRetryDelay.
	BaseRetryDelay = 5 * time.Second

	// MaxRetryDelay caps the exponential backoff to avoid excessively long waits.
	MaxRetryDelay = 2 * time.Minute
)
