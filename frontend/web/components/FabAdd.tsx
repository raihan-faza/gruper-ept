"use client"

import Link from "next/link"

export default function FabAdd() {
  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      <Link href="/expenses/add" aria-label="Add expense">
        <button
          type="button"
          className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 transition-transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-cyan-500/30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-7 sm:w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </Link>
    </div>
  )
}
