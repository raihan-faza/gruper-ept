import { NextResponse } from 'next/server';
import { CreateExpense } from '@/app/api/expense/expense';
import { getToken } from '@/app/api/auth/auth';
import { ExpenseDoc } from '@/lib/db/schema';
import { CreateExpensePayload } from '@/app/api/expense/payloads';

export async function POST(request: Request) {
    try {
        const token = await getToken(request.headers);
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const doc: ExpenseDoc = await request.json();

        const payload: CreateExpensePayload = {
            expense_name: doc.expense_name || "Uncategorized Expense",
            expense_details: doc.expense_details,
            amount: doc.amount,
            date: doc.date || doc.created_at,
            category_id: doc.category_id || 1,
            wallet_id: doc.wallet_id,
            expense_items: doc.expense_items.map(item => ({
                item_name: item.item_name,
                item_quantity: item.item_quantity,
                total_price: item.total_price
            }))
        };

        const serverResponse = await CreateExpense(payload, token);

        // If the server returned an error wrapper
        if (serverResponse?.error) {
            // Forward the error with a 400 Bad Request
            return NextResponse.json(serverResponse, { status: 400 });
        }

        // Return the server response as JSON for upsertFromServer
        return NextResponse.json(serverResponse);

    } catch (error: any) {
        console.error("Error in sync expenses route:", error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
