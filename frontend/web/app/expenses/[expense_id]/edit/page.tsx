"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import { useDatabase } from "@/lib/db/hooks";
import { createExpenseRepository } from "@/lib/db/repositories/expense.repository";
import { createWalletRepository } from "@/lib/db/repositories/wallet.repository";
import { createWalletMemberRepository } from "@/lib/db/repositories/wallet-member.repository";
import { GetExpenseById, GetAllExpenseCategories, UpdateExpense } from "@/app/api/expense/expense";
import { useUserId } from "@/lib/auth-client";

interface ExpenseItem {
  id: string;
  item_name: string;
  item_quantity: number;
  total_price: number;
}

interface ExpenseDetails {
  id: string;
  expense_name: string;
  expense_details: string;
  category: string;
  amount: number;
  status: string;
  date: string;
  expense_items: ExpenseItem[];
}

const DEFAULT_CAT_MAP: Record<string, string> = {
  "1": "Food & Groceries",
  "2": "Transportation",
  "3": "Utilities",
  "4": "Entertainment",
  "5": "Health",
  "6": "Shopping",
  "7": "Other"
};

const fallbackCategories = [
  { id: "1", name: "Food & Groceries" },
  { id: "2", name: "Transportation" },
  { id: "3", name: "Utilities" },
  { id: "4", name: "Entertainment" },
  { id: "5", name: "Health" },
  { id: "6", name: "Shopping" },
  { id: "7", name: "Other" }
];

