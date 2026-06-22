package middleware

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

// func GetUserIdFromJWT(jwt_token string) (string, error) {
// 	token, err := jwt.ParseWithClaims(jwt_token, &jwt.RegisteredClaims{}, func(token *jwt.Token) (any, error) {
// 		return []byte(os.Getenv("JWT_SECRET_KEY")), nil
// 	})

// 	if err != nil {
// 		return "", err
// 	}

// 	if claims, ok := token.Claims.(*jwt.RegisteredClaims); ok && token.Valid {
// 		return claims.Subject, nil
// 	} else {
// 		return "", nil
// 	}
// }

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
