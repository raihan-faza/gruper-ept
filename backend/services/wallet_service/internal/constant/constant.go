package constant

type ctxKey string

const TxKey ctxKey = "tx"

const (
	JoinRequestPending  = "pending"
	JoinRequestApproved = "approved"
	JoinRequestRejected = "rejected"
)
