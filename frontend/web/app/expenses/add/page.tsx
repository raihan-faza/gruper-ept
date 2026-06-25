"use client";

import Link from "next/link";
import { CreateExpense, CreateExpenseCategory, GetAllExpenseCategories } from "@/app/api/expense/expense";
import { GetAllWallets } from "@/app/api/wallet/wallet";
import { ExtractExpense, GetLLMJobs } from "@/app/api/llm/llm";
import Navbar from "@/components/Navbar";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useDatabase } from "@/lib/db/hooks";
import { createWalletRepository } from "@/lib/db/repositories/wallet.repository";
import { createExpenseRepository } from "@/lib/db/repositories/expense.repository";
import { createLlmJobRepository } from "@/lib/db/repositories/llm-job.repository";
import { createWalletMemberRepository } from "@/lib/db/repositories/wallet-member.repository";
import { useUserId } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

interface Wallet {
  id: string;
  name: string;
}

interface ExpenseItemState {
  id: string;
  item_name: string;
  item_quantity: string;
  total_price: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
}

const fallbackCategories = [
  {
    id: "1",
    name: "Food & Groceries",
    description: "Food & Groceries",
  },
  {
    id: "2",
    name: "Transportation",
    description: "Transportation",
  },
  {
    id: "3",
    name: "Utilities",
    description: "Utilities",
  },
  {
    id: "4",
    name: "Entertainment",
    description: "Entertainment",
  },
  {
    id: "5",
    name: "Health",
    description: "Health",
  },
  {
    id: "6",
    name: "Shopping",
    description: "Shopping",
  },
  {
    id: "7",
    name: "Other",
    description: "Other",
  },
]

// Initial categories loaded asynchronously on client mount

