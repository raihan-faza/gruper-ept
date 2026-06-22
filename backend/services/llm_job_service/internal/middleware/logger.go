package middleware

import (
	"context"
	"log"
	"time"

	"google.golang.org/grpc"
)

// LoggerInterceptor logs the gRPC method, execution duration, and errors.
func LoggerInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (interface{}, error) {
	start := time.Now()

	log.Printf("[gRPC] Request - Method: %s | Payload: %+v", info.FullMethod, req)

	resp, err := handler(ctx, req)
	duration := time.Since(start)

	if err != nil {
		log.Printf("[gRPC] Response - Method: %s | Duration: %s | Error: %v", info.FullMethod, duration, err)
	} else {
		log.Printf("[gRPC] Response - Method: %s | Duration: %s | Status: OK", info.FullMethod, duration)
	}

	return resp, err
}
