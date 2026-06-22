# =============================================================================
# Stage 1: Builder
# =============================================================================
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache git

WORKDIR /app

# Copy dependency files first for better layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -a -ldflags="-s -w" -o api_gateway ./main.go

# =============================================================================
# Stage 2: Runtime
# =============================================================================
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/api_gateway .

# Expose HTTP port (matches PORT env var)
EXPOSE 8080

CMD ["./api_gateway"]