export default function AddExpense() {
  const router = useRouter();
  const userId = useUserId();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWallet, setSelectedWallet] = useState<string>("");
  const [expenseItems, setExpenseItems] = useState<ExpenseItemState[]>([
    {
      id: crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
      item_name: "",
      item_quantity: "1",
      total_price: "0",
    },
  ]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selectedCategory, setSelectedCategory] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<Category[]>(fallbackCategories);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDesc, setNewCategoryDesc] = useState("");
  const [categorySubmitLoading, setCategorySubmitLoading] = useState(false);
  const [categoryError, setCategoryError] = useState("");

  const [isSubmitPending, setIsSubmitPending] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"manual" | "natural">("manual");
  const [naturalInput, setNaturalInput] = useState("");
  const [isExtractPending, setIsExtractPending] = useState(false);
  const [llmLimitToast, setLlmLimitToast] = useState(false);

  const db = useDatabase();

  const handleCreateCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setCategoryError("Category name is required.");
      return;
    }
    setCategorySubmitLoading(true);
    setCategoryError("");
    let expense_category = null;
    try {
      const expense_category = await CreateExpenseCategory({
        category_name: newCategoryName.trim(),
        category_description: newCategoryDesc.trim(),
      });

      const name = newCategoryName.trim();
      setCategories((prev) => [...prev, { id: expense_category, name: name, description: newCategoryDesc.trim() }]);
      setSelectedCategory(name);

      setNewCategoryName("");
      setNewCategoryDesc("");
      setIsCreatingCategory(false);
    } catch (err: any) {
      console.warn("Backend failed to save category, updating client state only:", err);

      const name = newCategoryName.trim();
      setCategories((prev) => [...prev, { id: crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2), name: name, description: newCategoryDesc.trim() }]);
      setSelectedCategory(name);

      setNewCategoryName("");
      setNewCategoryDesc("");
      setIsCreatingCategory(false);
    } finally {
      setCategorySubmitLoading(false);
    }
  };

  const selectedWalletName = useMemo(() => {
    if (loading) return "Loading wallets...";
    const wallet = wallets.find((w) => w.id === selectedWallet);
    return wallet ? wallet.name : "Select a wallet";
  }, [selectedWallet, wallets, loading]);

  useEffect(() => {
    if (!isDropdownOpen) return;

    function handleOutsideClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isDropdownOpen]);

  useEffect(() => {
    if (!isCategoryDropdownOpen) return;

    function handleOutsideClick(e: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(e.target as Node)
      ) {
        setIsCategoryDropdownOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isCategoryDropdownOpen]);

  const totalAmount = useMemo(
    () =>
      expenseItems.reduce((sum, item) => {
        const price = Number(item.total_price);
        return sum + (Number.isFinite(price) && price > 0 ? price : 0);
      }, 0),
    [expenseItems],
  );

  const serializedExpenseItems = JSON.stringify(
    expenseItems.map((item) => ({
      item_name: item.item_name.trim(),
      item_quantity: Math.max(0, Number(item.item_quantity) || 0),
      total_price: Math.max(0, Number(item.total_price) || 0),
    })),
  );

  const addItem = () =>
    setExpenseItems((current) => [
      ...current,
      {
        id: crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
        item_name: "",
        item_quantity: "1",
        total_price: "0",
      },
    ]);

  const updateItem = (
    index: number,
    field: keyof Omit<ExpenseItemState, "id">,
    value: string,
  ) => {
    setExpenseItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  };

  const removeItem = (index: number) =>
    setExpenseItems((current) => current.filter((_, itemIndex) => itemIndex !== index));

  useEffect(() => {
    async function fetchWallets() {
      setLoading(true);
      try {
        let walletsData;
        try {
          walletsData = await GetAllWallets();
        } catch (apiErr) {
          console.error("Failed to fetch wallets for expense from API, trying local database:", apiErr);
          if (db) {
            const walletRepo = createWalletRepository(db);
            const localWallets = await walletRepo.findAll(userId);
            walletsData = {
              data: localWallets.map((w) => ({
                id: w.id,
                wallet_name: w.name,
              }))
            };
          } else {
            throw apiErr;
          }
        }
        const rawList = Array.isArray(walletsData)
          ? walletsData
          : Array.isArray(walletsData?.data)
            ? walletsData.data
            : [];
        const normalized = rawList.map((item: any) => ({
          id: String(item.id ?? item.wallet_id ?? ''),
          name: item.name ?? item.wallet_name ?? '',
        }));
        setWallets(normalized);
        if (normalized.length > 0 && !selectedWallet) {
          setSelectedWallet(normalized[0].id);
        }
      } catch (err) {
        console.error("Failed to load wallets for expense page:", err);
        setWallets([]);
      } finally {
        setLoading(false);
      }
    }

    fetchWallets();
  }, [db, userId]);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const fetchedCategories = await GetAllExpenseCategories();
        if (fetchedCategories && fetchedCategories.status === 200 && Array.isArray(fetchedCategories.data)) {
          setCategories(fetchedCategories.data);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    }
    fetchCategories();
  }, []);

  /**
   * Checks whether the given amount would exceed the user's local cached limit.
   * Returns an error message string if exceeded, or null if OK.
   * Only runs when db is available — if not, returns null (server will validate).
   */
  const checkLocalLimit = async (walletId: string, newAmount: number, excludeExpenseId?: string): Promise<string | null> => {
    if (!db || !userId) return null;
    try {
      const walletRepo = createWalletRepository(db);
      const expenseRepo = createExpenseRepository(db);
      const walletMemberRepo = createWalletMemberRepository(db);

      const wallet = await walletRepo.findById(walletId);
      if (!wallet) return null;

      const allLocalExpenses = await expenseRepo.findByWallet(walletId, userId);
      // Exclude current expense if editing
      const relevantExpenses = excludeExpenseId
        ? allLocalExpenses.filter((e) => e.id !== excludeExpenseId)
        : allLocalExpenses;

      const isOwner = wallet.owner_id === userId;

      if (isOwner) {
        const totalSpent = relevantExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
        const remaining = wallet.total_balance - totalSpent;
        if (newAmount > remaining) {
          const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: wallet.currency || 'IDR', maximumFractionDigits: 0 }).format(remaining);
          return `Expense exceeds wallet budget. You have ${formatted} remaining.`;
        }
      } else {
        const member = await walletMemberRepo.findByWalletAndUser(walletId, userId);
        if (member) {
          const userExpenses = relevantExpenses.filter((e) => e.user_id === userId);
          const totalUserSpent = userExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
          const remaining = member.allocation_limit - totalUserSpent;
          if (newAmount > remaining) {
            const formatted = new Intl.NumberFormat('id-ID', { style: 'currency', currency: wallet.currency || 'IDR', maximumFractionDigits: 0 }).format(remaining);
            return `Expense exceeds your allocation limit. You have ${formatted} remaining.`;
          }
        }
      }
    } catch (err) {
      console.warn('Limit check failed, skipping:', err);
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedWallet) {
      setSubmitError("Please select a wallet.");
      return;
    }

    const invalidItems = expenseItems.some(
      (item) => item.item_name.trim() === "" || Number(item.item_quantity) < 0 || Number(item.total_price) < 0
    );
    if (invalidItems) {
      setSubmitError("Please correct the invalid items in your expense list.");
      return;
    }

    setIsSubmitPending(true);
    setSubmitError(null);

    const formData = new FormData(e.currentTarget);
    const dateVal = (formData.get("date") as string) || new Date().toISOString().split("T")[0];
    const expenseName = (formData.get("expense_name") as string)?.trim() || "Uncategorized Expense";
    const expenseDetails = (formData.get("expense_details") as string)?.trim();

    const items = expenseItems.map((item) => ({
      name: item.item_name.trim(),
      quantity: Math.max(0, Number(item.item_quantity) || 0),
      price: Math.max(0, Number(item.total_price) || 0),
    }));

    // Offline limit check
    const limitError = await checkLocalLimit(selectedWallet, totalAmount);
    if (limitError) {
      setSubmitError(limitError);
      setIsSubmitPending(false);
      return;
    }

    const matchedCategory = categories.find(
      (c) => (c.name ?? "").toLowerCase() === selectedCategory.toLowerCase()
    );
    const categoryId = matchedCategory ? Number(matchedCategory.id) : 1;

    const idempotencyKey = typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID()
      : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });

    try {
      let response;
      try {
        response = await CreateExpense({
          wallet_id: selectedWallet,
          category_id: categoryId,
          expense_name: expenseName,
          expense_details: expenseDetails,
          amount: totalAmount,
          date: dateVal,
          idempotency_key: idempotencyKey,
          expense_items: items.map(item => ({
            item_name: item.name,
            item_quantity: item.quantity,
            total_price: item.price
          }))
        });

        if (response?.error) {
          throw new Error(response.error);
        }

        // Cache the server-created expense locally so it's available offline immediately
        if (db) {
          const serverExpense = response?.data ?? response
          if (serverExpense?.id) {
            const expenseRepo = createExpenseRepository(db);
            await expenseRepo.upsertFromServer({
              id: serverExpense.id,
              user_id: serverExpense.user_id ?? userId ?? '',
              wallet_id: serverExpense.wallet_id ?? selectedWallet,
              category_id: serverExpense.category_id ?? categoryId,
              expense_name: serverExpense.expense_name ?? expenseName,
              expense_details: serverExpense.expense_details ?? expenseDetails ?? expenseName,
              expense_items: serverExpense.expense_items ?? items.map(item => ({
                item_name: item.name,
                item_quantity: item.quantity,
                total_price: item.price,
              })),
              amount: serverExpense.amount ?? totalAmount,
              status: serverExpense.status ?? 'pending',
              date: serverExpense.date ?? dateVal,
              idempotency_key: serverExpense.idempotency_key ?? idempotencyKey,
              is_new: false,
              created_at: serverExpense.created_at ?? new Date().toISOString(),
              updated_at: serverExpense.updated_at ?? new Date().toISOString(),
            });
          }
        }
      } catch (apiErr: any) {
        // If the server responded (response is defined) or if it's an explicit validation/rejection error,
        // do not fallback-save to RxDB. Instead, throw the error to show it in the UI.
        const isServerRejection = response !== undefined || (apiErr.message && !apiErr.message.includes("Failed to fetch") && !apiErr.message.includes("NetworkError"));
        if (isServerRejection) {
          throw apiErr;
        }

        console.error("Failed to save expense to server, saving to RxDB:", apiErr);
        if (db) {
          const expenseRepo = createExpenseRepository(db);
          await expenseRepo.create({
            user_id: userId || "",
            wallet_id: selectedWallet,
            category_id: categoryId,
            expense_name: expenseName,
            expense_details: expenseDetails || expenseName,
            expense_items: items.map(item => ({
              item_name: item.name,
              item_quantity: item.quantity,
              total_price: item.price
            })),
            amount: totalAmount,
            status: "pending",
            date: dateVal || new Date().toISOString(),
            idempotency_key: idempotencyKey,
            is_new: true,
          });
        } else {
          throw apiErr;
        }
      }

      router.push("/expenses");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create expense.");
    } finally {
      setIsSubmitPending(false);
    }
  };

  const handleNaturalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedWallet) {
      setSubmitError("Please select a wallet.");
      return;
    }
    if (!naturalInput.trim()) {
      setSubmitError("Please enter some details about your expense.");
      return;
    }

    setIsExtractPending(true);
    setSubmitError(null);

    // Offline limit check (use 0 as amount since LLM will determine the actual value)
    // We still check if the wallet itself is accessible offline
    const limitError = await checkLocalLimit(selectedWallet, 0);
    // For LLM jobs we only block if limit check returns a definitive error against 0 remaining
    // (i.e. the allocation limit is already at 0), not a generic amount check
    if (limitError && limitError.includes('remaining.') && limitError.includes('0')) {
      setSubmitError(limitError);
      setIsExtractPending(false);
      return;
    }

    try {
      const response = await ExtractExpense({
        wallet_id: selectedWallet,
        user_input: naturalInput.trim(),
      });

      if (response?.error) {
        throw new Error(response.error);
      }

      // Pull latest jobs list and cache all returned jobs in RxDB
      if (db) {
        try {
          const jobsRes = await GetLLMJobs();
          const jobsList = Array.isArray(jobsRes) ? jobsRes : Array.isArray(jobsRes?.data) ? jobsRes.data : [];
          if (jobsList.length > 0) {
            const llmJobRepo = createLlmJobRepository(db);
            for (const job of jobsList) {
              if (job?.id) {
                await llmJobRepo.upsertFromServer({
                  id: job.id,
                  user_id: job.user_id ?? '',
                  wallet_id: job.wallet_id ?? selectedWallet,
                  user_input: job.user_input ?? naturalInput.trim(),
                  status: job.status ?? 'pending',
                  retry_count: job.retry_count ?? 0,
                  expense_id: job.expense_id ?? '',
                  error_message: job.error_message ?? '',
                  llm_result: job.llm_result ?? '',
                  llm_status: job.llm_status ?? '',
                  expense_status: job.expense_status ?? '',
                  idempotency_key: job.idempotency_key ?? '',
                  is_new: false,
                  created_at: job.created_at ?? new Date().toISOString(),
                  updated_at: job.updated_at ?? new Date().toISOString(),
                });
              }
            }
          }
        } catch (jobsErr) {
          console.warn("Could not pull jobs list after NL submit:", jobsErr);
        }
      }

      router.push("/expenses");
    } catch (err: any) {
      if (err?.message?.includes("LLM call limit exceeded")) {
        setLlmLimitToast(true);
        setTimeout(() => setLlmLimitToast(false), 5000);
        return;
      }
      // Server unreachable — queue the LLM job locally for background sync
      if (db) {
        try {
          const llmJobRepo = createLlmJobRepository(db);
          await llmJobRepo.create({
            wallet_id: selectedWallet,
            user_input: naturalInput.trim(),
            user_id: userId ?? '',
            is_new: true,
          });
          router.push("/expenses/jobs");
          return;
        } catch (rxdbErr) {
          console.error("Failed to queue LLM job offline:", rxdbErr);
        }
      }
      setSubmitError(err.message || "Failed to parse natural language expense.");
    } finally {
      setIsExtractPending(false);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Rate-limit toast */}
      {llmLimitToast && (
        <div className="fixed top-4 left-1/2 z-50 -translate-x-1/2 flex gap-2 sm:gap-3 items-center rounded-xl sm:rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs sm:text-sm text-red-400 shadow-xl backdrop-blur">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-4 w-4 sm:h-5 sm:w-5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <span>You&apos;ve hit your limit for today. Try again tomorrow.</span>
        </div>
      )}
      <Navbar />
      <div className="mx-auto max-w-2xl px-4 py-10">
        {/* Back Link */}
        <div className="mb-6 flex justify-start">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/90 text-slate-300 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-500 hover:text-slate-950 shadow-sm shadow-slate-950/20"
            aria-label="Back to previous page"
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
          </button>
        </div>

        <div className="w-[94%] sm:w-full mx-auto rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-8 backdrop-blur-xl shadow-2xl">
          <div className="mb-4 sm:mb-6 border-b border-slate-800 pb-3 sm:pb-5">
            <h1 className="text-lg sm:text-2xl font-black text-white">Add New Expense</h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
              Fill in the details below to create a new expense log.
            </p>
          </div>

          {submitError && (
            <div className="mb-6 flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
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
              <span>{submitError}</span>
            </div>
          )}

          {/* Wallet Selector (Common for both modes) */}
          <div className="mb-6">
            <label className="label pb-1.5 sm:pb-2" htmlFor="wallet_select">
              <span className="label-text text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Wallet</span>
            </label>
            <div className="relative w-full" ref={dropdownRef}>
              <button
                id="wallet_select"
                type="button"
                disabled={loading}
                onClick={() => setIsDropdownOpen((prev) => !prev)}
                className="w-full flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2.5 text-left text-xs sm:text-sm text-slate-100 shadow-sm transition duration-200 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="truncate">{selectedWalletName}</span>
                <motion.span
                  animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-slate-400"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-4 w-4"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </motion.span>
              </button>

              <AnimatePresence>
                {isDropdownOpen && (
                  <motion.ul
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="absolute z-50 mt-2 max-h-60 w-full overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950 p-1.5 shadow-xl scrollbar-thin scrollbar-thumb-slate-800"
                  >
                    <li className="contents">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWallet("");
                          setIsDropdownOpen(false);
                        }}
                        className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-slate-900 hover:text-slate-100"
                      >
                        Select a wallet
                      </button>
                    </li>
                    {wallets.map((wallet) => (
                      <li key={wallet.id} className="contents">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedWallet(wallet.id);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-[#534AB7]/10 hover:text-white"
                        >
                          {wallet.name}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mode Switch Tabs */}
          <div className="mb-6 flex rounded-2xl bg-slate-950 p-1 ring-1 ring-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs sm:py-2.5 sm:text-sm font-semibold transition duration-200 ${activeTab === 'manual' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Manual Form
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("natural")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-xs sm:py-2.5 sm:text-sm font-semibold transition duration-200 ${activeTab === 'natural' ? 'bg-cyan-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.904-4.473L21 9l-3.382-3.382-7.805 10.286ZM9.813 15.904 13.25 12.5m-3.437 3.404L5 19l4.5-4.5M13.25 12.5l3.5-3.5" />
              </svg>
              AI Natural Input
            </button>
          </div>

          {activeTab === "manual" ? (
            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4 sm:gap-6">
              <input type="hidden" name="wallet_id" value={selectedWallet} />

              <div className="col-span-2 rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-950/40 p-3 sm:p-5 shadow-sm">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-200">Expense items</p>
                    <p className="text-xs sm:text-sm text-slate-400">Add item details for each expense line.</p>
                  </div>
                  <button type="button" onClick={addItem} className="btn btn-xs sm:btn-sm btn-outline border-slate-700 hover:border-slate-500 text-slate-300 hover:bg-slate-800 hover:text-white">
                    Add item
                  </button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {expenseItems.map((item, index) => {
                    const nameInvalid = item.item_name.trim() === "";
                    const quantityValue = Number(item.item_quantity);
                    const priceValue = Number(item.total_price);
                    const quantityInvalid = item.item_quantity !== "" && quantityValue < 0;
                    const priceInvalid = item.total_price !== "" && priceValue < 0;

                    return (
                      <div
                        key={item.id}
                        className="grid gap-2.5 rounded-xl border border-slate-800/80 bg-slate-900/40 p-3 shadow-sm sm:grid-cols-[1.5fr_0.9fr_0.9fr_auto] items-start"
                      >
                        <div className="space-y-1.5 sm:space-y-2 text-left">
                          <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 pb-1.5 sm:pb-2" htmlFor={`item_name_${index}`}>Item name</label>
                          <input
                            id={`item_name_${index}`}
                            type="text"
                            value={item.item_name}
                            onChange={(event) => updateItem(index, "item_name", event.target.value)}
                            placeholder="Item name"
                            className={`input input-sm sm:input-md w-full bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 ${nameInvalid ? "input-error" : ""}`}
                          />
                          {nameInvalid ? (
                            <p className="text-xs text-error">Item name is required.</p>
                          ) : null}
                        </div>

                        <div className="space-y-1.5 sm:space-y-2 text-left">
                          <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 pb-1.5 sm:pb-2" htmlFor={`quantity_${index}`}>Quantity</label>
                          <input
                            id={`quantity_${index}`}
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={item.item_quantity}
                            onChange={(event) => updateItem(index, "item_quantity", event.target.value)}
                            className={`input input-sm sm:input-md w-full bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 ${quantityInvalid ? "input-error" : ""}`}
                          />
                          {quantityInvalid ? (
                            <p className="text-xs text-error">Quantity cannot be negative.</p>
                          ) : null}
                        </div>

                        <div className="space-y-1.5 sm:space-y-2 text-left">
                          <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400 pb-1.5 sm:pb-2" htmlFor={`total_price_${index}`}>Total price</label>
                          <input
                            id={`total_price_${index}`}
                            type="number"
                            min="0"
                            inputMode="numeric"
                            value={item.total_price}
                            onChange={(event) => updateItem(index, "total_price", event.target.value)}
                            className={`input input-sm sm:input-md w-full bg-slate-950 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 ${priceInvalid ? "input-error" : ""}`}
                          />
                          {priceInvalid ? (
                            <p className="text-xs text-error">Total price cannot be negative.</p>
                          ) : null}
                        </div>

                        <div className="space-y-1.5 sm:space-y-2 flex flex-col items-center">
                          <span className="block text-sm font-semibold opacity-0 select-none pb-2">Delete</span>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="btn btn-square btn-xs sm:btn-sm btn-ghost text-red-400 hover:text-red-350 hover:bg-red-950/20"
                            aria-label="Remove item"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-4 w-4"
                            >
                              <path
                                fill="currentColor"
                                d="M6.343 17.657a1 1 0 0 1 0-1.414L10.586 12 6.343 7.757a1 1 0 0 1 1.414-1.414L12 10.586l4.243-4.243a1 1 0 0 1 1.414 1.414L13.414 12l4.243 4.243a1 1 0 0 1-1.414 1.414L12 13.414l-4.243 4.243a1 1 0 0 1-1.414 0Z"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex flex-col rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-950/40 p-3 sm:p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-xs sm:text-sm text-slate-400">Total expense amount</div>
                  <div className="text-base sm:text-xl font-semibold text-slate-100">{new Intl.NumberFormat("en-US").format(totalAmount)}</div>
                </div>

                <input type="hidden" name="expense_items" value={serializedExpenseItems} />
              </div>

              <div className="form-control">
                <label className="label pb-1.5 sm:pb-2" htmlFor="category_select">
                  <span className="label-text text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Category</span>
                </label>
                <div className="relative w-full" ref={categoryDropdownRef}>
                  <input type="hidden" name="category" value={selectedCategory} />
                  <button
                    id="category_select"
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                    className="w-full flex items-center justify-between rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2.5 text-left text-xs sm:text-sm text-slate-100 shadow-sm transition duration-200 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
                  >
                    <span className="truncate">
                      {selectedCategory || "Select category"}
                    </span>
                    <motion.span
                      animate={{ rotate: isCategoryDropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-slate-400"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </motion.span>
                  </button>

                  <AnimatePresence>
                    {isCategoryDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-800 bg-slate-950 shadow-xl overflow-hidden"
                      >
                        <ul className="max-h-48 overflow-y-auto p-1.5 scrollbar-thin scrollbar-thumb-slate-800 flex flex-col gap-0.5">
                          <li className="contents">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCategory("");
                                setIsCategoryDropdownOpen(false);
                              }}
                              className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-slate-900 hover:text-slate-100"
                            >
                              Select category
                            </button>
                          </li>
                          {categories.map((cat) => (
                            <li key={cat.id} className="contents">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(cat.name);
                                  setIsCategoryDropdownOpen(false);
                                }}
                                className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-[#534AB7]/10 hover:text-white"
                                value={cat.id}
                              >
                                {cat.name}
                              </button>
                            </li>
                          ))}
                        </ul>
                        <div className="border-t border-slate-800/80 bg-slate-950 p-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingCategory(true);
                              setIsCategoryDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl bg-slate-900/40 px-3 py-2 text-left text-xs font-semibold text-cyan-400 transition hover:bg-[#534AB7]/20 hover:text-cyan-300"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                              className="h-4 w-4"
                            >
                              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                            </svg>
                            Create New Category
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="form-control col-span-2">
                <label className="label pb-1.5 sm:pb-2" htmlFor="expense_name">
                  <span className="label-text text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Expense Name</span>
                </label>
                <input
                  id="expense_name"
                  type="text"
                  name="expense_name"
                  placeholder="Enter expense name"
                  className="input input-sm sm:input-md input-bordered w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
                />
              </div>

              <div className="form-control col-span-2">
                <label className="label pb-1.5 sm:pb-2" htmlFor="expense_details">
                  <span className="label-text text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Expense Details
                  </span>
                </label>
                <input
                  id="expense_details"
                  type="text"
                  name="expense_details"
                  placeholder="Add details"
                  className="input input-sm sm:input-md input-bordered w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
                />
              </div>

              <div className="form-control">
                <label className="label pb-1.5 sm:pb-2" htmlFor="amount">
                  <span className="label-text text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Amount</span>
                </label>
                <input
                  id="amount"
                  type="text"
                  name="amount"
                  readOnly
                  value={totalAmount}
                  className="input input-sm sm:input-md input-bordered w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950/50 px-3 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-400 placeholder-slate-500 cursor-not-allowed"
                />
                <p className="text-xs text-slate-500 mt-1">Automatically calculated from item totals.</p>
              </div>

              <div className="form-control">
                <label className="label pb-1.5 sm:pb-2" htmlFor="date">
                  <span className="label-text text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Date</span>
                </label>
                <input
                  id="date"
                  type="date"
                  name="date"
                  className="input input-sm sm:input-md input-bordered w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitPending}
                className="btn btn-sm sm:btn-md col-span-2 rounded-full border-none bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                {isSubmitPending ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="white"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="white"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Submitting…
                  </>
                ) : (
                  "Submit Expense"
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleNaturalSubmit} className="space-y-4 sm:space-y-6">
              <input type="hidden" name="wallet_id" value={selectedWallet} />

              <div className="form-control text-left">
                <label className="label pb-1.5 sm:pb-2" htmlFor="natural_input">
                  <span className="label-text text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">Describe your expense</span>
                </label>
                <textarea
                  id="natural_input"
                  rows={4}
                  value={naturalInput}
                  onChange={(e) => setNaturalInput(e.target.value)}
                  placeholder="e.g. Spent Rp 50.000 on pizza and Rp 15.000 for drinks today"
                  className="textarea textarea-bordered w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 resize-none outline-none"
                />
                <p className="text-[10px] sm:text-xs text-slate-400 mt-1.5 sm:mt-2">
                  Type details naturally including amounts, categories, or items. Our AI will extract and record it automatically.
                </p>
              </div>

              <button
                type="submit"
                disabled={isExtractPending}
                className="btn btn-sm sm:btn-md w-full rounded-full border-none bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition duration-200 flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                {isExtractPending ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="white"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="white"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Processing with AI…
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l8.904-4.473L21 9l-3.382-3.382-7.805 10.286ZM9.813 15.904 13.25 12.5m-3.437 3.404L5 19l4.5-4.5M13.25 12.5l3.5-3.5" />
                    </svg>
                    Extract Expense
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Create Category Modal */}
      <AnimatePresence>
        {isCreatingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-[92%] max-w-md rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/95 p-4 sm:p-8 shadow-2xl backdrop-blur-xl mx-auto"
            >
              {/* Modal Header */}
              <div className="mb-4 sm:mb-6 flex items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4">
                <div>
                  <h3 className="text-base sm:text-xl font-bold text-white">Create New Category</h3>
                  <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">Add a new expense category to the list.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingCategory(false);
                    setCategoryError("");
                  }}
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {categoryError && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                  {categoryError}
                </div>
              )}

              <form onSubmit={handleCreateCategorySubmit} className="space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2 text-left">
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="new_category_name">
                    Category Name
                  </label>
                  <input
                    id="new_category_name"
                    type="text"
                    required
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g. Food & Beverage"
                    className="w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:space-y-2 text-left">
                  <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="new_category_desc">
                    Description
                  </label>
                  <textarea
                    id="new_category_desc"
                    value={newCategoryDesc}
                    onChange={(e) => setNewCategoryDesc(e.target.value)}
                    placeholder="Describe what expenses belong to this category..."
                    className="w-full h-20 sm:h-24 rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3 py-1.5 sm:px-4 sm:py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-3 sm:pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCategory(false);
                      setCategoryError("");
                    }}
                    className="rounded-full border border-slate-700 px-4 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-300 hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={categorySubmitLoading}
                    className="rounded-full px-5 sm:px-6 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md hover:opacity-90 transition disabled:opacity-50"
                  >
                    {categorySubmitLoading ? "Creating..." : "Create Category"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
