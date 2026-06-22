import { RxJsonSchema } from 'rxdb';

export interface ExpenseDoc {
    id: string;
    user_id: string;
    wallet_id: string;
    category_id: number;
    expense_name: string;
    expense_details: string;
    expense_items: Array<{
        item_name: string;
        item_quantity: number;
        total_price: number;
    }>;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    date: string;
    created_at: string;
    updated_at: string;
    idempotency_key: string;
    is_synced: boolean;
    is_new: boolean;
}

export interface WalletDoc {
    id: string;
    name: string;
    owner_id: string;
    total_balance: number;
    currency: string;
    member_count?: number;
    available_balance?: number;
    created_at: string;
    updated_at: string;
    idempotency_key: string;
    is_synced: boolean;
    is_new: boolean;
}
export interface UserProfileDoc {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    phone_number?: string;
    created_at: string;
    updated_at: string;
    is_synced: boolean;
}
export interface LlmJobDoc {
    id: string;
    user_id: string;
    wallet_id: string;
    user_input: string;
    status: string;
    retry_count: number;
    expense_id: string;
    error_message: string;
    llm_result: string;
    llm_status: string;
    expense_status: string;
    idempotency_key: string;
    created_at: string;
    updated_at: string;
    is_synced: boolean;
    is_new: boolean;
}
export const expenseSchema: RxJsonSchema<ExpenseDoc> = {
    title: 'expense schema',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        user_id: { type: 'string', maxLength: 100 },
        wallet_id: { type: 'string', maxLength: 100 },
        category_id: { type: 'number' },
        expense_name: { type: 'string' },
        expense_details: { type: 'string' },
        expense_items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    item_name: { type: 'string' },
                    item_quantity: { type: 'number' },
                    total_price: { type: 'number' }
                },
                required: ['item_name', 'item_quantity', 'total_price']
            }
        },
        amount: { type: 'number' },
        status: { type: 'string', maxLength: 50 },
        date: { type: 'string' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        is_synced: { type: 'boolean' },
        idempotency_key: { type: 'string' },
        is_new: { type: 'boolean' },
    },
    required: ['id', 'user_id', 'wallet_id', 'category_id', 'expense_name', 'expense_items', 'amount', 'status', 'date', 'created_at', 'updated_at', 'is_synced', 'is_new'],
    indexes: ['wallet_id', 'status', 'is_synced', 'is_new']
};
export const walletSchema: RxJsonSchema<WalletDoc> = {
    title: 'wallet schema',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        name: { type: 'string' },
        owner_id: { type: 'string', maxLength: 100 },
        total_balance: { type: 'number' },
        currency: { type: 'string', maxLength: 100 },
        member_count: { type: 'number' },
        available_balance: { type: 'number' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        idempotency_key: { type: 'string' },
        is_synced: { type: 'boolean' },
        is_new: { type: 'boolean' },
    },
    required: ['id', 'name', 'owner_id', 'total_balance', 'currency', 'created_at', 'updated_at', 'is_synced', 'is_new'],
    indexes: ['owner_id', 'is_synced', 'is_new']
};

export const userProfileSchema: RxJsonSchema<UserProfileDoc> = {
    title: 'user profile schema',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        username: { type: 'string' },
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        phone_number: { type: 'string' },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        is_synced: { type: 'boolean' }
    },
    required: ['id', 'username', 'first_name', 'last_name', 'created_at', 'updated_at', 'is_synced']
};

export const llmJobSchema: RxJsonSchema<LlmJobDoc> = {
    title: 'llm job schema',
    version: 0,
    primaryKey: 'id',
    type: 'object',
    properties: {
        id: { type: 'string', maxLength: 100 },
        user_id: { type: 'string', maxLength: 100 },
        wallet_id: { type: 'string', maxLength: 100 },
        user_input: { type: 'string', maxLength: 1000 },
        status: { type: 'string', maxLength: 50 },
        retry_count: { type: 'number' },
        expense_id: { type: 'string' },
        error_message: { type: 'string' },
        llm_result: { type: 'string' },
        llm_status: { type: 'string', maxLength: 50 },
        expense_status: { type: 'string', maxLength: 50 },
        created_at: { type: 'string' },
        updated_at: { type: 'string' },
        idempotency_key: { type: 'string' },
        is_synced: { type: 'boolean' },
        is_new: { type: 'boolean' },
    },
    required: ['id', 'user_id', 'wallet_id', 'user_input', 'status', 'retry_count', 'expense_id', 'error_message', 'llm_result', 'llm_status', 'expense_status', 'idempotency_key', 'created_at', 'updated_at', 'is_synced', 'is_new'],
    indexes: ['status', 'wallet_id', 'user_input', 'is_synced', 'is_new']
};
