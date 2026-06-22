"use client"

import { useRouter } from "next/navigation"

export default function SingleFAB() {
  const router = useRouter()

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      <button
        type="button"
        aria-label="Add expense"
        onClick={() => router.push("/expenses/add")}
        className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-cyan-500 shadow-lg shadow-cyan-500/30 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-500/40 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-500/30"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 sm:h-6 sm:w-6"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  )
}
