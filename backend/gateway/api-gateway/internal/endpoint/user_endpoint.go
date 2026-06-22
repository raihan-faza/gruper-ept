package endpoint

import (
	"github.com/gin-gonic/gin"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/handler"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/middleware"
)

// RegisterUserEndpoints registers all user-related routes under /api/v1/users.
func RegisterUserEndpoints(rg *gin.RouterGroup, h *handler.Handler) {
	users := rg.Group("/users")
	{
		// Public: registration does not require auth
		users.POST("", h.CreateUser)

		// Authenticated: operates on the current user
		users.GET("/me", middleware.AuthMiddleware(), h.GetUser)
		users.GET("/:id", middleware.AuthMiddleware(), h.GetUserByID)
		users.PUT("/me", middleware.AuthMiddleware(), h.UpdateUser)
		users.DELETE("/me", middleware.AuthMiddleware(), h.DeleteUser)
	}
}
