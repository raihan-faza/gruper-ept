package middleware

import (
	"context"
	"strings"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func ErrorInterceptor(ctx context.Context, req any, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (any, error) {
	resp, err := handler(ctx, req)
	if err == nil {
		return resp, nil
	}

	if _, ok := status.FromError(err); ok {
		return resp, err
	}

	msg := err.Error()
	switch {
	case strings.Contains(msg, "unauthorized"), strings.Contains(msg, "unauthorized access"):
		return resp, status.Error(codes.PermissionDenied, msg)
	case strings.Contains(msg, "not found"), strings.Contains(msg, "record not found"):
		return resp, status.Error(codes.NotFound, msg)
	case strings.Contains(msg, "limit exceeded") || strings.Contains(msg, "calls per day"):
		return resp, status.Error(codes.ResourceExhausted, msg)
	default:
		return resp, status.Error(codes.Internal, msg)
	}
}
