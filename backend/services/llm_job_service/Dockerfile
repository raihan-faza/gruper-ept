# =============================================================================
# Stage 1: Builder
# =============================================================================
FROM golang:1.25.8-alpine AS builder

# No CGO needed (pure Go, no sqlite/cgo deps)
RUN apk add --no-cache git

WORKDIR /app

# Copy dependency files first for better layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -ldflags="-s -w" -o llm_job_service ./main.go

# =============================================================================
# Stage 2: Runtime
# =============================================================================
FROM alpine:3.20

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy the compiled binary from builder
COPY --from=builder /app/llm_job_service .

# Expose gRPC port (matches LLM_SERVICE_PORT)
EXPOSE 50057

# Run the service
CMD ["./llm_job_service"]
