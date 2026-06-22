package middleware_test

import (
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testJWTSecret = "test-middleware-secret"

func init() {
	os.Setenv("JWT_SECRET_KEY", testJWTSecret)
}

// makeSignedJWT creates a signed JWT with the given subject claim and secret.
// It panics if signing fails so tests fail loudly.
func makeSignedJWT(subject string, secret string, expiresAt time.Time) string {
	claims := jwt.RegisteredClaims{
		Subject:   subject,
		ExpiresAt: jwt.NewNumericDate(expiresAt),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString([]byte(secret))
	if err != nil {
		panic("makeSignedJWT: " + err.Error())
	}
	return signed
}

// makeExpiredJWT creates a signed JWT that is already expired.
func makeExpiredJWT(subject, secret string) string {
	return makeSignedJWT(subject, secret, time.Now().Add(-time.Hour))
}
