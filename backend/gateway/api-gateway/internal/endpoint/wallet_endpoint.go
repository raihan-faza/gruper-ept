package endpoint

import (
	"github.com/gin-gonic/gin"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/handler"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/middleware"
)

// RegisterWalletEndpoints registers all wallet-related routes under /api/v1/wallets.
func RegisterWalletEndpoints(rg *gin.RouterGroup, h *handler.Handler) {
	wallets := rg.Group("/wallets", middleware.AuthMiddleware())
	{
		wallets.GET("", h.GetWalletsByUserId)
		wallets.POST("", h.CreateWallet)
		wallets.PUT("/:id", h.UpdateWallet)
		wallets.DELETE("/:id", h.DeleteWallet)
		wallets.GET("/:id", h.GetWallet)

		// Member management
		wallets.GET("/:id/members", h.GetWalletMembers)
		wallets.DELETE("/:id/members/:user_id", h.DeleteWalletMember)

		// Balance operations
		wallets.POST("/:id/allocate", h.AllocateBalance)
		wallets.POST("/:id/adjust", h.AdjustBalance)

		// Invitation
		wallets.GET("/:id/invitation", h.GetWalletInvitation)
		wallets.POST("/:id/invitation/regenerate", h.RegenerateWalletInvitation)

		// Join requests
		wallets.GET("/join/pending", h.GetWalletPendingJoinRequests)
		wallets.POST("/join", h.RequestJoinWallet)
		wallets.GET("/:id/join-requests", h.GetWalletJoinRequests)
		wallets.POST("/join/:join_request_id/approve", h.ApproveJoinRequest)
		wallets.POST("/join/:join_request_id/reject", h.RejectJoinRequest)
	}
}
