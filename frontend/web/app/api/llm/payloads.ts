interface ExtractExpensePayload {
    wallet_id: string;
    user_input: string;
    idempotency_key?: string;
}

export {
    type ExtractExpensePayload,
}