"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { RequestJoinWallet } from "@/app/api/wallet/wallet"

interface DialAction {
  label: string
  href: string
  icon: React.ReactNode
}

const actions: DialAction[] = [
  {
    label: "Create wallet",
    href: "/wallets/add",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </svg>
    ),
  },
  {
    label: "Join wallet",
    href: "#join",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
        <polyline points="10 17 15 12 10 7" />
        <line x1="15" y1="12" x2="3" y2="12" />
      </svg>
    ),
  },
  {
    label: "Add expense",
    href: "/expenses/add",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6" />
        <path d="M9 15h6" />
      </svg>
    ),
  },
]

export default function SpeedDialFAB() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Join Modal States
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [invitationCode, setInvitationCode] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null)

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [isOpen])

  function handleActionClick(href: string) {
    setIsOpen(false)
    if (href === "#join") {
      setJoinError(null)
      setJoinSuccess(null)
      setInvitationCode("")
      setIsJoinModalOpen(true)
    } else {
      router.push(href)
    }
  }

  async function handleJoinSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!invitationCode.trim()) return

    setIsSubmitting(true)
    setJoinError(null)
    setJoinSuccess(null)

    try {
      await RequestJoinWallet(invitationCode.trim())
      setJoinSuccess(
        "Join request submitted successfully! An owner or manager of the wallet needs to approve your request."
      )
    } catch (err: any) {
      setJoinError(
        err.message || "Failed to join wallet. Please check the code and try again."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="fab-backdrop"
            className="fixed inset-0 z-40 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* FAB container */}
      <div
        ref={containerRef}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col-reverse items-end gap-3"
      >
        {/* Main FAB */}
        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open actions"}
          aria-expanded={isOpen}
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/30 transition-shadow hover:shadow-xl hover:shadow-cyan-500/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/30"
        >
          <motion.svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 sm:h-6 sm:w-6"
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <path d="M12 5v14M5 12h14" />
          </motion.svg>
        </button>

        {/* Action items */}
        <AnimatePresence>
          {isOpen && (
            <div className="flex flex-col-reverse items-end gap-3">
              {actions.map((action, index) => (
                <motion.div
                  key={action.href}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.8 }}
                  transition={{
                    delay: index * 0.05,
                    type: "spring",
                    stiffness: 300,
                    damping: 24,
                  }}
                >
                  {/* Pill label */}
                  <span className="select-none whitespace-nowrap rounded-full border border-slate-200/60 bg-white px-3 py-1 text-[13px] font-medium text-slate-700 shadow-sm">
                    {action.label}
                  </span>

                  {/* Action FAB */}
                  <button
                    type="button"
                    aria-label={action.label}
                    onClick={() => handleActionClick(action.href)}
                    className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/60 bg-white shadow-md transition-transform hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 text-cyan-500"
                  >
                    {action.icon}
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Join Wallet Modal */}
      <AnimatePresence>
        {isJoinModalOpen && (
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
                  <h3 className="text-lg sm:text-xl font-bold text-white">Join Group Wallet</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
                    Enter an invitation code to request access.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsJoinModalOpen(false)}
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

              {/* Error Message */}
              {joinError && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[10px] sm:text-xs text-red-400">
                  {joinError}
                </div>
              )}

              {/* Success View */}
              {joinSuccess ? (
                <div className="text-center py-2 sm:py-4 space-y-4 sm:space-y-5">
                  <div className="mx-auto flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth="2"
                      stroke="currentColor"
                      className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-base sm:text-lg font-bold text-white">Request Sent!</h4>
                    <p className="text-xs text-slate-300 mt-2 px-1">
                      {joinSuccess}
                    </p>
                  </div>
                  <div className="pt-2 sm:pt-3">
                    <button
                      type="button"
                      onClick={() => setIsJoinModalOpen(false)}
                      className="w-full rounded-full bg-cyan-500 px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-950 shadow-md transition hover:opacity-90"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                /* Form View */
                <form onSubmit={handleJoinSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <label
                      htmlFor="invitationCode"
                      className="block text-xs font-semibold uppercase tracking-wider text-slate-400"
                    >
                      Invitation Code
                    </label>
                    <input
                      id="invitationCode"
                      type="text"
                      required
                      placeholder="e.g. GW-XXXX-XXXX"
                      value={invitationCode}
                      onChange={(e) => setInvitationCode(e.target.value)}
                      className="w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 justify-end pt-4 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => setIsJoinModalOpen(false)}
                      className="rounded-full border border-slate-700 px-5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting || !invitationCode.trim()}
                      className="flex items-center gap-2 rounded-full bg-cyan-500 px-6 py-2.5 text-xs font-semibold text-slate-950 shadow-md hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="h-4 w-4 animate-spin text-slate-950" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                          </svg>
                          Joining...
                        </>
                      ) : (
                        "Request to Join"
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
