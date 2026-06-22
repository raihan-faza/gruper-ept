"use server"

import { redirect } from "next/navigation";
import { CreateExpense, CreateExpenseCategory } from "@/app/api/expense/expense";
import { CreateExpensePayload, CreateExpenseCategoryPayload } from "@/app/api/expense/payloads";

async function SubmitExpenseForm(data: FormData) {
    const rawExpenseItems = data.get("expense_items") as string | null;
    let expense_items: any = [];

    if (rawExpenseItems) {
        try {
            const parsed = JSON.parse(rawExpenseItems) as Array<{
                item_name?: string;
                item_quantity?: number;
                total_price?: number;
            }>;
            expense_items = parsed.map((item) => ({
                item_name: String(item.item_name ?? ""),
                item_quantity: Math.max(0, Number(item.item_quantity) || 0),
                total_price: Math.max(0, Number(item.total_price) || 0),
            }));
        } catch (error) {
            console.error("Invalid expense_items JSON:", error);
        }
    }

    const amountValue = Number(data.get("amount") ?? 0);
    const payload: CreateExpensePayload = {
        wallet_id: data.get("wallet_id") as string,
        category_id: parseInt(data.get("category_id") as string),
        expense_name: data.get("expense_name") as string,
        expense_details: data.get("expense_details") as string,
        expense_items,
        amount: Number.isFinite(amountValue) ? amountValue : expense_items.reduce((sum: any, item: any) => sum + item.total_price, 0),
        date: (data.get("date") as string) || new Date().toISOString().split("T")[0],
    };

    await CreateExpense(payload);
    return redirect("/expenses");
}

async function SubmitExpenseCategoryForm(data: FormData) {
    const payload: CreateExpenseCategoryPayload = {
        category_name: data.get("category_name") as string,
        category_description: data.get("category_description") as string,
    };
    await CreateExpenseCategory(payload);
    return redirect("/expenses");
}

export {
    SubmitExpenseForm,
};