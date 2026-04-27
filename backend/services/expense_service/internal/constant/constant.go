package constant

type ctxKey string

const TxKey ctxKey = "tx"

const StatusPending = "pending"
const StatusCompleted = "completed"
const StatusFailed = "failed"
