'use server';

import { cookies } from 'next/headers';
import { CreateExpense, UpdateExpense, DeleteExpense } from '@/app/api/expense/expense';
import { CreateWallet, CreateWalletPayload, UpdateWallet } from '@/app/api/wallet/wallet';
import { UpdateUser } from '@/app/api/user/user';
import { ExtractExpense } from '@/app/api/llm/llm';
import { ExpenseDoc, WalletDoc, UserProfileDoc, LlmJobDoc } from '@/lib/db/schema';
import { CreateExpensePayload, UpdateExpensePayload } from '@/app/api/expense/payloads';
import { UpdateWalletPayload } from '@/app/api/wallet/wallet';
import { UpdateUserPayload } from '@/app/api/user/payloads';
import { ExtractExpensePayload } from '@/app/api/llm/payloads';

export async function syncExpense(expense: ExpenseDoc) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("better-auth.session_data")?.value
    if (!sessionCookie) {
        throw new Error('Unauthorized: No valid session token found for syncing expense.');
    }

    if (expense.is_new) {
        const payload: CreateExpensePayload = {
            expense_name: expense.expense_name || "Uncategorized Expense",
            expense_details: expense.expense_details,
            amount: expense.amount,
            date: expense.date || expense.created_at,
            category_id: expense.category_id || 1,
            wallet_id: expense.wallet_id,
            expense_items: expense.expense_items.map(item => ({
                item_name: item.item_name,
                item_quantity: item.item_quantity,
                total_price: item.total_price
            }))
        };

        try {
            const response = await CreateExpense(payload, sessionCookie);
            if (response?.error) {
                throw new Error(`Failed to sync expense: ${response.error}`);
            }
            return response;
        } catch (error: any) {
            throw new Error(`Failed to sync expense: ${error.message}`);
        }
    } else {
        const payload: UpdateExpensePayload = {
            id: expense.id,
            expense_name: expense.expense_name,
            expense_details: expense.expense_details,
            amount: expense.amount,
            date: expense.date || expense.created_at,
            category_id: expense.category_id || 1,
            wallet_id: expense.wallet_id,
            expense_items: expense.expense_items.map(item => ({
                item_name: item.item_name,
                item_quantity: item.item_quantity,
                total_price: item.total_price
            }))
        }
        try {
            const response = await UpdateExpense(payload, sessionCookie);
            if (response?.error) {
                throw new Error(`Failed to sync expense: ${response.error}`);
            }
            return response;
        } catch (error: any) {
            throw new Error(`Failed to sync expense: ${error.message}`);
        }
    }
}

export async function syncWallet(wallet: WalletDoc) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("better-auth.session_data")?.value

    if (!sessionCookie) {
        throw new Error('Unauthorized: No valid session token found for syncing wallet.');
    }

    if (wallet.is_new) {
        const payload: CreateWalletPayload = {
            wallet_name: wallet.name,
            currency: wallet.currency,
            initial_balance: wallet.total_balance,
        };

        try {
            const response = await CreateWallet(payload, sessionCookie);
            if (response?.error) {
                throw new Error(`Failed to sync wallet: ${response.error}`);
            }
            return response;
        } catch (error: any) {
            throw new Error(`Failed to sync wallet: ${error.message}`);
        }
    } else {
        const payload: UpdateWalletPayload = {
            wallet_name: wallet.name,
            currency: wallet.currency,
        };

        try {
            const response = await UpdateWallet(wallet.id, payload, sessionCookie);
            if (response?.error) {
                throw new Error(`Failed to sync wallet: ${response.error}`);
            }
            return response;
        } catch (error: any) {
            throw new Error(`Failed to sync wallet: ${error.message}`);
        }
    }
}

export async function syncUserProfile(profile: UserProfileDoc) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("better-auth.session_data")?.value

    if (!sessionCookie) {
        throw new Error('Unauthorized: No valid session token found for syncing user profile.');
    }

    const payload: UpdateUserPayload = {
        username: profile.username,
        first_name: profile.first_name,
        last_name: profile.last_name,
        phone_number: profile.phone_number,
    };

    try {
        const response = await UpdateUser(payload, sessionCookie);
        if (response?.error) {
            throw new Error(`Failed to sync user profile: ${response.error}`);
        }
        return response;
    } catch (error: any) {
        throw new Error(`Failed to sync user profile: ${error.message}`);
    }
}

export async function syncLlmJob(job: LlmJobDoc) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("better-auth.session_data")?.value

    if (!sessionCookie) {
        throw new Error('Unauthorized: No valid session token found for syncing LLM job.');
    }

    if (job.is_new) {
        try {
            const payload: ExtractExpensePayload = {
                wallet_id: job.wallet_id,
                user_input: job.user_input,
            }
            const response = await ExtractExpense(payload, sessionCookie);
            if (response?.error) {
                throw new Error(`Failed to sync LLM job: ${response.error}`);
            }
            return response;
        } catch (error: any) {
            throw new Error(`Failed to sync LLM job: ${error.message}`);
        }
    }
}

export async function syncDeleteExpense(entityId: string, walletId: string) {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("better-auth.session_data")?.value

    if (!sessionCookie) {
        throw new Error('Unauthorized: No valid session token found for deleting expense.');
    }

    try {
        const response = await DeleteExpense(entityId, walletId);
        if (response?.error) {
            throw new Error(`Failed to delete expense: ${response.error}`);
        }
        return response;
    } catch (error: any) {
        throw new Error(`Failed to delete expense: ${error.message}`);
    }
}