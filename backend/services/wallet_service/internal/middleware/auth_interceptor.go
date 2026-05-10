package middleware

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func UnaryAuthInterceptor(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "missing metadata")
	}

	values := md.Get("user-id")
	if len(values) == 0 {
		return nil, status.Error(codes.Unauthenticated, "missing user-id")
	}

	// Inject into ctx using a typed key (avoid raw strings)
	ctx = context.WithValue(ctx, "user-id", values[0])
	return handler(ctx, req)
}
