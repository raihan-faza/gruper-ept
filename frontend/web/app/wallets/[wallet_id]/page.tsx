"use client"

import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { useState, useEffect, use } from 'react'
import { useUserId } from '@/lib/auth-client'
import { GetWallet, GetWalletMembers } from '@/app/api/wallet/wallet'
import { GetAllExpenses } from '@/app/api/expense/expense'
import { useDatabase } from '@/lib/db/hooks'
import { createWalletRepository } from '@/lib/db/repositories/wallet.repository'
import { createExpenseRepository } from '@/lib/db/repositories/expense.repository'

import { GetUserProfile } from '@/app/api/user/user'

export default function WalletDetail({ params }: { params: Promise<{ wallet_id: string }> }) {
    const { wallet_id } = use(params)
    const userId = useUserId()
    const db = useDatabase()

    const [wallet, setWallet] = useState<any>(null)
    const [members, setMembers] = useState<{ id: string; name: string }[]>([])
    const [expensesList, setExpensesList] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function loadData() {
            setIsLoading(true)
            setError(null)

            const currencyFormatter = (num: number, currCode: string) => {
                try {
                    return new Intl.NumberFormat(currCode === 'IDR' ? 'id-ID' : 'en-US', {
                        style: 'currency',
                        currency: currCode,
                        maximumFractionDigits: 0,
                    }).format(num)
                } catch {
                    return `${currCode} ${num.toLocaleString()}`
                }
            }

            const renderData = async (wData: any, mData: any[], eData: any[]) => {
                if (!wData) return;
                const curr = wData.currency || 'IDR'
                const rawBalance = wData.total_balance ?? wData.balance ?? 0

                let resolvedMembersList = mData
                if (!resolvedMembersList || resolvedMembersList.length === 0) {
                    resolvedMembersList = [
                        {
                            user_id: wData.owner_id || 'Owner',
                            allocation_limit: wData.available_balance ?? 0,
                            allocation_used: 0,
                        }
                    ]
                }

                const currentUserId = userId || 'offline-user'
                const currentUserMember = resolvedMembersList.find((m: any) => String(m.user_id ?? m.userId) === String(currentUserId))
                const currentUserAllocationLimit = currentUserMember ? (currentUserMember.allocation_limit ?? currentUserMember.allocation ?? 0) : 0
                const currentUserAllocationUsed = currentUserMember ? (currentUserMember.allocation_used ?? currentUserMember.allocation_used ?? 0) : 0
                const currentUserAvailableBalance = currentUserAllocationLimit - currentUserAllocationUsed
                const mappedWallet = {
                    id: wData.id ?? wData.wallet_id ?? wallet_id,
                    name: wData.name ?? wData.wallet_name ?? 'Untitled Wallet',
                    balance: currencyFormatter(rawBalance, curr),
                    allocated: currencyFormatter(resolvedMembersList.reduce((sum, m) => sum + (m.allocation_limit ?? m.allocation ?? 0), 0), curr),
                    availableBalance: currencyFormatter(currentUserAvailableBalance, curr),
                    owner: wData.owner_id ?? 'Owner',
                    currency: curr,
                }

                const userCache: Record<string, string> = {}

                const resolvedMembers = await Promise.all(
                    resolvedMembersList.map(async (m: any) => {
                        const userId = m.user_id || m.userId || 'User'
                        if (m.username) {
                            userCache[userId] = m.username
                            return { id: userId, name: m.username }
                        }
                        if (userCache[userId]) {
                            return { id: userId, name: userCache[userId] }
                        }
                        try {
                            const userProfile = await GetUserProfile(userId)
                            if (userProfile && (userProfile.name || userProfile.username)) {
                                const username = userProfile.name ?? userProfile.username
                                userCache[userId] = username
                                return { id: userId, name: username }
                            }
                        } catch (err) {
                            console.error(`Failed to fetch profile for user ${userId}:`, err)
                        }
                        return { id: userId, name: userId }
                    })
                )

                const isOwner = mappedWallet.owner === currentUserId

                const sortedExpenses = eData.sort(
                    (a: any, b: any) =>
                        new Date(b.created_at ?? b.date ?? b.time).getTime() -
                        new Date(a.created_at ?? a.date ?? a.time).getTime()
                )

                const mappedExpenses = await Promise.all(sortedExpenses.map(async (e: any) => {
                    const userId = e.user_id ?? e.username ?? 'User'
                    let userName = userId
                    if (userId !== 'User') {
                        if (userCache[userId]) {
                            userName = userCache[userId]
                        } else {
                            try {
                                const userProfile = await GetUserProfile(userId)
                                if (userProfile && (userProfile.name || userProfile.username)) {
                                    const username = userProfile.name ?? userProfile.username
                                    userCache[userId] = username
                                    userName = username
                                }
                            } catch (err) {
                                console.error(`Failed to fetch profile for user ${userId}:`, err)
                            }
                        }
                    }
                    return {
                        id: String(e.id),
                        title: e.expense_name ?? e.description ?? 'Expense',
                        user: userName,
                        userId: userId,
                        time: e.created_at ?? e.date ?? e.time,
                        total: currencyFormatter(e.amount ?? 0, curr),
                    }
                }))

                const visibleExpenses = isOwner
                    ? mappedExpenses
                    : mappedExpenses.filter((e: any) => e.userId === currentUserId)

                setWallet(mappedWallet)
                setMembers(resolvedMembers)
                setExpensesList(visibleExpenses)
            }

            // Use outer scope userId
            try {
                // 1. Initial Load: Try RxDB first
                let walletData: any = null
                let membersData: any[] = []
                let expensesData: any[] = []

                if (db) {
                    const walletRepo = createWalletRepository(db)
                    const expenseRepo = createExpenseRepository(db)
                    const localW = await walletRepo.findById(wallet_id)
                    if (localW) {
                        walletData = {
                            id: localW.id,
                            name: localW.name,
                            total_balance: localW.total_balance,
                            owner_id: localW.owner_id,
                            currency: localW.currency,
                        }
                        expensesData = await expenseRepo.findByWallet(wallet_id, userId)
                        await renderData(walletData, membersData, expensesData)
                        setIsLoading(false)
                    }
                }

                // 2. Fetch and Reconcile with Server in Background
                try {
                    let serverWallet: any = null
                    let serverMembers: any[] = []
                    let serverExpenses: any[] = []

                    try {
                        const walletRes = await GetWallet(wallet_id)
                        if (walletRes && walletRes.wallet) {
                            serverWallet = walletRes.wallet
                            serverMembers = walletRes.members || []
                        } else {
                            serverWallet = walletRes
                        }
                    } catch (apiErr) {
                        console.warn("Failed to fetch wallet from server:", apiErr)
                    }

                    if (serverWallet) {
                        if (db) {
                            const walletRepo = createWalletRepository(db)
                            const localW = await walletRepo.findById(wallet_id)
                            if (localW && localW.is_new && localW.idempotency_key === serverWallet.idempotency_key) {
                                await walletRepo.update(localW.id, { is_new: false, is_synced: true } as any)
                            }
                            const currentUserId = userId || 'offline-user'
                            const currentUserMember = serverMembers.find((m: any) => String(m.user_id ?? m.userId) === String(currentUserId))
                            const currentUserAllocationLimit = currentUserMember ? (currentUserMember.allocation_limit ?? currentUserMember.allocation ?? 0) : 0

                            await walletRepo.upsertFromServer({
                                id: serverWallet.id ?? wallet_id,
                                name: serverWallet.name ?? serverWallet.wallet_name ?? '',
                                total_balance: serverWallet.total_balance ?? serverWallet.balance ?? 0,
                                owner_id: serverWallet.owner_id ?? '',
                                currency: serverWallet.currency ?? 'IDR',
                                available_balance: currentUserAllocationLimit,
                                idempotency_key: serverWallet.idempotency_key ?? '',
                                is_new: false,
                                created_at: serverWallet.created_at ?? new Date().toISOString(),
                                updated_at: serverWallet.updated_at ?? new Date().toISOString(),
                            })
                        }
                        walletData = serverWallet
                        if (serverMembers && serverMembers.length > 0) {
                            membersData = serverMembers
                        }
                    }

                    try {
                        const apiExpenses = await GetAllExpenses(wallet_id)
                        const list = Array.isArray(apiExpenses)
                            ? apiExpenses
                            : Array.isArray(apiExpenses?.expenses)
                                ? apiExpenses.expenses
                                : Array.isArray(apiExpenses?.data)
                                    ? apiExpenses.data
                                    : []
                        serverExpenses = list.filter((e: any) => String(e.wallet_id ?? e.walletId) === String(wallet_id))
                    } catch (apiErr) {
                        console.warn("Failed to fetch expenses from server:", apiErr)
                    }

                    if (serverExpenses && serverExpenses.length > 0) {
                        if (db) {
                            const expenseRepo = createExpenseRepository(db)
                            const serverIdempKeys = new Map(serverExpenses.map((i: any) => [i.idempotency_key, i]))
                            const serverIds: string[] = []

                            for (const item of serverExpenses) {
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

                            const localExp = await expenseRepo.findByWallet(wallet_id, userId)
                            for (const local of localExp) {
                                if (local.is_new && local.idempotency_key && serverIdempKeys.has(local.idempotency_key)) {
                                    await expenseRepo.update(local.id, { is_new: false, is_synced: true } as any)
                                }
                            }

                            await expenseRepo.deleteSyncedNotInList(serverIds, wallet_id, userId)
                            expensesData = await expenseRepo.findByWallet(wallet_id, userId)
                        } else {
                            expensesData = serverExpenses
                        }
                    }

                    if (walletData) {
                        await renderData(walletData, membersData, expensesData)
                    } else if (db) {
                        const walletRepo = createWalletRepository(db)
                        const expenseRepo = createExpenseRepository(db)
                        const finalLocalW = await walletRepo.findById(wallet_id)
                        if (finalLocalW) {
                            const finalLocalExp = await expenseRepo.findByWallet(wallet_id, userId)
                            await renderData(finalLocalW, [], finalLocalExp)
                        }
                    }

                } catch (err: any) {
                    console.error("Reconciliation background error:", err)
                    if (!walletData) {
                        setError(err.message || "Failed to load wallet details")
                    }
                }
            } catch (err: any) {
                console.error(err)
                setError(err.message || "Failed to load wallet details")
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [wallet_id, userId, db])

    if (isLoading) {
        return (
            <main className="min-h-screen bg-slate-950 text-slate-100">
                <Navbar />
                <div className="mx-auto max-w-4xl px-4 py-20 text-center">
                    <div className="relative mx-auto h-12 w-12 mb-4">
                        <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 animate-spin"></div>
                    </div>
                    <p className="text-sm text-slate-400">Loading wallet details...</p>
                </div>
            </main>
        )
    }

    if (error || !wallet) {
        return (
            <main className="min-h-screen bg-slate-950 text-slate-100">
                <Navbar />
                <div className="mx-auto max-w-4xl px-4 py-20 text-center">
                    <h2 className="text-xl font-semibold text-slate-300">{error || "Wallet not found"}</h2>
                    <Link href="/wallets" className="mt-4 inline-block text-sm text-cyan-400 hover:underline">
                        Back to Wallets
                    </Link>
                </div>
            </main>
        )
    }

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <Navbar />
            <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
                <div className="mb-4 sm:mb-6 flex justify-start">
                    <Link
                        href="/wallets"
                        className="inline-flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/95 text-slate-100 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-500 hover:text-slate-950 shadow-sm shadow-slate-950/20"
                        aria-label="Back to wallets"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-4 sm:size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                        </svg>
                    </Link>
                </div>
                <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/95 p-4 sm:p-6">
                    <div className="mb-4 sm:mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-left">
                            <p className="text-xs sm:text-sm text-cyan-400 uppercase tracking-[0.3em]">Wallet</p>
                            <h1 className="mt-1 sm:mt-2 text-xl sm:text-2xl font-semibold text-white">{wallet.name}</h1>
                            <div className="mt-3 grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-[10px] sm:text-xs text-slate-400">Total balance</p>
                                    <p className="text-sm sm:text-base font-semibold text-white mt-0.5">{wallet.balance}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] sm:text-xs text-slate-400">Available balance to use</p>
                                    <p className="text-sm sm:text-base font-semibold text-cyan-400 mt-0.5">{wallet.availableBalance}</p>
                                </div>
                            </div>
                            {/* <p className="text-[10px] sm:text-xs text-slate-400 mt-3">Allocated: <span className="text-white font-medium">{wallet.allocated}</span></p> */}
                        </div>
                        <div className="flex items-center w-full sm:w-auto">
                            <Link
                                href={`/wallets/${wallet.id}/dashboard`}
                                className="rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 sm:px-5 sm:py-2.5 text-xs sm:text-sm font-bold shadow-md transition hover:-translate-y-0.5 w-full sm:w-auto text-center"
                            >
                                Go to Dashboard
                            </Link>
                        </div>
                    </div>

                    <div className="mt-4 sm:mt-6 grid gap-3 sm:gap-4 sm:grid-cols-2">
                        <div className="rounded-lg sm:rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 sm:p-4">
                            <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold">Members</p>
                            <ul className="mt-2 sm:mt-3 space-y-2">
                                {members.map((m) => (
                                    <li key={m.id} className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-800/40 flex items-center justify-center text-[10px] sm:text-xs text-slate-200">{m.name[0]?.toUpperCase() || 'U'}</div>
                                            <span className="text-xs sm:text-sm text-white">{m.name}</span>
                                        </div>
                                        {wallet.owner === m.id && <span className="text-[10px] sm:text-xs text-cyan-300">Owner</span>}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-lg sm:rounded-xl border border-slate-800 bg-slate-900/90 p-3.5 sm:p-4">
                            <p className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold">Recent expenses</p>
                            <div className="mt-2 sm:mt-3 space-y-3">
                                {expensesList.length > 0 ? (
                                    expensesList.map((e) => (
                                        <div key={e.id} className="flex items-center justify-between gap-4">
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs sm:text-sm font-medium text-white truncate">{e.title}</p>
                                                <p className="text-[10px] sm:text-xs text-slate-400 truncate">by {e.user} • {new Date(e.time).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-xs sm:text-sm font-semibold text-white shrink-0">{e.total}</div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs sm:text-sm text-slate-400">No recent expenses to show</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    )
}
