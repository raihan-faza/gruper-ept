'use client'

import Navbar from '@/components/Navbar'
import BackToTopButton from '@/components/BackToTopButton'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useUserId, authClient } from '@/lib/auth-client'
import {
  GetAllWallets,
  GetWalletJoinRequests,
  GetWalletPendingJoinRequests,
  ApproveJoinRequest,
  RejectJoinRequest,
  GetWalletMembers,
} from '@/app/api/wallet/wallet'
import { GetUserProfile } from '@/app/api/user/user'
import { useDatabase } from '@/lib/db/hooks'
import { createWalletRepository } from '@/lib/db/repositories/wallet.repository'
import { createWalletMemberRepository } from '@/lib/db/repositories/wallet-member.repository'
import { AnimatePresence, motion } from 'framer-motion'

type Wallet = {
  id: string
  name: string
  role: string
  balance: string
  members: number
  availableBalance: string
}

export default function Wallets() {
  const { data: session } = authClient.useSession()
  const userId = useUserId()
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const db = useDatabase()

  // Filter & Modal States
  const [filter, setFilter] = useState<'all' | 'owned' | 'joined'>('all')
  const [isRequestsModalOpen, setIsRequestsModalOpen] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [isRequestsLoading, setIsRequestsLoading] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'incoming' | 'sent'>('incoming')
  const [myPendingRequests, setMyPendingRequests] = useState<any[]>([])
  const [isMyRequestsLoading, setIsMyRequestsLoading] = useState(false)

  useEffect(() => {
    async function fetchWallets() {
      setIsLoading(true)
      setError(null)

      const normalizeWallet = (item: any): Wallet => ({
        id: String(item.id ?? item.wallet_id ?? ''),
        name: item.name ?? item.wallet_name ?? '',
        role: item.role ?? (item.owner_id === userId ? 'Owner' : 'Member'),
        balance: (() => {
          const bal = item.total_balance ?? item.balance
          if (bal == null) return item.balance_display ?? '-'
          const curr = item.currency || 'IDR'
          try {
            return new Intl.NumberFormat(curr === 'IDR' ? 'id-ID' : 'en-US', {
              style: 'currency', currency: curr, maximumFractionDigits: 0,
            }).format(Number(bal))
          } catch { return `${curr} ${Number(bal).toLocaleString()}` }
        })(),
        members: item.member_count ?? item.members ?? 0,
        availableBalance: (() => {
          const bal = item.available_balance ?? 0
          const curr = item.currency || 'IDR'
          try {
            return new Intl.NumberFormat(curr === 'IDR' ? 'id-ID' : 'en-US', {
              style: 'currency', currency: curr, maximumFractionDigits: 0,
            }).format(Number(bal))
          } catch { return `${curr} ${Number(bal).toLocaleString()}` }
        })(),
      })

      // Use outer scope userId
      try {
        // 1. Load from RxDB first → render cached data immediately
        if (db) {
          const walletRepo = createWalletRepository(db)
          const localWallets = await walletRepo.findAll(userId)
          console.log("localWallets", localWallets)
          if (localWallets.length > 0) {
            setWallets(localWallets.map(normalizeWallet))
            setIsLoading(false)
          }

          // 2. Fetch from server in background
          try {
            const walletsData = await GetAllWallets()
            const serverList: any[] = Array.isArray(walletsData)
              ? walletsData
              : Array.isArray(walletsData?.data) ? walletsData.data : []
            console.log("serverWallet", serverList)
            if (serverList.length > 0) {
              // Fetch member count for each server wallet in parallel
              const serverListWithMembers = await Promise.all(
                serverList.map(async (item: any) => {
                  const id = String(item.id ?? item.wallet_id ?? '')
                  if (!id) return { ...item, member_count: 0, available_balance: 0 }
                  try {
                    const members = await GetWalletMembers(id)
                    const count = Array.isArray(members) ? members.length : 0
                    const currentUserId = userId || 'offline-user'
                    const currentUserMember = Array.isArray(members) ? members.find((m: any) => String(m.user_id ?? m.userId) === String(currentUserId)) : null
                    const currentUserAllocationLimit = currentUserMember ? (currentUserMember.allocation_limit ?? currentUserMember.allocation ?? 0) : 0
                    const currentUserAllocationUsed = currentUserMember ? (currentUserMember.allocation_used ?? currentUserMember.allocation_used ?? 0) : 0
                    const currentUserAvailableBalance = currentUserAllocationLimit - currentUserAllocationUsed
                    return { ...item, member_count: count, available_balance: currentUserAvailableBalance }
                  } catch (err) {
                    console.warn(`Failed to fetch members for wallet ${id}:`, err)
                    return { ...item, member_count: 0, available_balance: 0 }
                  }
                })
              )

              const serverIdempKeys = new Map(serverListWithMembers.map((i: any) => [i.idempotency_key, i]))
              const serverIds: string[] = []

              // 3a. Upsert all server items into RxDB
              for (const item of serverListWithMembers) {
                const id = String(item.id ?? item.wallet_id ?? '')
                if (!id) continue
                serverIds.push(id)
                await walletRepo.upsertFromServer({
                  id,
                  name: item.name ?? item.wallet_name ?? '',
                  total_balance: item.total_balance ?? item.balance ?? 0,
                  owner_id: item.owner_id ?? '',
                  currency: item.currency ?? 'IDR',
                  member_count: item.member_count,
                  available_balance: item.available_balance,
                  idempotency_key: item.idempotency_key ?? '',
                  is_new: false,
                  created_at: item.created_at ?? new Date().toISOString(),
                  updated_at: item.updated_at ?? new Date().toISOString(),
                })

                if (userId) {
                  const walletMemberRepo = createWalletMemberRepository(db)
                  await walletMemberRepo.upsert({
                    wallet_id: id,
                    user_id: userId,
                    username: session?.user?.name ?? session?.user?.email ?? 'User',
                    role: item.owner_id === userId ? 'Owner' : 'Member',
                    allocation_limit: item.available_balance ?? 0,
                    allocation_used: 0,
                    created_at: item.created_at ?? new Date().toISOString(),
                    updated_at: item.updated_at ?? new Date().toISOString(),
                  })
                }
              }

              // 3b. Mark local drafts confirmed if their idempotency_key landed on server
              for (const local of localWallets) {
                if (local.is_new && local.idempotency_key && serverIdempKeys.has(local.idempotency_key)) {
                  await walletRepo.update(local.id, { is_new: false, is_synced: true } as any)
                }
              }

              // 3c. Prune stale synced local caches (server-side deletions)
              await walletRepo.deleteSyncedNotInList(serverIds, userId)

              // 4. Re-render from reconciled RxDB
              const reconciled = await walletRepo.findAll(userId)
              setWallets(reconciled.map(normalizeWallet))
            }
          } catch (apiErr) {
            console.warn("Server unreachable, serving wallets from local cache:", apiErr)
            // Already rendered from RxDB above — no further action needed
          }
        } else {
          // No local DB — fall through to server-only path
          const walletsData = await GetAllWallets()
          const rawList: any[] = Array.isArray(walletsData)
            ? walletsData
            : Array.isArray(walletsData?.data) ? walletsData.data : []

          const rawListWithMembers = await Promise.all(
            rawList.map(async (item: any) => {
              const id = String(item.id ?? item.wallet_id ?? '')
              if (!id) return { ...item, member_count: 0, available_balance: 0 }
              try {
                const members = await GetWalletMembers(id)
                const count = Array.isArray(members) ? members.length : 0
                const currentUserId = userId || 'offline-user'
                const currentUserMember = Array.isArray(members) ? members.find((m: any) => String(m.user_id ?? m.userId) === String(currentUserId)) : null
                const currentUserAllocationLimit = currentUserMember ? (currentUserMember.allocation_limit ?? currentUserMember.allocation ?? 0) : 0
                return { ...item, member_count: count, available_balance: currentUserAllocationLimit }
              } catch (err) {
                console.warn(`Failed to fetch members for wallet ${id}:`, err)
                return { ...item, member_count: 0, available_balance: 0 }
              }
            })
          )
          setWallets(rawListWithMembers.map(normalizeWallet))
        }
      } catch (err) {
        console.error(err)
        setError('Failed to load wallets. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchWallets()
  }, [userId, db])

  // Fetch pending join requests for owned wallets
  useEffect(() => {
    async function fetchPendingRequests() {
      const ownedWallets = wallets.filter((w) => w.role.toLowerCase() === 'owner')
      if (ownedWallets.length === 0) {
        setPendingRequests([])
        return
      }

      setIsRequestsLoading(true)
      try {
        const userCache: Record<string, string> = {}
        const allRequests: any[] = []

        for (const wallet of ownedWallets) {
          try {
            const apiRequests = await GetWalletJoinRequests(wallet.id)
            const rawRequests = Array.isArray(apiRequests)
              ? apiRequests
              : Array.isArray(apiRequests?.data)
                ? apiRequests.data
                : []

            const pending = rawRequests.filter((r: any) => r.status === 'pending')

            for (const req of pending) {
              const userId = req.user_id ?? req.username ?? 'User'
              let username = userId
              if (userId !== 'User') {
                if (userCache[userId]) {
                  username = userCache[userId]
                } else {
                  try {
                    const userProfile = await GetUserProfile(userId)
                    if (userProfile && (userProfile.name || userProfile.username)) {
                      const resolvedName = userProfile.name ?? userProfile.username
                      userCache[userId] = resolvedName
                      username = resolvedName
                    }
                  } catch (err) {
                    console.error(`Failed to fetch profile for user ${userId}:`, err)
                  }
                }
              }

              allRequests.push({
                id: req.id,
                walletId: wallet.id,
                walletName: wallet.name,
                userId: userId,
                username: username,
                createdAt: req.created_at ?? req.requestedAt ?? new Date().toISOString(),
              })
            }
          } catch (err) {
            console.error(`Failed to fetch join requests for wallet ${wallet.id}:`, err)
          }
        }
        setPendingRequests(allRequests)
      } catch (err) {
        console.error("Failed to fetch pending requests:", err)
      } finally {
        setIsRequestsLoading(false)
      }
    }

    if (wallets.length > 0) {
      fetchPendingRequests()
    }
  }, [wallets])

  // Fetch user's own sent pending requests
  useEffect(() => {
    async function fetchMyPendingRequests() {
      if (!isRequestsModalOpen || !session) return
      setIsMyRequestsLoading(true)
      try {
        const data = await GetWalletPendingJoinRequests()
        const rawRequests = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : []
        const formatted = rawRequests.map((r: any) => ({
          id: r.id,
          walletId: r.wallet_id,
          walletName: r.wallet_name || 'Group Wallet',
          userId: r.user_id,
          status: r.status,
          createdAt: r.created_at ?? new Date().toISOString(),
        }))
        setMyPendingRequests(formatted)
      } catch (err) {
        console.error("Failed to fetch my pending requests:", err)
      } finally {
        setIsMyRequestsLoading(false)
      }
    }

    fetchMyPendingRequests()
  }, [isRequestsModalOpen, session])

  const handleApprove = async (walletId: string, requestId: string) => {
    setActionError(null)
    try {
      await ApproveJoinRequest(walletId, requestId, 0)
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch (err: any) {
      console.error("Failed to approve request:", err)
      setActionError(err.message || "Failed to approve request.")
    }
  }

  const handleReject = async (walletId: string, requestId: string) => {
    setActionError(null)
    try {
      await RejectJoinRequest(walletId, requestId)
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId))
    } catch (err: any) {
      console.error("Failed to reject request:", err)
      setActionError(err.message || "Failed to reject request.")
    }
  }

  // Filter wallets list
  const filteredWallets = wallets.filter((wallet) => {
    if (filter === 'owned') return wallet.role.toLowerCase() === 'owner'
    if (filter === 'joined') return wallet.role.toLowerCase() === 'member'
    return true
  })

  console.log("wallets", wallets);
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">
            Wallets
          </p>
          {/* <h1 className="mt-1 sm:mt-3 text-lg sm:text-4xl font-semibold tracking-tight text-white">
            Your wallet groups
          </h1>
          <p className="mt-1 sm:mt-3 text-[10px] sm:text-base text-slate-400 max-w-lg mx-auto">
            View wallets you own or have joined.
          </p> */}
        </div>

        {/* Filters and Actions */}
        <div className="mt-6 sm:mt-8 flex flex-row items-center justify-between gap-2 border-b border-slate-800 pb-5 w-full">
          {/* Tabs */}
          <div className="flex gap-0.5 bg-slate-900/80 p-0.5 sm:p-1 rounded-full border border-slate-800 shrink-0">
            {(['all', 'owned', 'joined'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-2.5 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs font-semibold capitalize transition ${filter === f
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
                  }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Pending Requests Button */}
          <button
            onClick={() => {
              setActionError(null)
              setIsRequestsModalOpen(true)
            }}
            className="relative flex items-center gap-1 sm:gap-2 rounded-full border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 sm:px-4 sm:py-2.5 text-[10px] sm:text-xs font-semibold text-slate-300 hover:border-cyan-500 hover:bg-cyan-500 hover:text-slate-950 transition duration-300 shadow-md shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="w-3.5 h-3.5 sm:w-4 sm:h-4"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-9-3.5h5.25c.621 0 1.125.504 1.125 1.125v3.026a2.999 2.999 0 0 1-5.196 2.027H6.75a2.25 2.25 0 0 1-2.25-2.25V6.75a2.25 2.25 0 0 1 2.25-2.25Z"
              />
            </svg>
            <span className="whitespace-nowrap">Pending Join Requests</span>
            {pendingRequests.length > 0 && (
              <span className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-rose-500 text-[8px] sm:text-[10px] font-bold text-white ring-2 ring-slate-950">
                {pendingRequests.length > 5 ? '5+' : pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Wallets Grid */}
        <div className="mt-5 sm:mt-10 grid grid-cols-2 gap-2.5 sm:gap-6 lg:grid-cols-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/95 p-2.5 sm:p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4">
                  <div className="space-y-1 sm:space-y-2.5">
                    <div className="h-2 w-12 rounded bg-slate-700" />
                    <div className="h-4 w-20 rounded bg-slate-700" />
                  </div>
                  <div className="h-4 w-12 rounded-full bg-slate-700 w-fit" />
                </div>
                <div className="mt-2.5 sm:mt-6 rounded-lg sm:rounded-xl bg-slate-950/80 p-2 sm:p-5 ring-1 ring-slate-700/80 space-y-1 sm:space-y-2.5">
                  <div className="h-2 w-10 rounded bg-slate-700" />
                  <div className="h-4 w-16 rounded bg-slate-700" />
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
          ) : filteredWallets.length > 0 ? (
            filteredWallets.map((wallet) => (
              <Link key={wallet.id} href={`/wallets/${wallet.id}`}>
                <article
                  className="cursor-pointer rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/95 p-2.5 sm:p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)] transition duration-200 sm:hover:-translate-y-1 hover:border-slate-700 hover:bg-slate-900"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] sm:text-xs font-medium uppercase tracking-[0.15em] text-slate-400">{wallet.role}</p>
                      <h2 className="mt-0.5 sm:mt-2 text-xs sm:text-xl font-semibold text-white truncate">{wallet.name}</h2>
                    </div>
                    <span className="rounded-full bg-cyan-500/15 px-1.5 py-0.5 sm:px-3 sm:py-1 text-[9px] sm:text-sm font-semibold text-cyan-300 ring-1 ring-cyan-400/20 shrink-0 w-fit">
                      {wallet.members} members
                    </span>
                  </div>

                  <div className="mt-2.5 sm:mt-6 rounded-lg sm:rounded-xl bg-slate-950/80 p-2 sm:p-5 ring-1 ring-slate-700/80">
                    <div className="grid grid-cols-2 gap-4">
                      {/* <div>
                        <p className="text-[9px] sm:text-xs uppercase tracking-[0.15em] text-slate-500">Total Balance</p>
                        <p className="mt-0.5 sm:mt-2 text-xs sm:text-xl font-semibold text-white truncate">{wallet.balance}</p>
                      </div> */}
                      <div>
                        <p className="text-[8px] sm:text-xs uppercase tracking-[0.15em] text-slate-500 whitespace-nowrap">Available to use</p>
                        <p className="mt-0.5 sm:mt-2 text-xs sm:text-xl font-semibold text-cyan-400 truncate">{wallet.availableBalance}</p>
                      </div>
                    </div>
                  </div>
                </article>
              </Link>
            ))
          ) : (
            <div className="col-span-full flex items-center justify-center rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/50 py-10 sm:py-16">
              <p className="text-xs sm:text-sm text-slate-400">
                {wallets.length === 0 ? 'No wallets found' : `No ${filter} wallets found`}
              </p>
            </div>
          )}
        </div>
      </div>
      <BackToTopButton />

      {/* Pending Join Requests Popup Modal */}
      <AnimatePresence>
        {isRequestsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-lg rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/95 p-5 sm:p-8 shadow-2xl backdrop-blur-xl max-h-[85vh] flex flex-col"
            >
              {/* Header */}
              <div className="mb-4 flex items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4 shrink-0">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Pending Join Requests</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                    Manage requests to join your owned group wallets.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRequestsModalOpen(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-4 h-4 sm:w-5 sm:h-5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tab Switcher */}
              <div className="flex border-b border-slate-800/80 mb-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab('incoming')}
                  className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition duration-200 ${
                    activeTab === 'incoming'
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Incoming Requests ({pendingRequests.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('sent')}
                  className={`flex-1 pb-2.5 text-xs font-semibold border-b-2 transition duration-200 ${
                    activeTab === 'sent'
                      ? 'border-cyan-500 text-cyan-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  My Sent Requests ({myPendingRequests.length})
                </button>
              </div>

              {/* Action Error Banner */}
              {actionError && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[10px] sm:text-xs text-red-400 shrink-0">
                  {actionError}
                </div>
              )}

              {/* List Content */}
              <div className="flex-1 overflow-y-auto min-h-0 py-2 space-y-3 pr-1 scrollbar-thin">
                {activeTab === 'incoming' ? (
                  isRequestsLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <svg className="h-6 w-6 animate-spin text-[#8B85D4]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <p className="text-xs text-slate-400">Loading requests...</p>
                    </div>
                  ) : pendingRequests.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
                      No incoming join requests found.
                    </div>
                  ) : (
                    pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="border border-slate-800 bg-slate-950/40 p-3.5 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition hover:border-slate-700/80"
                      >
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-slate-100 text-sm">{req.username}</span>
                            <span className="text-[10px] text-slate-500">({req.userId.slice(0, 8)})</span>
                          </div>
                          <div className="text-[11px] text-[#8B85D4] font-medium">
                            To join: <span className="text-slate-300 font-normal">{req.walletName}</span>
                          </div>
                          <div className="text-[9px] text-slate-500">
                            Requested: {new Date(req.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 shrink-0 justify-end">
                          <button
                            type="button"
                            onClick={() => handleReject(req.walletId, req.id)}
                            className="px-3 py-1.5 rounded-lg border border-slate-700 hover:border-rose-500/30 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 text-xs font-semibold transition"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApprove(req.walletId, req.id)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold shadow-md transition"
                          >
                            Approve
                          </button>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  isMyRequestsLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <svg className="h-6 w-6 animate-spin text-[#8B85D4]" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <p className="text-xs text-slate-400">Loading your requests...</p>
                    </div>
                  ) : myPendingRequests.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs sm:text-sm">
                      No sent join requests found.
                    </div>
                  ) : (
                    myPendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="border border-slate-800 bg-slate-950/40 p-3.5 rounded-xl sm:rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 transition hover:border-slate-700/80"
                      >
                        <div className="space-y-1">
                          <div className="flex items-baseline gap-2">
                            <span className="font-semibold text-slate-100 text-sm">{req.walletName}</span>
                          </div>
                          <div className="text-[11px] text-[#8B85D4] font-medium">
                            Status: <span className="capitalize text-amber-400 font-semibold">{req.status}</span>
                          </div>
                          <div className="text-[9px] text-slate-500">
                            Requested: {new Date(req.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                    ))
                  )
                )}
              </div>

              {/* Footer */}
              <div className="mt-4 pt-4 border-t border-slate-800/80 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsRequestsModalOpen(false)}
                  className="rounded-full border border-slate-700 px-5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  )
}