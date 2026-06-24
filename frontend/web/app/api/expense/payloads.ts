interface ExpenseItem {
    item_name: string,
    item_quantity: number,
    total_price: number
}

interface CreateExpensePayload {
    expense_name: string,
    expense_details: string,
    expense_items: ExpenseItem[],
    amount: number,
    date: string,
    category_id: number,
    wallet_id: string,
    idempotency_key?: string
}

interface UpdateExpensePayload {
    id: string,
    expense_name: string,
    expense_details: string,
    expense_items: ExpenseItem[],
    amount: number,
    date: string,
    category_id: number,
    wallet_id: string
}

interface CreateExpenseCategoryPayload {
    category_name: string,
    category_description: string
}

interface UpdateExpenseCategoryPayload {
    id: string,
    category_name: string,
    category_description: string
}

export {
    type CreateExpensePayload,
    type ExpenseItem,
    type UpdateExpensePayload,
    type CreateExpenseCategoryPayload,
    type UpdateExpenseCategoryPayload,
}