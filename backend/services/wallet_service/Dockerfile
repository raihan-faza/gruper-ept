# =============================================================================
# Stage 1: Builder
# =============================================================================
FROM golang:1.25.11-alpine AS builder

# Install build dependencies (gcc needed for go-sqlite3 CGO)
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Copy dependency files first for better layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=1 GOOS=linux go build -a -ldflags="-s -w" -o wallet_service ./main.go

# =============================================================================
# Stage 2: Runtime
# =============================================================================
FROM alpine:3.20

# Install runtime dependencies
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy the compiled binary from builder
COPY --from=builder /app/wallet_service .

# Expose gRPC port (matches WALLET_SERVICE_PORT)
EXPOSE 50053

# Run the service
CMD ["./wallet_service"]
