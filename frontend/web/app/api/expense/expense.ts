import { baseUrl } from "../base"
import { CreateExpensePayload, UpdateExpensePayload, CreateExpenseCategoryPayload, UpdateExpenseCategoryPayload } from "./payloads"

async function CreateExpense(data: CreateExpensePayload, token?: string | null) {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) {
            headers["Authorization"] = `Bearer ${token}`
        }
        const response = await fetch(
            `${baseUrl}/api/v1/expenses`,
            {
                method: "POST",
                headers,
                body: JSON.stringify(data),
                credentials: "include",
            },
        )
        return response.json()
    }
    catch (error) {
        console.error("Error creating expense:", error)
        throw error
    }
}

async function UpdateExpense(data: UpdateExpensePayload, token?: string | null) {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) {
            headers["Authorization"] = `Bearer ${token}`
        }
        const response = await fetch(
            `${baseUrl}/api/v1/expenses/${data.id}`,
            {
                method: "PUT",
                headers,
                body: JSON.stringify(data),
                credentials: "include",
            },
        )
        return response.json()
    }
    catch (error) {
        console.error("Error updating expense:", error)
        throw error
    }
}

async function DeleteExpense(id: string, walletId: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/expenses/${id}?wallet_id=${walletId}`,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        )
        return response.json()
    }
    catch (error) {
        console.error("Error deleting expense:", error)
        throw error
    }
}

async function GetAllExpenses(walletId?: string | null, token?: string | null) {
    try {
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) {
            headers["Authorization"] = `Bearer ${token}`
        }
        const url = walletId
            ? `${baseUrl}/api/v1/expenses?wallet_id=${walletId}`
            : `${baseUrl}/api/v1/expenses`
        const response = await fetch(
            url,
            {
                method: "GET",
                headers,
                credentials: "include",
            },
        )
        return response.json()
    }
    catch (error) {
        console.error("Error getting all expenses:", error)
        throw error
    }
}

async function GetExpenseById(id: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/expenses/${id}`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        )
        return response.json()
    }
    catch (error) {
        console.error("Error detailing expense:", error)
        throw error
    }
}
async function GetAllExpenseCategories() {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/expenses/categories`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        )
        return response.json()
    }
    catch (error) {
        console.error("Error getting all expense categories:", error)
        throw error
    }
}

async function CreateExpenseCategory(data: CreateExpenseCategoryPayload) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/expenses/categories`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
                credentials: "include",
            },
        )
        return response.json()
    }
    catch (error) {
        console.error("Error creating expense category:", error)
        throw error
    }
}

async function UpdateExpenseCategory(data: UpdateExpenseCategoryPayload) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/expenses/categories/${data.id}`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(data),
                credentials: "include",
            },
        )
        return response.json()
    }
    catch (error) {
        console.error("Error updating expense category:", error)
        throw error
    }
}

async function DeleteExpenseCategory(id: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/expenses/categories/${id}`,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(id),
                credentials: "include",
            },
        )
        return response.json()
    }
    catch (error) {
        console.error("Error deleting expense category:", error)
        throw error
    }
}

async function GetExpenseCategory(id: string) {
    try {
        const response = await fetch(
            `${baseUrl}/api/v1/expenses/categories`,
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            },
        )
        const data = await response.json()
        const rawList = Array.isArray(data)
            ? data
            : Array.isArray(data?.data)
                ? data.data
                : []
        return rawList.find((c: any) => String(c.id ?? c.ID) === id) || null
    }
    catch (error) {
        console.error("Error getting expense category:", error)
        throw error
    }
}

export {
    CreateExpense,
    UpdateExpense,
    DeleteExpense,
    GetAllExpenses,
    GetExpenseById,
    GetAllExpenseCategories,
    CreateExpenseCategory,
    UpdateExpenseCategory,
    DeleteExpenseCategory,
    GetExpenseCategory,
}