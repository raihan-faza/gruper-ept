"use client"

import Navbar from "@/components/Navbar"
import BackToTopButton from "@/components/BackToTopButton"
import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { GetLLMJobs } from "@/app/api/llm/llm"
import { useDatabase } from "@/lib/db/hooks"
import { createLlmJobRepository } from "@/lib/db/repositories/llm-job.repository"

type LLMJob = {
    id: string;
    user_id: string;
    wallet_id: string;
    user_input: string;
    status: string;
    retry_count: number;
    expense_id: string;
    error_message: string;
    llm_result: string;
    llm_status: string;
    expense_status: string;
    idempotency_key: string;
    created_at: string;
    updated_at: string;
}

// const MOCK_JOBS: LLMJob[] = [
//     {
//         id: "mock_job_01j1",
//         user_id: "demo_user",
//         wallet_id: "wallet_1",
//         user_input: "Bought a steak dinner for Rp 250.000 yesterday at Outback Steakhouse using my main wallet",
//         status: "success",
//         retry_count: 0,
//         expense_id: "demo_exp_1",
//         error_message: "",
//         llm_result: '{"title":"Steak Dinner","amount":250000,"category":"Food & Groceries"}',
//         llm_status: "completed",
//         expense_status: "completed",
//         idempotency_key: "ikey_1",
//         created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
//         updated_at: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
//     },
//     {
//         id: "mock_job_01j2",
//         user_id: "demo_user",
//         wallet_id: "wallet_1",
//         user_input: "Bought coffee at Starbucks for Rp 55.000",
//         status: "processing",
//         retry_count: 0,
//         expense_id: "",
//         error_message: "",
//         llm_result: "",
//         llm_status: "processing",
//         expense_status: "",
//         idempotency_key: "ikey_2",
//         created_at: new Date(Date.now() - 1000 * 30).toISOString(),
//         updated_at: new Date(Date.now() - 1000 * 30).toISOString(),
//     },
//     {
//         id: "mock_job_01j3",
//         user_id: "demo_user",
//         wallet_id: "wallet_1",
//         user_input: "Paid monthly electricity bill Rp 450.000",
//         status: "pending",
//         retry_count: 0,
//         expense_id: "",
//         error_message: "",
//         llm_result: "",
//         llm_status: "pending",
//         expense_status: "",
//         idempotency_key: "ikey_3",
//         created_at: new Date(Date.now() - 1000 * 5).toISOString(),
//         updated_at: new Date(Date.now() - 1000 * 5).toISOString(),
//     },
//     {
//         id: "mock_job_01j4",
//         user_id: "demo_user",
//         wallet_id: "wallet_1",
//         user_input: "Spent 50 USD on some subscription",
//         status: "failed",
//         retry_count: 2,
//         expense_id: "",
//         error_message: "failed to parse amount: unsupported currency USD. Only IDR is supported currently.",
//         llm_result: "",
//         llm_status: "failed",
//         expense_status: "",
//         idempotency_key: "ikey_4",
//         created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
//         updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2 + 10).toISOString(),
//     }
// ];

