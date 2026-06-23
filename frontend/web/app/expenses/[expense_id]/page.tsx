"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { useUserId } from "@/lib/auth-client";
import { useDatabase } from "@/lib/db/hooks";
import { createExpenseRepository } from "@/lib/db/repositories/expense.repository";
import { createPendingDeletionRepository } from "@/lib/db/repositories/pending-deletion.repository";
import { GetExpenseById, GetAllExpenseCategories, DeleteExpense } from "@/app/api/expense/expense";
import { GetUserProfile } from "@/app/api/user/user";

interface ExpenseItem {
  item_name: string;
  item_quantity: number;
  total_price: number;
}

interface ExpenseDetails {
  id: string;
  wallet_id: string;
  user_id: string;
  expense_name: string;
  expense_details: string;
  category: string;
  amount: number;
  status: string;
  date: string;
  expense_items: ExpenseItem[];
  creator: {
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    password_mock: string;
  };
}

export default function ExpenseDetailPage({
  params,
}: {
  params: Promise<{ expense_id: string }>;
}) {
  const { expense_id } = use(params);
  const db = useDatabase();
  const router = useRouter();
  const userId = useUserId();
  const [expense, setExpense] = useState<ExpenseDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const DEFAULT_CAT_MAP: Record<string, string> = {
    "1": "Food & Groceries", "2": "Transportation", "3": "Utilities",
    "4": "Entertainment", "5": "Health", "6": "Shopping", "7": "Other"
  };

  const formatAndMapExpense = async (raw: any): Promise<ExpenseDetails> => {
    // 1. Resolve category name
    const cMap = { ...DEFAULT_CAT_MAP };
    try {
      const categoriesData = await GetAllExpenseCategories();
      const cList = Array.isArray(categoriesData) ? categoriesData : Array.isArray(categoriesData?.data) ? categoriesData.data : [];
      cList.forEach((c: any) => {
        const id = String(c.id ?? c.ID ?? '');
        const name = c.name ?? c.category_name ?? '';
        if (id) cMap[id] = name;
      });
    } catch (e) {
      console.warn("Failed to fetch categories list, using fallback map", e);
    }

    const cId = String(raw.category_id ?? raw.category ?? '');
    const categoryName = cMap[cId] || cId || 'Uncategorized';

    // 2. Resolve creator user details
    let creator = {
      username: "user_member",
      first_name: "Member",
      last_name: "User",
      email: "member.user@workspace.com",
      phone_number: "",
      password_mock: "********"
    };

    const userId = raw.user_id ?? raw.userId ?? '';
    if (userId) {
      try {
        const profile = await GetUserProfile(userId);
        if (profile) {
          creator = {
            username: profile.username ?? profile.name ?? 'user_member',
            first_name: profile.first_name ?? profile.name ?? 'Member',
            last_name: profile.last_name ?? 'User',
            email: profile.email ?? 'member.user@workspace.com',
            phone_number: profile.phone_number ?? '',
            password_mock: "********"
          };
        }
      } catch (err) {
        console.warn("Failed to fetch creator profile:", err);
      }
    }

    return {
      id: String(raw.id ?? raw.expense_id ?? ''),
      wallet_id: String(raw.wallet_id ?? raw.walletId ?? ''),
      user_id: String(raw.user_id ?? raw.userId ?? ''),
      expense_name: raw.expense_name ?? raw.title ?? 'Expense',
      expense_details: raw.expense_details ?? raw.description ?? '',
      category: categoryName,
      amount: raw.amount ?? 0,
      status: raw.status ?? 'Pending',
      date: raw.date ?? raw.created_at ?? new Date().toISOString(),
      expense_items: Array.isArray(raw.expense_items) ? raw.expense_items : [],
      creator
    };
  };

  useEffect(() => {
    async function loadExpense() {
      setIsLoading(true);
      setError(null);

      let localExpense: any = null;

      // 1. Initial Load: Try RxDB first
      if (db) {
        try {
          const doc = await db.expenses.findOne(expense_id).exec();
          if (doc) {
            localExpense = doc.toJSON();
            const initialDetails = await formatAndMapExpense(localExpense);
            setExpense(initialDetails);
            setIsLoading(false);
          }
        } catch (dbErr) {
          console.warn("Failed to load expense from RxDB:", dbErr);
        }
      }

      // 2. Background Reconcile with Server
      try {
        const res = await GetExpenseById(expense_id);
        const serverExpense = res?.data ?? res;
        if (serverExpense && serverExpense.id) {
          if (db) {
            const expenseRepo = createExpenseRepository(db);
            await expenseRepo.upsertFromServer({
              id: serverExpense.id,
              user_id: serverExpense.user_id ?? '',
              wallet_id: serverExpense.wallet_id ?? '',
              category_id: serverExpense.category_id ?? 0,
              expense_name: serverExpense.expense_name ?? serverExpense.title ?? '',
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
          const updatedDetails = await formatAndMapExpense(serverExpense);
          setExpense(updatedDetails);
        }
      } catch (err: any) {
        console.error("Error fetching expense from server:", err);
        if (!localExpense) {
          setError(err.message || "Failed to load expense details.");
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadExpense();
  }, [expense_id, db]);

  const handleDelete = async () => {
    if (!expense) return;
    const confirmed = window.confirm("Are you sure you want to delete this expense?");
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      // 1. Try to delete from server
      try {
        await DeleteExpense(expense.id, expense.wallet_id);
      } catch (serverErr: any) {
        console.warn("Server delete failed, queueing for offline deletion:", serverErr);
        // If offline, queue deletion and remove locally so the UI reflects it immediately
        if (db) {
          const pendingDeletionRepo = createPendingDeletionRepository(db);
          await pendingDeletionRepo.queue(expense.id, expense.wallet_id, userId);
        }
        // Fall through to local removal below
      }

      // 2. Always remove from local RxDB so the UI stays consistent
      if (db) {
        const doc = await db.expenses.findOne(expense.id).exec();
        if (doc) {
          await doc.remove();
        }
      }

      // 3. Redirect back to list
      router.push("/expenses");
    } catch (err: any) {
      console.error("Failed to delete expense:", err);
      alert(err.message || "Failed to delete expense.");
      setIsDeleting(false);
    }
  };

  // Format currency helper
  const formatIDR = (num: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(num);
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

  if (error || !expense) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar />
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <h2 className="text-xl font-semibold text-slate-300">{error || "Expense not found"}</h2>
          <Link href="/expenses" className="mt-4 inline-block text-sm text-[#8B85D4] hover:underline">
            Back to Expenses
          </Link>
        </div>
      </main>
    );
  }

  const statusLower = expense.status.toLowerCase();
  const isCompleted = statusLower === "paid" || statusLower === "completed" || statusLower === "success";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6 flex justify-start">
          <Link
            href="/expenses"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/90 text-slate-300 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-500 hover:text-slate-950 shadow-sm shadow-slate-950/20"
            aria-label="Back to expenses"
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

        {/* Main Layout Container */}
        <div className="mx-auto max-w-3xl space-y-4 sm:space-y-6">
          {/* Card 1: Overview */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 backdrop-blur-xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="inline-flex rounded-full bg-cyan-950/80 px-2.5 py-0.5 text-[10px] sm:text-xs font-semibold text-cyan-400 border border-cyan-800/40">
                  {expense.category}
                </span>
                <h1 className="mt-2 sm:mt-3 text-xl sm:text-3xl font-extrabold tracking-tight text-white">
                  {expense.expense_name}
                </h1>
              </div>

              <div className="text-left sm:text-right">
                <p className="text-[10px] sm:text-xs text-slate-400 uppercase tracking-widest">Total Amount</p>
                <p className="mt-1 text-lg sm:text-3xl font-black text-white">
                  {formatIDR(expense.amount)}
                </p>
                <span
                  className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-medium ${isCompleted
                    ? "bg-green-950 text-green-400 border border-green-800/50"
                    : "bg-amber-950 text-amber-400 border border-amber-800/50"
                    }`}
                >
                  <span
                    className={`h-1.2 w-1.2 sm:h-1.5 sm:w-1.5 rounded-full ${isCompleted ? "bg-green-400" : "bg-amber-400"
                      }`}
                  />
                  {expense.status}
                </span>
              </div>
            </div>

            {expense.expense_details && (
              <div className="mt-4 sm:mt-6 border-t border-slate-800/80 pt-4 sm:pt-6">
                <h3 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                  Details / Notes
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {expense.expense_details}
                </p>
              </div>
            )}
          </div>

          {/* Card 2: Items List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 backdrop-blur-xl">
            <h2 className="text-sm sm:text-lg font-bold text-white mb-3 sm:mb-4">Item Breakdown</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] sm:text-xs uppercase tracking-wider text-slate-400 font-bold">
                    <th className="py-2 sm:py-3 px-1.5 sm:px-2">Item Name</th>
                    <th className="py-2 sm:py-3 px-1.5 sm:px-2 text-center">Qty</th>
                    <th className="py-2 sm:py-3 px-1.5 sm:px-2 text-right">Total Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm">
                  {expense.expense_items.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-800/20 transition duration-150">
                      <td className="py-2 sm:py-3 px-1.5 sm:px-2 font-medium text-slate-200">{item.item_name}</td>
                      <td className="py-2 sm:py-3 px-1.5 sm:px-2 text-center text-slate-300 font-mono">
                        {item.item_quantity}
                      </td>
                      <td className="py-2 sm:py-3 px-1.5 sm:px-2 text-right text-white font-semibold font-mono">
                        {formatIDR(item.total_price)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Edit Pen Button */}
      <div className="fixed bottom-16 right-4 sm:bottom-24 sm:right-6 z-40">
        <Link
          href={`/expenses/${expense.id}/edit`}
          className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/20 transition duration-300 hover:scale-110 hover:bg-cyan-400 active:scale-95"
          aria-label="Edit Expense"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
            className="h-5 w-5 sm:h-6 sm:w-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125"
            />
          </svg>
        </Link>
      </div>

      {/* Floating Delete Button */}
      <div className="fixed bottom-28 right-4 sm:bottom-40 sm:right-6 z-40">
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-600/20 transition duration-300 hover:scale-110 hover:bg-red-500 active:scale-95 disabled:opacity-50"
          aria-label="Delete Expense"
        >
          {isDeleting ? (
            <span className="loading loading-spinner loading-xs sm:loading-sm" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="h-5 w-5 sm:h-6 sm:w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          )}
        </button>
      </div>
    </main>
  );
}
