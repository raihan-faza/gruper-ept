"use client"

import { useEffect, useRef, useState } from "react"
import Navbar from "@/components/Navbar"

export default function Home() {
  const aboutRef = useRef<HTMLElement | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showAbout, setShowAbout] = useState(false)

  useEffect(() => {
    // Check if logged_in cookie is set
    setIsLoggedIn(document.cookie.includes("logged_in=true"))

    // If navigated with hash, reveal about section
    if (typeof window !== "undefined" && window.location.hash === "#about") {
      setShowAbout(true)
      setTimeout(() => {
        if (aboutRef.current) {
          aboutRef.current.classList.remove("opacity-0", "translate-y-6")
          aboutRef.current.classList.add("opacity-100", "translate-y-0")
          aboutRef.current.scrollIntoView({ behavior: "smooth" })
        }
      }, 100)
    }
  }, [])

  function handleAboutClick(e: React.MouseEvent) {
    e.preventDefault()
    setShowAbout(true)
    setTimeout(() => {
      if (aboutRef.current) {
        aboutRef.current.classList.remove("opacity-0", "translate-y-6")
        aboutRef.current.classList.add("opacity-100", "translate-y-0")
        aboutRef.current.scrollIntoView({ behavior: "smooth" })
      }
    }, 100)
  }

  return (
    <main className="min-h-screen scroll-smooth bg-slate-950 text-slate-100">
      <Navbar />

      <section className="flex min-h-[calc(100vh-5.5rem)] justify-center items-center px-6">
        <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center py-10 text-center">
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Manage your group expenses now
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-slate-300 sm:text-lg">
            Keep everyone aligned with shared budgets, real-time expense tracking, and simple group wallet management.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={isLoggedIn ? "/wallets" : "/login"}
              className="inline-flex 
              w-full items-center justify-center rounded-full bg-cyan-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition duration-300 hover:-translate-y-0.5 hover:bg-cyan-400 sm:w-auto"
            >
              Start now
            </a>
            <a
              href="#about"
              onClick={handleAboutClick}
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 px-8 py-3 text-sm font-semibold text-slate-100 transition duration-300 hover:-translate-y-0.5 hover:border-slate-500 hover:bg-slate-800 sm:w-auto"
            >
              About
            </a>
          </div>
        </div>
      </section>

      {showAbout && (
        <section
          id="about"
          ref={aboutRef}
          className="
          min-h-screen 
          border-t 
          border-slate-800 
          px-6 
          opacity-0
          translate-y-6 
          transition-all 
          duration-[3000ms]
          ease-in-out"
        >
          <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center py-16 text-center space-y-10">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">About</p>
              <h2 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                Build better groups with simple expense sharing
              </h2>
            </div>

            <div className="space-y-4 text-left text-slate-300">
              <p>
                You can use lorem blah blah to describe how your app makes group expense management effortless. Share budgets, monitor spending, and keep every member in sync without the usual chaos.
              </p>
              <p>
                This second section gives the About page more room to breathe, with a clean layout and a natural step from the landing hero into your product story. It's like two pages in one experience.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 text-left">
                <h3 className="text-xl font-semibold text-white">Simple workflow</h3>
                <p className="mt-3 text-slate-300">
                  Use shared wallets, assign expenses, and stay on top of spending with clarity and control.
                </p>
              </div>
              <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6 text-left">
                <h3 className="text-xl font-semibold text-white">Fast collaboration</h3>
                <p className="mt-3 text-slate-300">
                  Invite friends or teammates, view recent expenses instantly, and know who paid what at a glance.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  )
}
