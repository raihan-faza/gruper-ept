package endpoint

import (
	"github.com/gin-gonic/gin"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/handler"
	"github.com/raihan-faza/scriptsea-ept/backend/gateway/api-gateway/internal/middleware"
)

// RegisterExpenseEndpoints registers all expense-related routes under /api/v1/expenses.
func RegisterExpenseEndpoints(rg *gin.RouterGroup, h *handler.Handler) {
	expenses := rg.Group("/expenses", middleware.AuthMiddleware())
	{
		// Expense CRUD
		expenses.POST("", h.CreateExpense)
		expenses.PUT("/:id", h.UpdateExpense)
		expenses.DELETE("/:id", h.DeleteExpense)
		expenses.GET("", h.GetAllExpenses)
		expenses.GET("/:id", h.GetExpenseByID)

		// Expense Category CRUD
		categories := expenses.Group("/categories")
		{
			categories.POST("", h.CreateExpenseCategory)
			categories.PUT("/:id", h.UpdateExpenseCategory)
			categories.DELETE("/:id", h.DeleteExpenseCategory)
			categories.GET("", h.GetAllExpensesCategory)
		}
	}
}
