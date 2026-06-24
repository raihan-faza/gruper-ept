"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import { motion, AnimatePresence } from "framer-motion"
import { GenerateReport, UploadTemplate, DeleteTemplate, ListTemplates } from "@/app/api/report/report"
import { useUserId } from "@/lib/auth-client"
import {
  GetWallet,
  GetWalletMembers,
  GetWalletJoinRequests,
  UpdateWallet,
  AdjustBalance,
  AllocateBalance,
  RemoveMemberFromWallet,
  ApproveJoinRequest,
  RejectJoinRequest,
  GetWalletInvitation,
  RegenerateWalletInvitation,
  DeleteWallet
} from "@/app/api/wallet/wallet"
import { GetAllExpenses, DeleteExpense } from "@/app/api/expense/expense"
import { useDatabase } from "@/lib/db/hooks"
import { createWalletRepository } from "@/lib/db/repositories/wallet.repository"
import { createExpenseRepository } from "@/lib/db/repositories/expense.repository"
import { createWalletMemberRepository } from "@/lib/db/repositories/wallet-member.repository"
import { GetUserProfile } from "@/app/api/user/user"

const templates = [
  { id: "default", name: "Default Template", description: "Standard list of expenses and categories" },
  { id: "simple", name: "Simple Summary", description: "Minimalist summary of total expenditures" },
  { id: "detailed", name: "Detailed Breakdown", description: "Granular report including member allocations and itemized lists" }
]