export default function LLMJobsPage() {
    const router = useRouter()
    const { data: session } = authClient.useSession()
    const userId = session?.user?.id ?? ""
    const db = useDatabase()
    const [jobs, setJobs] = useState<LLMJob[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'all' | 'progress' | 'completed' | 'failed'>('all')

    useEffect(() => {
        async function fetchJobs() {
            try {
                // 1. Load from RxDB first → render cached jobs immediately
                if (db) {
                    const llmJobRepo = createLlmJobRepository(db)
                    const localJobs = await llmJobRepo.findAll(userId)
                    if (localJobs.length > 0) {
                        setJobs(localJobs as unknown as LLMJob[])
                        setIsLoading(false)
                    }

                    // 2. Fetch from server in background
                    try {
                        const res = await GetLLMJobs()
                        const serverList: any[] = Array.isArray(res) ? res
                            : Array.isArray(res?.data) ? res.data : []

                        if (serverList.length > 0) {
                            const serverIdempKeys = new Map(serverList.map((i: any) => [i.idempotency_key, i]))
                            const serverIds: string[] = []

                            // 3a. Upsert all server jobs into RxDB
                            for (const job of serverList) {
                                if (!job?.id) continue
                                serverIds.push(job.id)
                                await llmJobRepo.upsertFromServer({
                                    id: job.id,
                                    user_id: job.user_id ?? '',
                                    wallet_id: job.wallet_id ?? '',
                                    user_input: job.user_input ?? '',
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
                                })
                            }

                            // 3b. Mark local drafts confirmed by idempotency key
                            for (const local of localJobs) {
                                if (local.is_new && local.idempotency_key && serverIdempKeys.has(local.idempotency_key)) {
                                    await llmJobRepo.markSynced(local.id)
                                }
                            }

                            // 3c. Prune stale synced local caches
                            await llmJobRepo.deleteSyncedNotInList(serverIds, userId)

                            // 4. Re-render from reconciled RxDB
                            const reconciled = await llmJobRepo.findAll(userId)
                            setJobs(reconciled as unknown as LLMJob[])
                        }
                    } catch (apiErr) {
                        console.warn("Server unreachable, serving cached jobs:", apiErr)
                        // Already rendered from RxDB above
                    }
                } else {
                    // No local DB — server-only path
                    const res = await GetLLMJobs()
                    const serverList: any[] = Array.isArray(res) ? res
                        : Array.isArray(res?.data) ? res.data : []
                    setJobs(serverList.length > 0 ? serverList as LLMJob[] : [])
                }
            } catch (err) {
                console.error("Failed to fetch jobs:", err)
                setJobs([])
            } finally {
                setIsLoading(false)
            }
        }

        fetchJobs()
        const intervalId = setInterval(fetchJobs, 4000) // Poll every 4 seconds

        return () => clearInterval(intervalId)
    }, [session, db])

    const filteredJobs = jobs.filter((job) => {
        if (activeTab === 'progress') return job.status === 'pending' || job.status === 'processing'
        if (activeTab === 'completed') return job.status === 'success'
        if (activeTab === 'failed') return job.status === 'failed'
        return true
    })

    const countJobs = (statusTab: 'progress' | 'completed' | 'failed') => {
        return jobs.filter((job) => {
            if (statusTab === 'progress') return job.status === 'pending' || job.status === 'processing'
            if (statusTab === 'completed') return job.status === 'success'
            if (statusTab === 'failed') return job.status === 'failed'
            return false
        }).length
    }

    const isUsingMock = jobs.some(j => j.id.startsWith("mock_"))

    return (
        <main className="min-h-screen bg-slate-950 text-slate-100">
            <Navbar />
            <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                {/* Floating Back Button */}
                <div className="md:absolute md:left-4 sm:left-6 lg:left-8 md:top-10 z-40 mb-6 md:mb-0">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/90 text-slate-300 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-500 hover:text-slate-950 shadow-sm shadow-slate-950/20"
                        title="Back"
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

                {/* Page Title */}
                <div className="mx-auto max-w-4xl text-center mb-10">
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">AI Jobs</p>
                    {/* <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                        AI Extraction Tasks
                    </h1> */}
                    {/* <p className="mt-3 text-sm text-slate-300 sm:text-base">
                        Monitor natural language expense extraction jobs and their real-time execution states.
                    </p> */}
                    {/* {isUsingMock && (
                        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold text-cyan-300 ring-1 ring-cyan-400/20">
                            <span>✨ Showing demo tasks (mock data)</span>
                        </div>
                    )} */}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-800 mb-8 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'all'
                            ? 'border-cyan-400 text-cyan-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        All Tasks ({jobs.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('progress')}
                        className={`border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'progress'
                            ? 'border-cyan-400 text-cyan-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        In Progress ({countJobs('progress')})
                    </button>
                    <button
                        onClick={() => setActiveTab('completed')}
                        className={`border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'completed'
                            ? 'border-cyan-400 text-cyan-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Completed ({countJobs('completed')})
                    </button>
                    <button
                        onClick={() => setActiveTab('failed')}
                        className={`border-b-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'failed'
                            ? 'border-cyan-400 text-cyan-400'
                            : 'border-transparent text-slate-400 hover:text-slate-200'
                            }`}
                    >
                        Failed ({countJobs('failed')})
                    </button>
                </div>

                {/* Job Cards list */}
                <div className="space-y-3 sm:space-y-6">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, idx) => (
                            <div key={idx} className="animate-pulse rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/90 p-4 sm:p-6 space-y-3 sm:space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="h-3 sm:h-4 w-24 sm:w-32 rounded bg-slate-700" />
                                    <div className="h-5 sm:h-6 w-16 sm:w-20 rounded bg-slate-700" />
                                </div>
                                <div className="h-12 sm:h-16 rounded bg-slate-800" />
                            </div>
                        ))
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center rounded-3xl border border-red-800/40 bg-red-900/10 py-12 gap-3 text-center">
                            <p className="text-red-400 font-medium">{error}</p>
                        </div>
                    ) : filteredJobs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/50 py-16 text-center">
                            <p className="text-slate-400">No tasks found matching this status.</p>
                        </div>
                    ) : (
                        filteredJobs.map((job) => {
                            const isPending = job.status === 'pending';
                            const isProcessing = job.status === 'processing';
                            const isSuccess = job.status === 'success';
                            const isFailed = job.status === 'failed';

                            return (
                                <div
                                    key={job.id}
                                    className="rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/95 p-3.5 sm:p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)] transition duration-200 hover:border-slate-700"
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-slate-800">
                                        <div>
                                            <span className="text-[10px] sm:text-xs font-mono text-slate-500">ID: {job.id}</span>
                                            <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
                                                Created: {new Date(job.created_at).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            {job.retry_count > 0 && (
                                                <span className="rounded-full bg-slate-800 px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium text-slate-400 ring-1 ring-slate-700">
                                                    Retry: {job.retry_count}
                                                </span>
                                            )}
                                            <span className={`rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider ${isSuccess ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20' :
                                                isFailed ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/20' :
                                                    isProcessing ? 'bg-blue-500/15 text-blue-300 ring-1 ring-blue-400/20 animate-pulse' :
                                                        'bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20 animate-pulse'
                                                }`}>
                                                {job.status}
                                            </span>
                                        </div>
                                    </div>

                                    {/* User Input Block */}
                                    <div className="mb-3 sm:mb-4">
                                        <h3 className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1.5 sm:mb-2">Input Text</h3>
                                        <div className="rounded-xl sm:rounded-2xl bg-slate-950/80 p-2.5 sm:p-4 border border-slate-850 italic text-[11px] sm:text-sm text-slate-300">
                                            &ldquo;{job.user_input}&rdquo;
                                        </div>
                                    </div>

                                    {/* Success Details */}
                                    {isSuccess && job.expense_id && (
                                        <div className="mt-3 sm:mt-4 flex items-center justify-between rounded-xl sm:rounded-2xl bg-emerald-950/20 p-2.5 sm:p-4 border border-emerald-900/30">
                                            <div className="text-[11px] sm:text-sm text-emerald-300">
                                                Successfully extracted and saved expense record.
                                            </div>
                                            <Link
                                                href={`/expenses/${job.expense_id}`}
                                                className="rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 px-3 sm:px-4 py-1 sm:py-1.5 text-[10px] sm:text-xs font-semibold text-emerald-300 transition ring-1 ring-emerald-400/20"
                                            >
                                                View →
                                            </Link>
                                        </div>
                                    )}

                                    {/* Error Details */}
                                    {job.error_message && (
                                        <div className="mt-3 sm:mt-4 rounded-xl sm:rounded-2xl bg-rose-950/20 p-2.5 sm:p-4 border border-rose-900/30 text-[11px] sm:text-sm text-rose-300">
                                            <div className="font-semibold mb-0.5 sm:mb-1">Execution Failure:</div>
                                            <div className="font-mono text-[10px] sm:text-xs">{job.error_message}</div>
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
            <BackToTopButton />
        </main>
    )
}