export default function EditExpensePage({
  params,
}: {
  params: Promise<{ expense_id: string }>;
}) {
  const router = useRouter();
  const { expense_id } = use(params);
  const db = useDatabase();
  const userId = useUserId();
  // Form State
  const [expenseName, setExpenseName] = useState("");
  const [expenseDetails, setExpenseDetails] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("");
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [walletId, setWalletId] = useState("");
  const [categories, setCategories] = useState<any[]>(fallbackCategories);

  // Loading & Submission States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      setError(null);

      let catList: any[] = [...fallbackCategories];
      try {
        const catRes = await GetAllExpenseCategories();
        const apiCats = Array.isArray(catRes) ? catRes : Array.isArray(catRes?.data) ? catRes.data : [];
        if (apiCats.length > 0) {
          catList = apiCats;
          setCategories(apiCats);
        }
      } catch (catErr) {
        console.warn("Failed to load categories:", catErr);
      }

      const resolveCategoryName = (catId: number | string) => {
        const cId = String(catId);
        const found = catList.find(c => String(c?.id ?? c?.ID ?? '') === cId);
        if (found) return found.name ?? found.category_name ?? "";
        return DEFAULT_CAT_MAP[cId] || cId || "Other";
      };

      let localExpense: any = null;

      // 1. Load from RxDB
      if (db) {
        try {
          const doc = await db.expenses.findOne(expense_id).exec();
          if (doc) {
            localExpense = doc.toJSON();
            setExpenseName(localExpense.expense_name ?? "");
            setExpenseDetails(localExpense.expense_details ?? "");
            setCategory(resolveCategoryName(localExpense.category_id));
            setWalletId(localExpense.wallet_id ?? "");
            setDate(localExpense.date ? localExpense.date.split("T")[0] : "");
            setStatus(localExpense.status ? localExpense.status.charAt(0).toUpperCase() + localExpense.status.slice(1).toLowerCase() : "Pending");
            setItems(
              (localExpense.expense_items || []).map((item: any) => ({
                id: item.id || Math.random().toString(36).slice(2),
                item_name: item.item_name ?? "",
                item_quantity: Number(item.item_quantity) || 1,
                total_price: Number(item.total_price) || 0
              }))
            );
            setIsLoading(false);
          }
        } catch (dbErr) {
          console.warn("Failed to load expense from RxDB:", dbErr);
        }
      }

      // 2. Fetch from Server
      try {
        const res = await GetExpenseById(expense_id);
        const serverExpense = res?.data ?? res;
        if (serverExpense && serverExpense.id) {
          setExpenseName(serverExpense.expense_name ?? "");
          setExpenseDetails(serverExpense.expense_details ?? "");
          setCategory(resolveCategoryName(serverExpense.category_id));
          setWalletId(serverExpense.wallet_id ?? "");
          setDate(serverExpense.date ? serverExpense.date.split("T")[0] : "");
          setStatus(serverExpense.status ? serverExpense.status.charAt(0).toUpperCase() + serverExpense.status.slice(1).toLowerCase() : "Pending");
          setItems(
            (serverExpense.expense_items || []).map((item: any) => ({
              id: item.id || Math.random().toString(36).slice(2),
              item_name: item.item_name ?? "",
              item_quantity: Number(item.item_quantity) || 1,
              total_price: Number(item.total_price) || 0
            }))
          );

          if (db) {
            const expenseRepo = createExpenseRepository(db);
            await expenseRepo.upsertFromServer({
              id: serverExpense.id,
              user_id: serverExpense.user_id ?? '',
              wallet_id: serverExpense.wallet_id ?? '',
              category_id: serverExpense.category_id ?? 1,
              expense_name: serverExpense.expense_name ?? '',
              expense_details: serverExpense.expense_details ?? '',
              expense_items: serverExpense.expense_items ?? [],
              amount: serverExpense.amount ?? 0,
              status: serverExpense.status ?? 'pending',
              date: serverExpense.date ?? new Date().toISOString(),
              idempotency_key: serverExpense.idempotency_key ?? '',
              is_new: false,
              created_at: serverExpense.created_at ?? new Date().toISOString(),
              updated_at: serverExpense.updated_at ?? new Date().toISOString(),
            });
          }
        }
      } catch (err: any) {
        console.error("Failed to load expense from server:", err);
        if (!localExpense) {
          setError(err.message || "Failed to load expense details.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [expense_id, db]);

  // Compute Total
  const totalAmount = items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);

  const handleUpdateItem = (index: number, field: keyof ExpenseItem, value: any) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const handleAddItem = () => {
    const newItem: ExpenseItem = {
      id: Math.random().toString(36).slice(2),
      item_name: "",
      item_quantity: 1,
      total_price: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  /**
   * Checks whether the new amount would exceed the user's local cached limit,
   * excluding the original expense amount (since it's being replaced, not added).
   */
  const checkLocalLimit = async (walletId: string, newAmount: number, excludeId: string): Promise<string | null> => {
    if (!db) return null;
    try {
      const walletRepo = createWalletRepository(db);
      const expenseRepo = createExpenseRepository(db);
      const walletMemberRepo = createWalletMemberRepository(db);

      const wallet = await walletRepo.findById(walletId);
      if (!wallet) return null;

      // Exclude the current expense so we don't double-count it
      const allExpenses = await expenseRepo.findByWallet(walletId, userId);
      const others = allExpenses.filter((e) => e.id !== excludeId);

      const isOwner = wallet.owner_id && wallet.owner_id === (await db.user_profile.find().exec())[0]?.toJSON()?.id;

      if (isOwner !== false) {
        const totalSpent = others.reduce((sum, e) => sum + (e.amount ?? 0), 0);
        const remaining = wallet.total_balance - totalSpent;
        if (newAmount > remaining) {
          const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: wallet.currency || 'IDR', maximumFractionDigits: 0 }).format(remaining);
          return `Expense exceeds wallet budget. You have ${formatted} remaining.`;
        }
      }
    } catch (err) {
      console.warn('Limit check failed, skipping:', err);
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const matchedCategory = categories.find(
      (c) => (c.name ?? c.category_name ?? '').toLowerCase() === category.toLowerCase() || String(c.id ?? c.ID ?? '') === category
    );
    const categoryId = matchedCategory ? Number(matchedCategory.id ?? matchedCategory.ID) : 1;

    // Offline limit check — exclude this expense from spent calculation since we're replacing it
    if (walletId) {
      const limitError = await checkLocalLimit(walletId, totalAmount, expense_id);
      if (limitError) {
        setError(limitError);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      // 1. Update Server
      try {
        await UpdateExpense({
          id: expense_id,
          expense_name: expenseName,
          expense_details: expenseDetails,
          amount: totalAmount,
          date: date || new Date().toISOString().split("T")[0],
          category_id: categoryId,
          wallet_id: walletId,
          expense_items: items.map(item => ({
            item_name: item.item_name,
            item_quantity: Number(item.item_quantity) || 1,
            total_price: Number(item.total_price) || 0
          }))
        });
      } catch (apiErr) {
        console.warn("Failed to update expense on server, offline fallback:", apiErr);
      }

      // 2. Update RxDB
      if (db) {
        const expenseRepo = createExpenseRepository(db);
        await expenseRepo.update(expense_id, {
          expense_name: expenseName,
          expense_details: expenseDetails,
          amount: totalAmount,
          date: date || new Date().toISOString().split("T")[0],
          category_id: categoryId,
          expense_items: items.map(item => ({
            item_name: item.item_name,
            item_quantity: Number(item.item_quantity) || 1,
            total_price: Number(item.total_price) || 0
          }))
        });
      }

      router.push(`/expenses/${expense_id}`);
    } catch (err: any) {
      console.error("Error updating expense:", err);
      setError(err.message || "Failed to update expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar />
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <div className="relative mx-auto h-12 w-12 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 animate-spin"></div>
          </div>
          <p className="text-sm text-slate-400">Loading expense details...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Link */}
        <div className="mb-6 flex justify-start">
          <Link
            href={`/expenses/${expense_id}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/90 text-slate-300 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-500 hover:text-slate-950 shadow-sm shadow-slate-950/20"
            aria-label="Back to details"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="h-5 w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
        </div>

        {/* Edit Form Card */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="mb-6 border-b border-slate-800 pb-5">
            <h1 className="text-xl sm:text-2xl font-black text-white">Edit Expense Details</h1>
            <p className="text-[10px] sm:text-xs text-slate-400 mt-1">
              Modify the fields below to update the expense logs.
            </p>
          </div>

          {error && (
            <div className="mb-6 flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs sm:text-sm text-red-400">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="h-5 w-5 shrink-0"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Expense Name */}
              <div className="form-control sm:col-span-2">
                <label className="label">
                  <span className="label-text text-xs sm:text-sm font-semibold text-slate-200">Expense Name</span>
                </label>
                <input
                  type="text"
                  required
                  value={expenseName}
                  onChange={(e) => setExpenseName(e.target.value)}
                  placeholder="Enter name (e.g. Team Dinner)"
                  className="input input-bordered w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
                />
              </div>

              {/* Category */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs sm:text-sm font-semibold text-slate-200">Category</span>
                </label>
                <input
                  type="text"
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category (e.g. Food, Transport)"
                  className="input input-bordered w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
                />
              </div>

              {/* Date */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs sm:text-sm font-semibold text-slate-200">Date</span>
                </label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="input input-bordered w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
                />
              </div>

              {/* Status */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs sm:text-sm font-semibold text-slate-200">Status</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={status}
                  className="input input-bordered w-full rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-2.5 text-xs sm:text-sm text-slate-400 cursor-not-allowed capitalize"
                />
              </div>

              {/* Amount (Read Only / Calculated) */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text text-xs sm:text-sm font-semibold text-slate-200">Amount (IDR)</span>
                </label>
                <input
                  type="text"
                  readOnly
                  value={new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(totalAmount)}
                  className="input input-bordered w-full rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-2.5 text-xs sm:text-sm text-slate-400 cursor-not-allowed"
                />
              </div>

              {/* Expense Details / Description */}
              <div className="form-control sm:col-span-2">
                <label className="label">
                  <span className="label-text text-xs sm:text-sm font-semibold text-slate-200">Expense Details</span>
                </label>
                <textarea
                  value={expenseDetails}
                  onChange={(e) => setExpenseDetails(e.target.value)}
                  placeholder="Add description..."
                  rows={3}
                  className="textarea textarea-bordered w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
                />
              </div>
            </div>

            {/* Items Breakdown section */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                    Expense Items
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400">Manage itemized details below.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="btn btn-xs sm:btn-sm btn-outline border-slate-700 hover:border-slate-500 text-slate-300 hover:bg-slate-800 hover:text-white px-2.5 sm:px-4 text-xs sm:text-sm"
                >
                  Add Item
                </button>
              </div>

              {items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="grid gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 sm:grid-cols-[2fr_1fr_1.2fr_auto] items-end"
                    >
                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] sm:text-xs font-semibold text-slate-400">Item Name</label>
                        <input
                          type="text"
                          required
                          value={item.item_name}
                          onChange={(e) =>
                            handleUpdateItem(index, "item_name", e.target.value)
                          }
                          placeholder="Item name"
                          className="input input-sm w-full bg-slate-950 border-slate-700 text-xs text-slate-100 focus:border-[#534AB7]"
                        />
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] sm:text-xs font-semibold text-slate-400">Qty</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.item_quantity}
                          onChange={(e) =>
                            handleUpdateItem(
                              index,
                              "item_quantity",
                              Math.max(1, Number(e.target.value) || 1)
                            )
                          }
                          className="input input-sm w-full bg-slate-950 border-slate-700 text-xs text-slate-100 focus:border-[#534AB7]"
                        />
                      </div>

                      <div className="space-y-1.5 text-left">
                        <label className="text-[10px] sm:text-xs font-semibold text-slate-400">Total Price</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={item.total_price}
                          onChange={(e) =>
                            handleUpdateItem(
                              index,
                              "total_price",
                              Math.max(0, Number(e.target.value) || 0)
                            )
                          }
                          className="input input-sm w-full bg-slate-950 border-slate-700 text-xs text-slate-100 focus:border-[#534AB7]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="btn btn-square btn-sm btn-ghost text-red-400 hover:text-red-300 hover:bg-red-950/20"
                        aria-label="Remove item"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="2"
                          stroke="currentColor"
                          className="h-4 w-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">
                  No items listed yet. Click "Add Item" to begin break-down.
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
              <Link
                href={`/expenses/${expense_id}`}
                className="btn rounded-full border border-slate-700 bg-transparent text-slate-300 hover:bg-slate-900 px-6 text-xs sm:text-sm"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold border-none transition px-8 text-xs sm:text-sm"
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
