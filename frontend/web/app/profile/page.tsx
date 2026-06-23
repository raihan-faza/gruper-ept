'use client'

import Link from "next/link"
import Navbar from "@/components/Navbar"
import { useState, useEffect } from "react"
import { authClient } from "@/lib/auth-client"
import { GetCurrentUser } from "@/app/api/user/user"
import { useDatabase } from "@/lib/db/hooks"
import { createWalletRepository } from "@/lib/db/repositories/wallet.repository"
import { createExpenseRepository } from "@/lib/db/repositories/expense.repository"

type UserProfile = {
    username: string
    first_name: string
    last_name: string
    email: string
    phone_number?: string
    created_at: string
    totalWallets: number
    totalExpenses: number
    totalAmount: string
}

export default function Profile() {
    const { data: session } = authClient.useSession()
    const db = useDatabase()
    const [user, setUser] = useState<UserProfile | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchUser() {
            if (!session) return
            setIsLoading(true)
            setError(null)

            // 1. Initial Load: Try RxDB first
            if (db) {
                try {
                    const userId = session?.user?.id ?? ""
                    const walletRepo = createWalletRepository(db)
                    const expenseRepo = createExpenseRepository(db)
                    const localWallets = await walletRepo.findAll(userId)
                    const localExpenses = await expenseRepo.findAll(userId)

                    const totalWallets = localWallets.length
                    const totalExpenses = localExpenses.length
                    const totalAmountVal = localExpenses.reduce((sum, e) => sum + (e.amount ?? 0), 0)

                    const sUser = session?.user as any
                    setUser({
                        username: sUser?.username ?? sUser?.name ?? '',
                        first_name: sUser?.first_name ?? '',
                        last_name: sUser?.last_name ?? '',
                        email: sUser?.email ?? '',
                        phone_number: sUser?.phone_number ?? undefined,
                        created_at: sUser?.createdAt ?? sUser?.created_at ?? new Date().toISOString(),
                        totalWallets,
                        totalExpenses,
                        totalAmount: `Rp ${totalAmountVal.toLocaleString('id-ID')}`,
                    })
                    setIsLoading(false)
                } catch (dbErr) {
                    console.warn("Failed to load profile details from RxDB:", dbErr)
                }
            }

            // 2. Background Fetch & Reconcile with Server
            try {
                const data = await GetCurrentUser()
                console.log("data", data)
                const raw = data?.data ?? data ?? {}
                setUser({
                    username: raw.username ?? raw.name ?? session?.user?.name ?? '',
                    first_name: raw.first_name ?? (session?.user as any)?.first_name ?? '',
                    last_name: raw.last_name ?? (session?.user as any)?.last_name ?? '',
                    email: raw.email ?? session?.user?.email ?? '',
                    phone_number: raw.phone_number ?? (session?.user as any)?.phone_number ?? undefined,
                    created_at: raw.created_at ?? raw.joined ?? (session?.user as any)?.createdAt ?? (session?.user as any)?.created_at ?? new Date().toISOString(),
                    totalWallets: raw.total_wallets ?? raw.totalWallets ?? 0,
                    totalExpenses: raw.total_expenses ?? raw.totalExpenses ?? 0,
                    totalAmount: raw.total_amount != null
                        ? `Rp ${Number(raw.total_amount).toLocaleString('id-ID')}`
                        : (raw.totalAmount ?? 'Rp 0'),
                })
            } catch (err) {
                console.error("GetCurrentUser failed, falling back to session data", err)
                if (!user) {
                    if (session?.user) {
                        const sUser = session.user as any
                        setUser({
                            username: sUser.username ?? sUser.name ?? '',
                            first_name: sUser.first_name ?? '',
                            last_name: sUser.last_name ?? '',
                            email: sUser.email ?? '',
                            phone_number: sUser.phone_number ?? undefined,
                            created_at: sUser.createdAt ?? sUser.created_at ?? new Date().toISOString(),
                            totalWallets: 0,
                            totalExpenses: 0,
                            totalAmount: 'Rp 0',
                        })
                    } else {
                        setError('Failed to load profile. Please try again.')
                    }
                }
            } finally {
                setIsLoading(false)
            }
        }

        fetchUser()
    }, [session, db])

    const daysSinceJoined = user?.created_at
        ? Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24))
        : 0

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100 justify-center items-center">
            <Navbar />
            <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-4xl rounded-[2rem] p-8 sm:p-10">

                    {isLoading ? (
                        // Loading skeleton
                        <div className="animate-pulse flex flex-col items-center">
                            <div className="mt-4 h-5 w-40 rounded bg-slate-700" />
                            <div className="mt-3 h-7 w-28 rounded-full bg-slate-700" />
                            <div className="mt-5 h-4 w-24 rounded bg-slate-700" />
                            <div className="mt-2 h-8 w-36 rounded bg-slate-700" />
                            <div className="mt-8 flex w-full items-stretch gap-2 sm:gap-4">
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/95 p-4">
                                        <div className="h-3 w-16 mx-auto rounded bg-slate-700" />
                                        <div className="mt-3 h-6 w-10 mx-auto rounded bg-slate-700" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                            <p className="text-red-400 font-medium">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="rounded-full border border-red-700/40 bg-red-500/10 px-5 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20"
                            >
                                Retry
                            </button>
                        </div>
                    ) : user ? (
                        <>
                            <div className="flex flex-col items-center">
                                <p className="text-xl font-bold text-white">
                                    Hello, {user.first_name || user.username} {user.last_name || ""}
                                </p>

                                <Link
                                    href="/profile/edit"
                                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/60 px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition duration-200"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                        <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.313.313-.7.54-1.134.652l-3.154 1.262a.5.5 0 01-.652-.652z" />
                                        <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
                                    </svg>
                                    Edit Profile
                                </Link>

                                <p className="mt-5 text-sm text-slate-400"> Total Money Spent </p>
                                <p className="mt-1 text-2xl font-bold text-white">{user.totalAmount}</p>
                            </div>

                            {/* horizontal stat cards */}
                            <div className="mt-8 flex w-full items-stretch gap-2 overflow-x-auto sm:gap-4">
                                <div className="min-w-[80px] flex-1 rounded-2xl border border-slate-800 bg-slate-900/95 p-3 text-center sm:min-w-[180px] sm:p-4">
                                    <p className="text-xs uppercase text-slate-400 sm:text-sm">Total Wallets</p>
                                    <p className="mt-2 text-xl font-semibold text-white sm:mt-3 sm:text-2xl">{user.totalWallets}</p>
                                </div>
                                <div className="min-w-[80px] flex-1 rounded-2xl border border-slate-800 bg-slate-900/95 p-3 text-center sm:min-w-[180px] sm:p-4">
                                    <p className="text-xs uppercase text-slate-400 sm:text-sm">Total Expenses</p>
                                    <p className="mt-2 text-xl font-semibold text-white sm:mt-3 sm:text-2xl">{user.totalExpenses}</p>
                                </div>
                                <div className="min-w-[80px] flex-1 rounded-2xl border border-slate-800 bg-slate-900/95 p-3 text-center sm:min-w-[180px] sm:p-4">
                                    <p className="text-xs uppercase text-slate-400 sm:text-sm">Days Joined</p>
                                    <p className="mt-2 text-xl font-semibold text-white sm:mt-3 sm:text-2xl">{daysSinceJoined}</p>
                                </div>
                            </div>

                            {/* contact and joined date */}
                            <div className="mt-8 flex flex-col gap-3 text-center sm:text-left items-center justify-center">
                                <p className="text-sm text-slate-300">Email: <span className="font-medium text-white">{user.email}</span></p>
                                {user.phone_number && (
                                    <p className="text-sm text-slate-300">Phone: <span className="font-medium text-white">{user.phone_number}</span></p>
                                )}
                                <p className="text-sm text-slate-300">Joined: <span className="font-medium text-white">{new Date(user.created_at).toLocaleDateString()}</span></p>
                            </div>
                        </>
                    ) : null}

                </div>
            </div>
        </main>
    )
}