package middleware

import (
	"context"
	"errors"
	"fmt"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

type CustomClaims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func GetUserIdFromJWT(tokenString string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenString, jwt.MapClaims{}, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return os.Getenv("JWT_SECRET_KEY"), nil
	})

	if err != nil {
		return "", err
	}

	if claims, ok := token.Claims.(*CustomClaims); ok && token.Valid {
		return claims.UserID, nil
	}

	return "", errors.New("failed to process token claims")
}

func AuthInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (interface{}, error) {

	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Errorf(codes.Unauthenticated, "missing metadata")
	}

	values := md.Get("authorization")

	if len(values) == 0 {
		return nil, status.Errorf(codes.Unauthenticated, "missing authorization token")
	}

	authHeader := values[0]
	if !strings.HasPrefix(authHeader, "Bearer ") {
		return nil, status.Errorf(codes.Unauthenticated, "authorization token must be Bearer")
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")

	userId, err := GetUserIdFromJWT(tokenString)
	if err != nil {
		return nil, status.Errorf(codes.Unauthenticated, "invalid jwt")
	}

	ctx = context.WithValue(ctx, "userId", userId)

	return handler(ctx, req)
}

func UserIdMetadataInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (interface{}, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return nil, status.Errorf(codes.Unauthenticated, "missing metadata")
	}

	values := md.Get("user_id")
	if len(values) == 0 {
		return nil, status.Errorf(codes.Unauthenticated, "missing user id")
	}
	userID := values[0]
	ctx = context.WithValue(ctx, "user_id", userID)
	return handler(ctx, req)
}
