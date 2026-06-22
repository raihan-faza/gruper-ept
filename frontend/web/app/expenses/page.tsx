'use client'

import Navbar from "@/components/Navbar"
import BackToTopButton from "@/components/BackToTopButton"
import { useState, useEffect } from "react"
import Link from "next/link"
import { authClient } from "@/lib/auth-client"
import { GetAllExpenses, GetAllExpenseCategories, GetExpenseCategory } from "@/app/api/expense/expense"
import { GetAllWallets } from "@/app/api/wallet/wallet"
import { GetLLMJobs } from "@/app/api/llm/llm"
import { useDatabase } from "@/lib/db/hooks"
import { createExpenseRepository } from "@/lib/db/repositories/expense.repository"

type Expense = {
    id: string;
    title: string;
    wallet: string;
    category: string;
    status: string;
    total: string;
    time: string;
}

type Filters = {
    wallets: string[]
    categories: string[]
    statuses: string[]
}

export default function Expenses() {
    const { data: session } = authClient.useSession()
    const db = useDatabase()
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isFilterOpen, setIsFilterOpen] = useState<Boolean>(false)
    const [tempFilters, setTempFilters] = useState<Filters>({ wallets: [], categories: [], statuses: [] })
    const [appliedFilters, setAppliedFilters] = useState<Filters>({ wallets: [], categories: [], statuses: [] })
    const [sortBy, setSortBy] = useState<'wallet' | 'time' | 'total' | 'category'>('time')
    const [pendingJobsCount, setPendingJobsCount] = useState<number>(0)

    useEffect(() => {
        async function fetchExpenses() {
            setIsLoading(true)
            setError(null)

            // Helper: map a raw expense item to UI Expense shape
            const buildWalletMap = (list: any[]) => {
                const map: Record<string, string> = {}
                list.forEach((w: any) => {
                    const id = String(w.id ?? w.wallet_id ?? '')
                    const name = w.name ?? w.wallet_name ?? ''
                    if (id) map[id] = name
                })
                return map
            }
            const DEFAULT_CAT_MAP: Record<string, string> = {
                "1": "Food & Groceries", "2": "Transportation", "3": "Utilities",
                "4": "Entertainment", "5": "Health", "6": "Shopping", "7": "Other"
            }
            const normalizeExpense = (item: any, wMap: Record<string, string>, cMap: Record<string, string>): Expense => {
                const wId = String(item.wallet_id ?? item.wallet ?? '')
                const cId = String(item.category_id ?? item.category ?? '')
                return {
                    id: String(item.id ?? item.expense_id ?? ''),
                    title: item.expense_name ?? item.title ?? '',
                    wallet: wMap[wId] || wId || 'Unknown Wallet',
                    category: cMap[cId] || cId || 'Uncategorized',
                    status: item.status ?? 'pending',
                    total: item.amount != null
                        ? `Rp ${Number(item.amount).toLocaleString('id-ID')}`
                        : (item.total ?? ''),
                    time: item.date ?? item.created_at ?? item.time ?? '',
                }
            }

            try {
                // 1. Load from RxDB first → render cached data immediately
                if (db) {
                    const expenseRepo = createExpenseRepository(db)
                    const localExpenses = await expenseRepo.findAll()
                    if (localExpenses.length > 0) {
                        setExpenses(localExpenses.map(e => ({
                            id: e.id,
                            title: e.expense_name ?? '',
                            wallet: e.wallet_id ?? '',
                            category: DEFAULT_CAT_MAP[String(e.category_id ?? '')] || String(e.category_id ?? ''),
                            status: e.status ?? 'pending',
                            total: `Rp ${Number(e.amount).toLocaleString('id-ID')}`,
                            time: e.date ?? e.created_at ?? '',
                        })))
                        setIsLoading(false)
                    }

                    // 2. Fetch from server in background
                    try {
                        // Fetch wallets for name mapping
                        let wMap: Record<string, string> = {}
                        try {
                            const walletsData = await GetAllWallets()
                            const wList = Array.isArray(walletsData) ? walletsData : Array.isArray(walletsData?.data) ? walletsData.data : []
                            wMap = buildWalletMap(wList)
                        } catch { /* use empty map */ }

                        // Fetch category map
                        const cMap = { ...DEFAULT_CAT_MAP }
                        try {
                            const categoriesData = await GetAllExpenseCategories()
                            const cList = Array.isArray(categoriesData) ? categoriesData : Array.isArray(categoriesData?.data) ? categoriesData.data : []
                            cList.forEach((c: any) => {
                                const id = String(c.id ?? c.ID ?? '');
                                const name = c.name ?? c.category_name ?? ''
                                if (id) cMap[id] = name
                            })
                        } catch { /* use defaults */ }

                        const data = await GetAllExpenses(null)
                        const serverList: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []

                        if (serverList.length > 0) {
                            const serverIdempKeys = new Map(serverList.map((i: any) => [i.idempotency_key, i]))
                            const serverIds: string[] = []

                            // 3a. Upsert all server items into RxDB
                            for (const item of serverList) {
                                const id = String(item.id ?? item.expense_id ?? '')
                                if (!id) continue
                                serverIds.push(id)
                                await expenseRepo.upsertFromServer({
                                    id,
                                    user_id: item.user_id ?? '',
                                    wallet_id: item.wallet_id ?? '',
                                    category_id: item.category_id ?? 0,
                                    expense_name: item.expense_name ?? item.title ?? '',
                                    expense_details: item.expense_details ?? '',
                                    expense_items: item.expense_items ?? [],
                                    amount: item.amount ?? 0,
                                    status: item.status ?? 'pending',
                                    date: item.date ?? new Date().toISOString(),
                                    idempotency_key: item.idempotency_key ?? '',
                                    is_new: false,
                                    created_at: item.created_at ?? new Date().toISOString(),
                                    updated_at: item.updated_at ?? new Date().toISOString(),
                                })
                            }

                            // 3b. Mark local drafts confirmed by idempotency key
                            for (const local of localExpenses) {
                                if (local.is_new && local.idempotency_key && serverIdempKeys.has(local.idempotency_key)) {
                                    await expenseRepo.update(local.id, { is_new: false, is_synced: true } as any)
                                }
                            }

                            // 3c. Prune stale synced local caches
                            await expenseRepo.deleteSyncedNotInList(serverIds)

                            // 4. Re-render from reconciled RxDB
                            const reconciled = await expenseRepo.findAll()
                            setExpenses(reconciled.map(e => normalizeExpense(e, wMap, cMap)))
                        }
                    } catch (apiErr) {
                        console.warn("Server unreachable, serving cached expenses:", apiErr)
                    }
                } else {
                    // No local DB — server-only path
                    let wMap: Record<string, string> = {}
                    try {
                        const walletsData = await GetAllWallets()
                        const wList = Array.isArray(walletsData) ? walletsData : Array.isArray(walletsData?.data) ? walletsData.data : []
                        wMap = buildWalletMap(wList)
                    } catch { /* use empty map */ }
                    const cMap = { ...DEFAULT_CAT_MAP }
                    const data = await GetAllExpenses(null)
                    const rawList: any[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
                    setExpenses(rawList.map(e => normalizeExpense(e, wMap, cMap)))
                }
            } catch (err) {
                console.error(err)
                setError('Failed to load expenses. Please try again.')
            } finally {
                setIsLoading(false)
            }
        }

        fetchExpenses()

        // Fetch jobs count
        async function fetchJobs() {
            try {
                const res = await GetLLMJobs()
                if (Array.isArray(res)) {
                    const pending = res.filter((j: any) => j.status === 'pending' || j.status === 'processing')
                    setPendingJobsCount(pending.length)
                }
            } catch (err) {
                console.error("Failed to fetch LLM jobs count:", err)
            }
        }

        fetchJobs()
        const intervalId = setInterval(fetchJobs, 5000)

        return () => clearInterval(intervalId)
    }, [session])

    // Derive filter options dynamically from fetched data
    const WALLETS = [...new Set(expenses.map((e) => e.wallet).filter(Boolean))]
    const CATEGORIES = [...new Set(expenses.map((e) => e.category).filter(Boolean))]
    const STATUSES = [...new Set(expenses.map((e) => e.status).filter(Boolean))]

    const handleTempFilterChange = (type: 'wallets' | 'categories' | 'statuses', value: string) => {
        setTempFilters((prev: Filters) => ({
            ...prev,
            [type]: prev[type].includes(value)
                ? prev[type].filter((item) => item !== value)
                : [...prev[type], value],
        }))
    }

    const handleApplyFilters = () => {
        setAppliedFilters(tempFilters)
        setIsFilterOpen(false)
    }

    const handleResetFilters = () => {
        setAppliedFilters({ wallets: [], categories: [], statuses: [] })
        setTempFilters({ wallets: [], categories: [], statuses: [] })
        setIsFilterOpen(false)
    }

    const filteredExpenses = expenses.filter((expense) => {
        if (appliedFilters.wallets.length > 0 && !appliedFilters.wallets.includes(expense.wallet)) return false
        if (appliedFilters.categories.length > 0 && !appliedFilters.categories.includes(expense.category)) return false
        if (appliedFilters.statuses.length > 0 && !appliedFilters.statuses.includes(expense.status)) return false
        return true
    })

    const sortedExpenses = [...filteredExpenses].sort((a, b) => {
        const value = (expense: Expense) => {
            switch (sortBy) {
                case 'wallet':
                    return expense.wallet.toLowerCase()
                case 'category':
                    return expense.category.toLowerCase()
                case 'time':
                    return new Date(expense.time).getTime()
                case 'total':
                    return parseInt(expense.total.replace(/[^0-9]/g, ''), 10)
                default:
                    return expense.wallet.toLowerCase()
            }
        }

        const first = value(a)
        const second = value(b)

        if (typeof first === 'number' && typeof second === 'number') {
            return sortBy === 'time' || sortBy === 'total' ? second - first : first - second
        }

        return String(first).localeCompare(String(second))
    })

    const hasActiveFilters = appliedFilters.wallets.length > 0 || appliedFilters.categories.length > 0 || appliedFilters.statuses.length > 0

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <Navbar />
            <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Expenses</p>
                    {/* <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        Recent expense activity
                    </h1>
                    <p className="mt-3 text-sm text-slate-300 sm:text-base">
                        Track the latest expenses across your wallets and see status, category, and total amount at a glance.
                    </p> */}
                </div>

                <div className="mt-8 flex w-full items-center">
                    <div className="flex w-full items-center gap-1.5 sm:gap-3">
                        <button
                            onClick={() => setIsFilterOpen(true)}
                            className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 sm:px-6 sm:py-2 text-[10px] sm:text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 shrink-0"
                        >
                            Filter
                        </button>
                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="rounded-full bg-red-500/20 px-3 py-1.5 sm:px-6 sm:py-2 text-[10px] sm:text-sm font-semibold text-red-300 transition hover:bg-red-500/30 ring-1 ring-red-400/20 shrink-0 whitespace-nowrap"
                            >
                                Reset Filters
                            </button>
                        )}
                        <div className="flex items-center gap-1.5 sm:gap-3 rounded-full border border-slate-800 bg-slate-900/80 px-2.5 py-1 sm:px-4 sm:py-2 text-[10px] sm:text-sm text-slate-100 shrink-0">
                            <label htmlFor="sort-by" className="text-slate-300">Sort by</label>
                            <select
                                id="sort-by"
                                value={sortBy}
                                onChange={(event) => setSortBy(event.target.value as 'wallet' | 'time' | 'total' | 'category')}
                                className="rounded-full bg-slate-950 px-1 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-sm text-slate-100 outline-none ring-1 ring-slate-700 transition hover:ring-cyan-400"
                            >
                                <option value="wallet">Wallet</option>
                                <option value="time">Time</option>
                                <option value="total">Total</option>
                                <option value="category">Category</option>
                            </select>
                        </div>
                        <Link
                            href="/expenses/jobs"
                            className="relative flex items-center gap-1.5 sm:gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 sm:px-6 sm:py-2 text-[10px] sm:text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-800 ml-auto shrink-0"
                        >
                            <span>AI Tasks</span>
                            {pendingJobsCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 text-[8px] sm:text-xs font-bold text-slate-950 ring-2 ring-slate-950">
                                    {pendingJobsCount > 5 ? "5+" : pendingJobsCount}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {hasActiveFilters && (
                    <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                        <p className="text-sm font-semibold text-slate-300">Active Filters:</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {appliedFilters.wallets.map((wallet) => (
                                <span key={wallet} className="inline-flex items-center rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-medium text-cyan-300 ring-1 ring-cyan-400/20">
                                    Wallet: {wallet}
                                </span>
                            ))}
                            {appliedFilters.categories.map((category) => (
                                <span key={category} className="inline-flex items-center rounded-full bg-cyan-500/15 px-3 py-1 text-xs font-medium text-cyan-300 ring-1 ring-cyan-400/20">
                                    Category: {category}
                                </span>
                            ))}
                            {appliedFilters.statuses.map((status) => (
                                <span key={status} className="inline-flex items-center rounded-full bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-300 ring-1 ring-blue-400/20">
                                    Status: {status}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {isFilterOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                        <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6">
                            <h2 className="text-xl font-semibold text-white">Filter Expenses</h2>

                            <div className="mt-6 space-y-6">
                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Wallets</h3>
                                    <div className="mt-3 space-y-2">
                                        {WALLETS.map((wallet) => (
                                            <label key={wallet} className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={tempFilters.wallets.includes(wallet)}
                                                    onChange={() => handleTempFilterChange('wallets', wallet)}
                                                    className="rounded border-slate-600 bg-slate-800 text-cyan-500"
                                                />
                                                <span className="text-sm text-slate-200">{wallet}</span>
                                            </label>
                                        ))}
                                        {WALLETS.length === 0 && (
                                            <p className="text-xs text-slate-500">No wallets available</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Categories</h3>
                                    <div className="mt-3 space-y-2">
                                        {CATEGORIES.map((category) => (
                                            <label key={category} className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={tempFilters.categories.includes(category)}
                                                    onChange={() => handleTempFilterChange('categories', category)}
                                                    className="rounded border-slate-600 bg-slate-800 text-cyan-500"
                                                />
                                                <span className="text-sm text-slate-200">{category}</span>
                                            </label>
                                        ))}
                                        {CATEGORIES.length === 0 && (
                                            <p className="text-xs text-slate-500">No categories available</p>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-300">Status</h3>
                                    <div className="mt-3 space-y-2">
                                        {STATUSES.map((status) => (
                                            <label key={status} className="flex items-center gap-3 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={tempFilters.statuses.includes(status)}
                                                    onChange={() => handleTempFilterChange('statuses', status)}
                                                    className="rounded border-slate-600 bg-slate-800 text-cyan-500"
                                                />
                                                <span className="text-sm text-slate-200 capitalize">{status}</span>
                                            </label>
                                        ))}
                                        {STATUSES.length === 0 && (
                                            <p className="text-xs text-slate-500">No statuses available</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                <button
                                    onClick={() => setIsFilterOpen(false)}
                                    className="flex-1 rounded-full border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-slate-500 hover:bg-slate-700"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApplyFilters}
                                    className="flex-1 rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-400"
                                >
                                    Apply
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="mt-6 sm:mt-10 grid grid-cols-2 gap-2.5 sm:gap-6 lg:grid-cols-3">
                    {isLoading ? (
                        // Loading skeleton
                        Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="animate-pulse rounded-xl sm:rounded-3xl border border-slate-800 bg-slate-900/95 p-2.5 sm:p-6"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-4">
                                    <div className="flex-1 space-y-2 sm:space-y-3 min-w-0">
                                        <div className="h-2 w-12 sm:h-3 sm:w-24 rounded bg-slate-700" />
                                        <div className="h-3.5 w-20 sm:h-5 sm:w-40 rounded bg-slate-700" />
                                    </div>
                                    <div className="h-4 w-12 sm:h-7 sm:w-20 rounded-full bg-slate-700 w-fit shrink-0" />
                                </div>
                                <div className="mt-2.5 sm:mt-6 space-y-1.5 sm:space-y-3 rounded-lg sm:rounded-3xl bg-slate-950/80 p-2 sm:p-5 ring-1 ring-slate-700/80">
                                    {Array.from({ length: 4 }).map((_, j) => (
                                        <div key={j} className="flex items-center justify-between gap-1.5 sm:gap-3">
                                            <div className="h-2 w-8 sm:h-3 sm:w-16 rounded bg-slate-700" />
                                            <div className="h-2 w-12 sm:h-3 sm:w-24 rounded bg-slate-700" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : error ? (
                        <div className="col-span-full flex flex-col items-center justify-center rounded-xl sm:rounded-2xl border border-red-800/40 bg-red-900/10 py-10 sm:py-16 gap-3">
                            <p className="text-red-400 text-xs sm:text-sm font-medium">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="rounded-full border border-red-700/40 bg-red-500/10 px-4 py-1.5 sm:px-5 sm:py-2 text-[10px] sm:text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                            >
                                Retry
                            </button>
                        </div>
                    ) : sortedExpenses.length > 0 ? (
                        sortedExpenses.map((expense) => (
                            <Link
                                href={`/expenses/${expense.id}`}
                                key={expense.id}
                                className="block text-left rounded-xl sm:rounded-3xl border border-slate-800 bg-slate-900/95 p-2.5 sm:p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)] transition duration-200 hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900 group"
                            >
                                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-4 min-w-0">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] sm:text-sm font-medium uppercase tracking-[0.15em] sm:tracking-[0.24em] text-slate-400 truncate" title={expense.category}>{expense.category}</p>
                                        <h2 className="mt-1 sm:mt-2 text-xs sm:text-xl font-semibold text-white group-hover:text-cyan-400 transition truncate" title={expense.title}>{expense.title}</h2>
                                    </div>
                                    <span className={`rounded-full px-1.5 py-0.5 sm:px-3 sm:py-1 text-[8px] sm:text-sm font-semibold shrink-0 w-fit ${['completed', 'paid', 'success'].includes(expense.status.toLowerCase()) ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20' : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20'}`}>
                                        {expense.status}
                                    </span>
                                </div>

                                <div className="mt-2.5 sm:mt-6 space-y-1.5 sm:space-y-3 rounded-lg sm:rounded-3xl bg-slate-950/80 p-2 sm:p-5 ring-1 ring-slate-700/80">
                                    <div className="flex items-center justify-between gap-1.5 sm:gap-3 text-[9px] sm:text-sm text-slate-300">
                                        <span className="shrink-0">Wallet</span>
                                        <span className="font-medium text-white truncate text-right max-w-[65%]" title={expense.wallet}>{expense.wallet}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1.5 sm:gap-3 text-[9px] sm:text-sm text-slate-300">
                                        <span className="shrink-0">Category</span>
                                        <span className="font-medium text-white truncate text-right max-w-[65%]" title={expense.category}>{expense.category}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1.5 sm:gap-3 text-[9px] sm:text-sm text-slate-300">
                                        <span className="shrink-0">Time</span>
                                        <span className="font-medium text-white truncate text-right max-w-[65%]">
                                            {expense.time && !isNaN(new Date(expense.time).getTime()) ? (
                                                new Date(expense.time).toLocaleString()
                                            ) : (
                                                <span className="text-slate-500 italic">No time data</span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1.5 sm:gap-3 text-[9px] sm:text-sm text-slate-300">
                                        <span className="shrink-0">Total</span>
                                        <span className="font-semibold text-white truncate text-right max-w-[65%]">{expense.total}</span>
                                    </div>
                                </div>
                            </Link>
                        ))
                    ) : (
                        <div className="col-span-full flex items-center justify-center rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/50 py-10 sm:py-16">
                            <p className="text-xs sm:text-sm text-slate-400">
                                {hasActiveFilters ? 'No expenses match your filters' : 'No expenses found'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
            <BackToTopButton />
        </main>
    )
}
