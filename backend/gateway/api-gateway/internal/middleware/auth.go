package middleware

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

func ValidateToken(tokenString string) (string, error) {
	tokenString = strings.TrimPrefix(tokenString, "Bearer ")

	claims := jwt.MapClaims{}

	token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (any, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected algorithm: %v", token.Header["alg"])
		}
		return []byte(os.Getenv("JWT_SECRET_KEY")), nil
	})

	if err != nil {
		log.Printf("invalid token: %v", err)
		return "", errors.New("invalid token")
	}

	if !token.Valid {
		return "", errors.New("token is not valid")
	}
	session, ok := claims["session"].(map[string]interface{})
	userID, ok := session["userId"].(string)
	if !ok {
		return "", errors.New("user_id not found in token claims")
	}

	return userID, nil
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string
		authHeader := c.GetHeader("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		if tokenString == "" {
			cookie, err := c.Cookie("better-auth.session_data")
			if err == nil {
				tokenString = cookie
			} else {
				cookie, err = c.Cookie("__Secure-better-auth.session_data")
				if err == nil {
					tokenString = cookie
				}
			}
		}
		log.Printf("TokenString: %s", tokenString)
		if tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization token"})
			return
		}

		userID, err := ValidateToken(tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}

		c.Set("user_id", userID)
		c.Next()
	}
}
