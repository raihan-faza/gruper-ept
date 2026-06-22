"use client"

import { useEffect, useState } from "react"

export default function BackToTopButton() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 240)

    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-20 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-slate-900/95 text-white shadow-lg shadow-slate-950/40 transition-transform duration-200 hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-cyan-500/30"
      aria-label="Back to top"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="h-7 w-7">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  )
}