export default function WalletDashboard({ params }: { params: Promise<{ wallet_id: string }> }) {
  const { wallet_id } = use(params)
  console.log("wallet_id", wallet_id)
  const userId = useUserId()
  const db = useDatabase()
  const router = useRouter()

  // Deletion states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Client states
  const [wallet, setWallet] = useState<any>(null)
  const [expensesList, setExpensesList] = useState<any[]>([])
  const [membersList, setMembersList] = useState<any[]>([])
  const [requestsList, setRequestsList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const currentUser = userId || "offline-user"
  const [invitationCode, setInvitationCode] = useState<string | null>(null)
  const [isCopied, setIsCopied] = useState(false)

  // Customization & sorting states
  const [isEditingInfo, setIsEditingInfo] = useState(false)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editBudget, setEditBudget] = useState<number>(0)
  const [sortOrder, setSortOrder] = useState<"latest" | "older">("latest")

  // State to manage editing of individual allocations
  const [editingAllocationUser, setEditingAllocationUser] = useState<string | null>(null)
  const [tempAllocation, setTempAllocation] = useState<string>("")

  // Report generation states
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportStartDate, setReportStartDate] = useState("")
  const [reportEndDate, setReportEndDate] = useState("")
  const [reportTemplate, setReportTemplate] = useState("default")
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState("")
  const [generatedReport, setGeneratedReport] = useState<{ download_url: string; filename: string; expires_at: string } | null>(null)
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false)

  // Custom report template upload states
  const [customTemplates, setCustomTemplates] = useState<{ id: string; name: string; description: string }[]>([])
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadedName, setUploadedName] = useState("")
  const [uploadedDesc, setUploadedDesc] = useState("")
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Load custom templates from backend on mount
  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await ListTemplates(wallet_id)
        if (res && res.templates) {
          const mapped = res.templates.map((t) => ({
            id: t.template_name,
            name: t.template_name,
            description: t.description,
          }))
          setCustomTemplates(mapped)
        }
      } catch (e) {
        console.error("Failed to fetch custom templates from backend:", e)
      }
    }
    if (wallet_id) {
      fetchTemplates()
    }
  }, [wallet_id])

  const handleDeleteTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await DeleteTemplate(wallet_id, id)
      const updated = customTemplates.filter((t) => t.id !== id)
      setCustomTemplates(updated)
      if (reportTemplate === id) {
        setReportTemplate("default")
      }
    } catch (err: any) {
      console.error("Failed to delete template:", err)
      alert(err.message || "Failed to delete template.")
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadedFile(file)
  }

  const handleSaveCustomTemplate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uploadedName.trim() || !uploadedFile) {
      setUploadError("Please provide a template name and select an Excel (.xlsx) file.")
      return
    }
    // Clean template name to ensure it doesn't break URL paths
    const cleanName = uploadedName.trim().replace(/[^a-zA-Z0-9_\-\s]/g, "")
    if (!cleanName) {
      setUploadError("Invalid template name.")
      return
    }

    try {
      await UploadTemplate(wallet_id, cleanName, uploadedDesc.trim() || "Custom uploaded template", uploadedFile)

      const res = await ListTemplates(wallet_id)
      if (res && res.templates) {
        const mapped = res.templates.map((t) => ({
          id: t.template_name,
          name: t.template_name,
          description: t.description,
        }))
        setCustomTemplates(mapped)
      }

      setReportTemplate(cleanName)
      setUploadedName("")
      setUploadedDesc("")
      setUploadedFile(null)
      setUploadError(null)
      setIsUploadModalOpen(false)
    } catch (err: any) {
      setUploadError(err.message || "Failed to upload custom template.")
    }
  }

  const allTemplates = [...templates, ...customTemplates]

  // Currency helper
  const formatIDR = (num: number) => {
    const curr = wallet?.currency || "IDR"
    try {
      return new Intl.NumberFormat(curr === "IDR" ? "id-ID" : "en-US", {
        style: "currency",
        currency: curr,
        maximumFractionDigits: 0,
      }).format(num)
    } catch {
      return `${curr} ${num.toLocaleString()}`
    }
  }

  // Set current user from useUserId hook

  const loadData = async () => {
    const userId = currentUser
    setIsLoading(true)
    setError(null)

    const renderData = async (wData: any, mData: any[], eData: any[], rData: any[]) => {
      if (!wData) return;
      const mappedWallet = {
        id: wData.id ?? wallet_id,
        name: wData.name ?? wData.wallet_name ?? "Untitled Wallet",
        description: wData.description || "",
        balance: wData.total_balance ?? wData.balance ?? 0,
        currency: wData.currency || "IDR",
        owner: wData.owner_id ?? "Owner",
      }

      setWallet(mappedWallet)
      setEditName(mappedWallet.name)
      setEditDesc(mappedWallet.description)
      setEditBudget(mappedWallet.balance)

      const userCache: Record<string, string> = {}

      const resolvedMembers = await Promise.all(
        mData.map(async (m: any) => {
          const userId = m.user_id ?? m.userId ?? m.username ?? ""
          let username = m.username || "User"
          if (userId && userId !== "Owner") {
            if (m.username) {
              userCache[userId] = m.username
            } else if (userCache[userId]) {
              username = userCache[userId]
            } else {
              try {
                const userProfile = await GetUserProfile(userId)
                if (userProfile && (userProfile.name || userProfile.username)) {
                  const resolvedName = userProfile.name ?? userProfile.username
                  userCache[userId] = resolvedName
                  username = resolvedName
                } else {
                  username = userId
                }
              } catch (err) {
                console.error(`Failed to fetch profile for user ${userId}:`, err)
                username = userId
              }
            }
          }
          return {
            walletId: wallet_id,
            userId: userId,
            username: username,
            role: (wData.owner_id === userId) ? "Owner" : "Member",
            allocation: m.allocation_limit ?? m.allocation ?? 0,
          }
        })
      )

      const resolvedExpenses = await Promise.all(
        eData.map(async (e: any) => {
          const userId = e.user_id ?? "User"
          let username = userId
          if (userId !== "User") {
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
          return {
            id: String(e.id),
            walletId: wallet_id,
            title: e.expense_name ?? e.description ?? "Expense",
            user: username,
            total: e.amount ?? 0,
            time: e.created_at ?? e.date ?? e.time,
            category: e.category?.name || "Food"
          }
        })
      )

      const resolvedRequests = await Promise.all(
        rData.map(async (r: any) => {
          const userId = r.user_id ?? r.username ?? "User"
          let username = userId
          if (userId !== "User") {
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
          return {
            id: String(r.id),
            walletId: wallet_id,
            username: username,
            requestedAt: r.created_at ?? r.requestedAt ?? new Date().toISOString(),
          }
        })
      )

      setExpensesList(resolvedExpenses)
      setMembersList(resolvedMembers)
      setRequestsList(resolvedRequests)
    }

    try {
      // 1. Initial Load: Try RxDB first
      let walletData: any = null
      let membersData: any[] = []
      let expensesData: any[] = []
      let requestsData: any[] = []

      if (db) {
        const walletRepo = createWalletRepository(db)
        const expenseRepo = createExpenseRepository(db)
        const walletMemberRepo = createWalletMemberRepository(db)
        const localW = await walletRepo.findById(wallet_id)
        if (localW) {
          walletData = {
            id: localW.id,
            name: localW.name,
            total_balance: localW.total_balance,
            owner_id: localW.owner_id,
            currency: localW.currency,
            description: "",
          }
          // Load cached members, fall back to owner-only if none found
          const cachedMembers = await walletMemberRepo.findByWallet(wallet_id)
          if (cachedMembers.length > 0) {
            membersData = cachedMembers.map(m => ({
              user_id: m.user_id,
              username: m.username,
              allocation_limit: m.allocation_limit,
              allocation_used: m.allocation_used,
            }))
          } else {
            membersData = [
              {
                user_id: localW.owner_id || "Owner",
                allocation_limit: localW.available_balance ?? 0,
                allocation_used: 0,
              }
            ]
          }
          expensesData = await expenseRepo.findByWallet(wallet_id, userId)
          console.log("rxdb wallet data:", walletData)
          console.log("rxdb members data:", membersData)
          console.log("rxdb expense data:", expensesData)
          console.log("rxdb requests data:", requestsData)
          await renderData(walletData, membersData, expensesData, requestsData)
          setIsLoading(false)
        }
      }

      // 2. Fetch and Reconcile with Server in Background
      try {
        let serverWallet: any = null
        let serverMembers: any[] = []
        let serverExpenses: any[] = []
        let serverRequests: any[] = []

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
            const walletMemberRepo = createWalletMemberRepository(db)
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

            // Upsert all server members into RxDB wallet_members
            const now = new Date().toISOString()
            const serverMemberUserIds: string[] = []
            for (const m of serverMembers) {
              const uid = String(m.user_id ?? m.userId ?? '')
              if (!uid) continue
              serverMemberUserIds.push(uid)
              // Resolve username
              let username = m.username || uid
              if (!m.username) {
                try {
                  const profile = await GetUserProfile(uid)
                  if (profile && (profile.name || profile.username)) {
                    username = profile.name ?? profile.username ?? uid
                  }
                } catch { /* keep uid as fallback */ }
              }
              await walletMemberRepo.upsert({
                wallet_id: wallet_id,
                user_id: uid,
                username,
                role: (serverWallet.owner_id === uid) ? 'Owner' : 'Member',
                allocation_limit: m.allocation_limit ?? m.allocation ?? 0,
                allocation_used: m.allocation_used ?? 0,
                created_at: m.created_at ?? now,
                updated_at: m.updated_at ?? now,
              })
            }
            // Remove stale members no longer returned by server
            await walletMemberRepo.deleteNotInList(wallet_id, serverMemberUserIds)
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

        try {
          const apiRequests = await GetWalletJoinRequests(wallet_id)
          if (Array.isArray(apiRequests)) {
            serverRequests = apiRequests
          } else if (apiRequests && Array.isArray(apiRequests.data)) {
            serverRequests = apiRequests.data
          }
        } catch (apiErr) {
          console.warn("Failed to fetch join requests:", apiErr)
        }
        requestsData = serverRequests

        try {
          const invRes = await GetWalletInvitation(wallet_id)
          const code = invRes?.invitation_code ?? invRes?.invitationCode ?? invRes?.data?.invitation_code ?? invRes?.data?.invitationCode
          if (code) {
            setInvitationCode(code)
          }
        } catch (invErr) {
          console.warn("Failed to load invitation code:", invErr)
        }

        if (walletData) {
          await renderData(walletData, membersData, expensesData, requestsData)
        }
        console.log("server wallet data:", serverWallet)
        console.log("server members data:", serverMembers)
        console.log("server expenses data:", serverExpenses)
        console.log("server requests data:", serverRequests)
      } catch (err: any) {
        console.error("Reconciliation background error:", err)
        if (!walletData) {
          setError(err.message || "Failed to load wallet dashboard data")
        }
      }
    } catch (err: any) {
      console.error(err)
      setError(err.message || "Failed to load wallet dashboard data")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [wallet_id, userId, db])

  const handleRegenerateInvitation = async () => {
    try {
      console.log("wallet_id from handleRegenerateInvitation", wallet_id)
      const res = await RegenerateWalletInvitation(wallet_id)
      const code = res?.invitation_code ?? res?.invitationCode ?? res?.data?.invitation_code ?? res?.data?.invitationCode
      if (code) {
        setInvitationCode(code)
      } else {
        await loadData()
      }
    } catch (err) {
      console.error("Failed to regenerate invitation:", err)
    }
  }

  const handleGenerateReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reportStartDate || !reportEndDate) {
      setReportError("Please select both start and end dates.")
      return
    }

    setReportLoading(true)
    setReportError("")

    try {
      const res = await GenerateReport({
        wallet_id,
        date_start: reportStartDate,
        date_end: reportEndDate,
        template_name: reportTemplate,
      })

      setGeneratedReport({
        download_url: res.download_url,
        filename: res.filename,
        expires_at: res.expires_at,
      })
    } catch (err: any) {
      setReportError(err.message || "Failed to generate report.")
    } finally {
      setReportLoading(false)
    }
  }

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await UpdateWallet(wallet_id, { wallet_name: editName })

      const diff = editBudget - wallet.balance
      if (diff !== 0) {
        await AdjustBalance(wallet_id, diff)
      }

      await loadData()
      setIsEditingInfo(false)
    } catch (err) {
      console.error("Failed to save wallet details:", err)
    }
  }

  const handleApproveRequest = async (requestId: string, reqUsername: string) => {
    try {
      await ApproveJoinRequest(wallet_id, requestId, 0)
      await loadData()
    } catch (err) {
      console.error("Failed to approve join request:", err)
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    try {
      await RejectJoinRequest(wallet_id, requestId)
      await loadData()
    } catch (err) {
      console.error("Failed to reject join request:", err)
    }
  }

  const handleUpdateAllocation = async (targetUserId: string) => {
    const numericAlloc = Math.max(0, Number(tempAllocation) || 0)
    try {
      await AllocateBalance(wallet_id, targetUserId, numericAlloc)
      await loadData()
      setEditingAllocationUser(null)
    } catch (err) {
      console.error("Failed to update allocation:", err)
    }
  }

  const handleRemoveMember = async (targetUserId: string) => {
    if (targetUserId === wallet.owner) return
    try {
      await RemoveMemberFromWallet(wallet_id, targetUserId)
      await loadData()
    } catch (err) {
      console.error("Failed to remove member:", err)
    }
  }

  const handleDeleteWallet = async () => {
    if (!navigator.onLine) {
      setDeleteError("You must be online to delete a wallet.")
      return
    }

    setIsDeleting(true)
    setDeleteError(null)

    try {
      // 1. Delete all expenses of this wallet on the backend server
      await Promise.all(
        expensesList.map(async (exp) => {
          try {
            await DeleteExpense(exp.id, wallet_id)
          } catch (err) {
            console.error(`Failed to delete expense ${exp.id} on server during wallet deletion:`, err)
          }
        })
      )

      // 2. Delete the wallet itself on the backend server
      await DeleteWallet(wallet_id)

      // 3. Clear local RxDB cache for the wallet, its members, and its expenses
      if (db) {
        const walletDoc = await db.wallets.findOne(wallet_id).exec()
        if (walletDoc) {
          await walletDoc.remove()
        }

        const memberDocs = await db.wallet_members.find({
          selector: { wallet_id }
        }).exec()
        for (const doc of memberDocs) {
          await doc.remove()
        }

        const expenseDocs = await db.expenses.find({
          selector: { wallet_id }
        }).exec()
        for (const doc of expenseDocs) {
          await doc.remove()
        }
      }

      setIsDeleteModalOpen(false)
      router.push("/wallets")
    } catch (err: any) {
      console.error("Failed to delete wallet:", err)
      setDeleteError(err.message || "An error occurred while deleting the wallet.")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <div className="relative mx-auto h-12 w-12 mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 animate-spin"></div>
          </div>
          <p className="text-sm text-slate-400">Loading wallet dashboard...</p>
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
          <Link href="/wallets" className="mt-4 inline-block text-sm text-[#8B85D4] hover:underline">
            Back to Wallets
          </Link>
        </div>
      </main>
    )
  }

  const isOwner = wallet.owner === currentUser
  const userRole = membersList.find((m) => m.userId === currentUser)?.role || "Member"
  const hasManagementPermission = isOwner || userRole === "Owner"

  // Calculation summaries
  const totalMoneySpent = expensesList.reduce((sum, item) => sum + item.total, 0)
  const remainingBudget = wallet.balance - totalMoneySpent
  const totalAllocated = membersList.reduce((sum, item) => sum + item.allocation, 0)
  const unallocatedBudget = wallet.balance - totalAllocated
  const totalMembers = membersList.length

  // Sort expenses
  const sortedExpenses = [...expensesList].sort((a, b) => {
    const timeA = new Date(a.time).getTime()
    const timeB = new Date(b.time).getTime()
    return sortOrder === "latest" ? timeB - timeA : timeA - timeB
  })

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        {/* Header navigation bar */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href={`/wallets/${wallet.id}`}
            className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/95 text-slate-100 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-500 hover:text-slate-950 shadow-sm shadow-slate-950/20"
            aria-label="Back to Wallet Details"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
              className="h-4 w-4 sm:h-5 sm:w-5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <div className="rounded-full bg-slate-900/60 px-3 py-1 text-[10px] sm:text-xs font-semibold text-cyan-400 border border-slate-800">
            Role: {userRole}
          </div>
        </div>

        {/* Dashboard Title */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-white">{wallet.name} Dashboard</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">{wallet.description}</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => {
                setReportStartDate("")
                setReportEndDate("")
                setReportTemplate("default")
                setReportError("")
                setGeneratedReport(null)
                setIsGeneratingReport(true)
              }}
              className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/60 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-cyan-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H15.621a.75.75 0 0 1 .53.22l4.47 4.47a.75.75 0 0 1 .22.53v13.129a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 17.25V5.25A2.25 2.25 0 0 1 5.25 3h4"
                />
              </svg>
              Generate Report
            </button>
            {hasManagementPermission && (
              <button
                onClick={() => setIsEditingInfo(!isEditingInfo)}
                className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-900/60 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#8B85D4]"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125"
                  />
                </svg>
                Customize Wallet
              </button>
            )}
          </div>
        </div>

        {/* Customization Form Drawer/Modal style inline */}
        {isEditingInfo && (
          <div className="mb-8 rounded-3xl border border-[#534AB7]/30 bg-slate-900/50 p-6 backdrop-blur-md">
            <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Customize Wallet Details</h3>
            <form onSubmit={handleSaveInfo} className="grid gap-4 sm:gap-5 md:grid-cols-3 items-end">
              <div className="space-y-1.5">
                <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Wallet Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 outline-none transition duration-200 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Description
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 outline-none transition duration-200 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Budget ({wallet.currency || 'IDR'})
                </label>
                <input
                  type="number"
                  value={editBudget}
                  onChange={(e) => setEditBudget(Number(e.target.value) || 0)}
                  className="w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 outline-none transition duration-200 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20"
                />
              </div>
              <div className="flex gap-2.5 md:col-span-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingInfo(false)}
                  className="rounded-full border border-slate-700 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-full px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md"
                  style={{ background: "#534AB7" }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Financial Summaries Overview Cards */}
        <section className="mb-6 sm:mb-8 grid gap-3 grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 sm:p-5 shadow-sm">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500">Total Budget</p>
            <p className="mt-1 sm:mt-2 text-sm sm:text-2xl font-bold text-white truncate">{formatIDR(wallet.balance)}</p>
            <div className="mt-2.5 sm:mt-3 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-400">Allocated:</span>
              <span className="font-semibold text-slate-200 truncate max-w-[60%]">{formatIDR(totalAllocated)}</span>
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 sm:p-5 shadow-sm">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-cyan-400 font-semibold">Money Spent</p>
            <p className="mt-1 sm:mt-2 text-sm sm:text-2xl font-bold text-white truncate">{formatIDR(totalMoneySpent)}</p>
            <div className="mt-2.5 sm:mt-3">
              {/* Progress Bar of Budget Used */}
              <div className="w-full bg-slate-950 rounded-full h-1 overflow-hidden border border-slate-800">
                <div
                  className="bg-cyan-400 h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (totalMoneySpent / wallet.balance) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 sm:p-5 shadow-sm">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500">Remaining Budget</p>
            <p className="mt-1 sm:mt-2 text-sm sm:text-2xl font-bold text-white truncate">{formatIDR(remainingBudget)}</p>
            <div className="mt-2.5 sm:mt-3 flex items-center justify-between text-[10px] sm:text-xs">
              {/* <span className="text-slate-400">Status:</span>
              <span className={`font-semibold ${remainingBudget >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {remainingBudget >= 0 ? "Under" : "Over"}
              </span> */}
            </div>
          </div>

          <div className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-900/90 p-3.5 sm:p-5 shadow-sm">
            <p className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500">Wallet Members</p>
            <p className="mt-1 sm:mt-2 text-sm sm:text-2xl font-bold text-white truncate">{totalMembers}</p>
            <div className="mt-2.5 sm:mt-3 flex items-center justify-between text-[10px] sm:text-xs">
              <span className="text-slate-400">Unallocated:</span>
              <span className="font-semibold text-cyan-400 truncate max-w-[60%]">{formatIDR(unallocatedBudget)}</span>
            </div>
          </div>
        </section>

        {/* Dashboard Panels Grid */}
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
          {/* Main Panel: Expenses List (Left side of grid, 2 columns wide on desktop) */}
          <section className="lg:col-span-2 space-y-6">
            <div className="rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-sm backdrop-blur-sm">
              <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-white">Expenses List</h2>
                  <p className="text-xs text-slate-400 mt-1">List of all recorded group transactions</p>
                </div>
                {/* Sort Controls */}
                <div className="flex items-center gap-2">
                  <label htmlFor="sort" className="text-xs text-slate-400">Sort by:</label>
                  <select
                    id="sort"
                    value={sortOrder}
                    onChange={(e: any) => setSortOrder(e.target.value)}
                    className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-slate-200 outline-none transition focus:border-[#534AB7]"
                  >
                    <option value="latest">Latest First</option>
                    <option value="older">Older First</option>
                  </select>
                </div>
              </div>

              {sortedExpenses.length > 0 ? (
                <div className="divide-y divide-slate-800/60">
                  {sortedExpenses.map((exp) => (
                    <article key={exp.id} className="flex items-center justify-between py-3 sm:py-4 first:pt-0 last:pb-0 gap-3">
                      <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
                        {/* Avatar/Category icon placeholder */}
                        <div className="flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-slate-950 border border-slate-800">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="h-4 w-4 sm:h-5 sm:w-5 text-[#8B85D4]"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
                            />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-xs sm:text-sm font-semibold text-white truncate">{exp.title}</h3>
                          <div className="mt-0.5 sm:mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
                            <span className="rounded-full bg-slate-950 px-2 py-0.5 border border-slate-800 text-[8px] sm:text-[10px] text-slate-400">
                              {exp.category}
                            </span>
                            <span className="hidden sm:inline">•</span>
                            <span>by {exp.user}</span>
                            <span>•</span>
                            <span>{new Date(exp.time).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs sm:text-sm font-bold text-white">{formatIDR(exp.total)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500">
                  <p className="text-sm">No expenses recorded yet.</p>
                </div>
              )}
            </div>
          </section>

          {/* Sidebar Panel: User Manager (1 column wide) */}
          <section className="space-y-6">
            {/* User Manager Card */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-1">User Manager</h2>
              <p className="text-[10px] sm:text-xs text-slate-400 mb-4 sm:mb-6">Manage members and individual allocations</p>

              <div className="space-y-3 sm:space-y-4">
                {membersList.map((m) => (
                  <div key={m.userId} className="rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-950 p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-bold text-slate-200">
                          {m.username[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-white truncate">{m.username}</p>
                          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">{m.role}</p>
                        </div>
                      </div>
                      {/* Kick member button if manager permission */}
                      {hasManagementPermission && m.userId !== wallet.owner && (
                        <button
                          onClick={() => handleRemoveMember(m.userId)}
                          className="rounded-full p-1.5 text-slate-500 hover:bg-slate-900 hover:text-red-400 transition"
                          title="Remove member"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="2"
                            stroke="currentColor"
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m22 10.5-2.6-2.6M17 19.5l-6-6-6 6"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M22 10.5h-9a2 2 0 0 0-2 2v9m13-11v11a2 2 0 0 1-2 2h-9m11-13-2.6 2.6"
                            />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Allocation Display / Editor */}
                    <div className="mt-2.5 pt-2.5 border-t border-slate-900 flex items-center justify-between text-xs">
                      <div>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 uppercase tracking-wide">Allocation</p>
                        {editingAllocationUser === m.userId ? (
                          <div className="mt-1 flex items-center gap-1.5">
                            <input
                              type="number"
                              value={tempAllocation}
                              onChange={(e) => setTempAllocation(e.target.value)}
                              className="w-20 rounded-lg border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs text-white outline-none"
                            />
                            <button
                              onClick={() => handleUpdateAllocation(m.userId)}
                              className="rounded bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-white hover:bg-emerald-600"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm font-semibold text-slate-200 mt-0.5">{formatIDR(m.allocation)}</p>
                        )}
                      </div>

                      {hasManagementPermission && editingAllocationUser !== m.userId && (
                        <button
                          onClick={() => {
                            setEditingAllocationUser(m.userId)
                            setTempAllocation(String(m.allocation))
                          }}
                          className="text-[10px] sm:text-xs text-[#8B85D4] hover:underline"
                        >
                          Edit Alloc
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Join Requests Card */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-1">Join Requests</h2>
              <p className="text-[10px] sm:text-xs text-slate-400 mb-4 sm:mb-6">Users requesting access to join this group wallet</p>

              {requestsList.length > 0 ? (
                <div className="space-y-3 sm:space-y-4">
                  {requestsList.filter(req => req.status === 'pending').map((req) => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 rounded-xl sm:rounded-2xl border border-slate-800 bg-slate-950 p-3 sm:p-4"
                    >
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-semibold text-white truncate">{req.username}</p>
                        <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">
                          {new Date(req.requestedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {hasManagementPermission ? (
                        <div className="flex gap-1.5 shrink-0">
                          <button
                            onClick={() => handleDeclineRequest(req.id)}
                            className="rounded-full border border-slate-700 bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-slate-300"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproveRequest(req.id, req.username)}
                            className="rounded-full px-2.5 py-1 text-[10px] sm:text-xs font-semibold text-white hover:opacity-90"
                            style={{ background: "#534AB7" }}
                          >
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9px] sm:text-[10px] text-slate-500 shrink-0">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-slate-500">
                  <p className="text-xs">No pending requests</p>
                </div>
              )}
            </div>

            {/* Invitation Card */}
            <div className="rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-6 shadow-sm backdrop-blur-sm">
              <h2 className="text-base sm:text-lg font-semibold text-white mb-1">Invitation Code</h2>
              <p className="text-[10px] sm:text-xs text-slate-400 mb-4 sm:mb-6">Invite users to join this group wallet using a code.</p>

              {invitationCode ? (
                <div className="space-y-4">
                  {/* Code Box */}
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1.5 font-medium">Invitation Code</span>
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2">
                      <code className="text-xs sm:text-sm font-mono text-slate-200 select-all font-semibold">{invitationCode}</code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(invitationCode)
                          setIsCopied(true)
                          setTimeout(() => setIsCopied(false), 2000)
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white transition"
                        title="Copy Code"
                      >
                        {isCopied ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-4 w-4 text-emerald-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-4 w-4">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H5.4M18 2.25H11.25a2.25 2.25 0 0 0-2.25 2.25v13.5a2.25 2.25 0 0 0 2.25 2.25H18a2.25 2.25 0 0 0 2.25-2.25V4.5A2.25 2.25 0 0 0 18 2.25Z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {hasManagementPermission && (
                    <button
                      onClick={handleRegenerateInvitation}
                      className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 py-2 text-xs font-semibold text-slate-300 transition duration-200"
                    >
                      Regenerate Code
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-4 space-y-3">
                  <p className="text-xs text-slate-500">No active invitation code</p>
                  {hasManagementPermission && (
                    <button
                      onClick={handleRegenerateInvitation}
                      className="w-full rounded-xl py-2 text-xs font-semibold text-white transition duration-200 hover:opacity-90"
                      style={{ background: "#534AB7" }}
                    >
                      Generate Code
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Report Generation Modal */}
      <AnimatePresence>
        {isGeneratingReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/95 p-5 sm:p-8 shadow-2xl backdrop-blur-xl"
            >
              {/* Modal Header */}
              <div className="mb-4 sm:mb-6 flex items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Generate Financial Report</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">Export a PDF report of this wallet's expenses.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsGeneratingReport(false)}
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Error Message */}
              {reportError && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[10px] sm:text-xs text-red-400">
                  {reportError}
                </div>
              )}

              {/* Success View */}
              {generatedReport ? (
                <div className="text-center py-2 sm:py-4 space-y-4 sm:space-y-5">
                  <div className="mx-auto flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-white">Report Generated Successfully!</h4>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1 sm:mt-1.5 break-all font-mono bg-slate-950/60 p-2 rounded-lg border border-slate-800/80 max-w-full inline-block">
                      {generatedReport.filename}
                    </p>
                    {generatedReport.expires_at && (
                      <p className="text-[9px] sm:text-[10px] text-amber-400 mt-1.5">
                        Link expires at: {new Date(generatedReport.expires_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2 sm:pt-3">
                    <button
                      type="button"
                      onClick={() => setGeneratedReport(null)}
                      className="rounded-full border border-slate-700 bg-slate-900 px-4 py-2 text-[10px] sm:text-xs font-semibold text-slate-300 hover:bg-slate-800"
                    >
                      Generate Another
                    </button>
                    <a
                      href={generatedReport.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2 text-[10px] sm:text-xs font-semibold text-white shadow-md hover:opacity-90 transition"
                      style={{ background: "#534AB7" }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download Report PDF
                    </a>
                  </div>
                </div>
              ) : reportLoading ? (
                /* Loading View */
                <div className="text-center py-12 space-y-4">
                  <div className="relative mx-auto h-12 w-12">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-cyan-400 animate-spin"></div>
                  </div>
                  <p className="text-sm font-medium text-slate-300">Generating report, please wait...</p>
                  <p className="text-xxs text-slate-500">Retrieving expenses database and formatting PDF file</p>
                </div>
              ) : (
                /* Form View */
                <form onSubmit={handleGenerateReportSubmit} className="space-y-5">
                  {/* Template Selection */}
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Report Template
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                        className="flex w-full items-center justify-between rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-left text-sm text-slate-100 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 outline-none"
                      >
                        <span>
                          {allTemplates.find((t) => t.id === reportTemplate)?.name || "Select Template"}
                        </span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className={`h-5 w-5 text-slate-400 transition-transform duration-200 ${isTemplateDropdownOpen ? "rotate-180" : ""
                            }`}
                        >
                          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </button>

                      <AnimatePresence>
                        {isTemplateDropdownOpen && (
                          <motion.ul
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="absolute z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-1.5 shadow-xl max-h-64 overflow-y-auto"
                          >
                            <div className="space-y-0.5 pb-11">
                              {allTemplates.map((tmpl) => (
                                <li key={tmpl.id} className="group/item relative flex items-center rounded-xl hover:bg-slate-900 transition pr-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReportTemplate(tmpl.id)
                                      setIsTemplateDropdownOpen(false)
                                    }}
                                    className={`flex w-full flex-col rounded-xl px-3 py-2 text-left transition ${reportTemplate === tmpl.id ? "bg-slate-900/50 text-[#8B85D4]" : "text-slate-300"
                                      }`}
                                  >
                                    <span className="text-xs font-semibold">{tmpl.name}</span>
                                    <span className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[85%]">{tmpl.description}</span>
                                  </button>
                                  {!["default", "simple", "detailed"].includes(tmpl.id) && (
                                    <button
                                      type="button"
                                      onClick={(e) => handleDeleteTemplate(tmpl.id, e)}
                                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-800 hover:text-rose-400 transition"
                                      title="Delete Template"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="2"
                                        stroke="currentColor"
                                        className="h-3.5 w-3.5"
                                      >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                      </svg>
                                    </button>
                                  )}
                                </li>
                              ))}
                            </div>
                            {/* Fixed position upload button at the bottom of the list */}
                            <div className="sticky bottom-0 left-0 right-0 bg-slate-950 pt-1.5 pb-0.5 border-t border-slate-800 z-10">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsTemplateDropdownOpen(false)
                                  setIsUploadModalOpen(true)
                                }}
                                className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#534AB7] px-3 py-2.5 text-xs font-semibold text-white transition hover:opacity-90"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth="2"
                                  stroke="currentColor"
                                  className="h-3.5 w-3.5"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                <span>Upload Custom Template</span>
                              </button>
                            </div>
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Dates Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="startDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Start Date
                      </label>
                      <input
                        id="startDate"
                        type="date"
                        required
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 outline-none text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="endDate" className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        End Date
                      </label>
                      <input
                        id="endDate"
                        type="date"
                        required
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-slate-100 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 outline-none text-xs"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setIsGeneratingReport(false)}
                      className="rounded-full border border-slate-700 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-full px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-90 transition"
                      style={{ background: "#534AB7" }}
                    >
                      Generate Report
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Custom Template Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-3xl rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/95 p-5 sm:p-8 shadow-2xl backdrop-blur-xl max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="mb-4 flex items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4 shrink-0">
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">Upload Custom Template</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                    Upload an Excel (.xlsx) file and define your custom layout placeholders.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
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

              {/* Scrollable Body containing form & instructions */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-6 scrollbar-thin">
                {uploadError && (
                  <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                    {uploadError}
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Form */}
                  <form onSubmit={handleSaveCustomTemplate} className="space-y-4 lg:col-span-6">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Template Name
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Monthly Travel Report"
                        value={uploadedName}
                        onChange={(e) => setUploadedName(e.target.value)}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Description
                      </label>
                      <textarea
                        placeholder="Brief summary of what this template displays..."
                        value={uploadedDesc}
                        onChange={(e) => setUploadedDesc(e.target.value)}
                        rows={2}
                        className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-[#534AB7] focus:ring-2 focus:ring-[#534AB7]/20 outline-none resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Excel File (.xlsx)
                      </label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl border-slate-700 bg-slate-950 hover:bg-slate-900/60 transition cursor-pointer">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <svg
                              className="w-8 h-8 mb-2 text-slate-400"
                              aria-hidden="true"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 20 16"
                            >
                              <path
                                stroke="currentColor"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                              />
                            </svg>
                            <p className="mb-1 text-xs text-slate-300">
                              <span className="font-semibold">Click to upload</span> or drag and drop
                            </p>
                            <p className="text-[10px] text-slate-500">Excel files only (.xlsx)</p>
                          </div>
                          <input
                            type="file"
                            accept=".xlsx"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {uploadedFile && (
                        <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{uploadedFile.name} ready!</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => setIsUploadModalOpen(false)}
                        className="rounded-full border border-slate-700 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="rounded-full px-6 py-2.5 text-xs font-semibold text-white shadow-md hover:opacity-90 transition"
                        style={{ background: "#534AB7" }}
                      >
                        Save Template
                      </button>
                    </div>
                  </form>

                  {/* Right Column: Instructions */}
                  <div className="space-y-3.5 lg:col-span-6 bg-slate-950/40 border border-slate-800 p-3.5 rounded-2xl">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8B85D4]">
                      Template Instructions
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      Custom templates use <strong className="text-white">xlsx-template</strong> format placeholders. Make sure to define these exact placeholder labels inside your Excel sheets:
                    </p>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                          General Placeholders
                        </span>
                        <div className="bg-slate-900/60 p-2 rounded-lg text-[9px] font-mono text-slate-300 space-y-1">
                          <div>
                            <span className="text-emerald-400">{"${total_price}"}</span> - Total amount of all expenses
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                          Looping Expenses list
                        </span>
                        <div className="bg-slate-900/60 p-2 rounded-lg text-[9px] font-mono text-slate-300 space-y-1 leading-relaxed">
                          <div className="mt-1 space-y-0.5">
                            <div>
                              <span className="text-emerald-400">{"${table:expenses.member}"}</span> - Member name who paid
                            </div>
                            <div>
                              <span className="text-emerald-400">{"${table:expenses.date}"}</span> - Date of expense
                            </div>
                            <div>
                              <span className="text-emerald-400">{"${table:expenses.expense_name}"}</span> - Expense title
                            </div>
                            <div>
                              <span className="text-emerald-400">{"${table:expenses.expense_details}"}</span> - Description
                            </div>
                            <div>
                              <span className="text-emerald-400">{"${table:expenses.category}"}</span> - Category name
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                          Looping Expense Items list
                        </span>
                        <div className="bg-slate-900/60 p-2 rounded-lg text-[9px] font-mono text-slate-300 space-y-1 leading-relaxed">
                          <div className="mt-1 space-y-0.5">
                            <div>
                              <span className="text-emerald-400">{"${table:expense_item.item_name}"}</span> - Item name
                            </div>
                            <div>
                              <span className="text-emerald-400">{"${table:expense_item.item_quantity}"}</span> - Item quantity
                            </div>
                            <div>
                              <span className="text-emerald-400">{"${table:expense_item.total_price}"}</span> - Item total price
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Spreadsheet layout example */}
                      <div className="space-y-2 pt-2 border-t border-slate-800/80">
                        <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                          Spreadsheet Layout Example
                        </span>
                        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 p-1">
                          <table className="w-full text-[8px] border-collapse font-sans">
                            <thead>
                              <tr className="bg-slate-900 text-slate-400 font-semibold border-b border-slate-800">
                                <th className="p-0.5 border-r border-slate-800 w-5 text-center bg-slate-950"></th>
                                <th className="p-0.5 text-left border-r border-slate-800">A</th>
                                <th className="p-0.5 text-left border-r border-slate-800">B</th>
                                <th className="p-0.5 text-left border-r border-slate-800">C</th>
                                <th className="p-0.5 text-left">D</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className="border-b border-slate-800/50">
                                <td className="p-0.5 bg-slate-900/40 font-mono text-center text-slate-500 border-r border-slate-800">1</td>
                                <td className="p-1 font-bold text-slate-200 border-r border-slate-800">Expense Report</td>
                                <td className="p-1 border-r border-slate-800"></td>
                                <td className="p-1 border-r border-slate-800"></td>
                                <td className="p-1"></td>
                              </tr>
                              <tr className="border-b border-slate-800/50">
                                <td className="p-0.5 bg-slate-900/40 font-mono text-center text-slate-500 border-r border-slate-800">2</td>
                                <td className="p-1 font-semibold text-slate-400 border-r border-slate-800">Category</td>
                                <td className="p-1 font-semibold text-slate-400 border-r border-slate-800">Item Name</td>
                                <td className="p-1 font-semibold text-slate-400 border-r border-slate-800">Qty</td>
                                <td className="p-1 font-semibold text-slate-400">Total Price</td>
                              </tr>
                              <tr className="border-b border-slate-800/50 bg-[#8B85D4]/5">
                                <td className="p-0.5 bg-slate-900/40 font-mono text-center text-slate-500 border-r border-slate-800">3</td>
                                <td className="p-1 font-mono text-[#8B85D4] border-r border-slate-800 font-bold">{"${category}"}</td>
                                <td className="p-1 font-mono text-emerald-400 border-r border-slate-800">{"${table:expense_item.item_name}"}</td>
                                <td className="p-1 font-mono text-emerald-400 border-r border-slate-800">{"${table:expense_item.item_quantity}"}</td>
                                <td className="p-1 font-mono text-emerald-400">{"${table:expense_item.total_price}"}</td>
                              </tr>
                              <tr className="border-b border-slate-800/50">
                                <td className="p-0.5 bg-slate-900/40 font-mono text-center text-slate-500 border-r border-slate-800">4</td>
                                <td className="p-1 border-r border-slate-800"></td>
                                <td className="p-1 border-r border-slate-800"></td>
                                <td className="p-1 font-semibold text-slate-400 border-r border-slate-800">Grand Total:</td>
                                <td className="p-1 font-mono text-emerald-400">{"${total_price}"}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <p className="text-[9px] text-slate-500 leading-relaxed">
                          Note: Placing templates in cells defines the dynamic row expansion. Rows will automatically duplicate for each record inside the datasets.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Floating delete wallet button */}
      {isOwner && (
        <button
          type="button"
          onClick={() => {
            setDeleteError(null)
            setIsDeleteModalOpen(true)
          }}
          className="fixed bottom-[72px] right-4 sm:bottom-24 sm:right-6 z-40 flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-rose-600 text-white shadow-lg shadow-rose-950/40 hover:bg-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2 focus:ring-offset-slate-950 hover:scale-110 active:scale-95 transition-all duration-300"
          title="Delete Wallet"
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
              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"
            />
          </svg>
        </button>
      )}

      {/* Delete wallet confirmation modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isDeleting) setIsDeleteModalOpen(false)
              }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-500 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/10">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="h-6 w-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-100">Delete Wallet?</h3>
              </div>

              <div className="space-y-3 text-sm text-slate-300">
                <p>
                  Are you sure you want to delete <span className="font-semibold text-white">"{wallet?.name}"</span>?
                  This action is irreversible.
                </p>
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-rose-300">
                  <span className="font-semibold">Caution:</span> All expenses that use this wallet will be deleted if you delete this wallet.
                </div>
                {deleteError && (
                  <p className="text-xs text-rose-400 font-semibold mt-2">
                    {deleteError}
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteWallet}
                  className="flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500 transition disabled:opacity-50 min-w-[100px]"
                >
                  {isDeleting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </main>
  )
}