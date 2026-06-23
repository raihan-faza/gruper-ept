'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { authClient } from '@/lib/auth-client'

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Wallets', href: '/wallets' },
  { label: 'Expenses', href: '/expenses' },
  { label: 'Profile', href: '/profile' },
]

const line1Variants = {
  closed: { d: 'M4 6 L20 6' },
  opened: { d: 'M5 5 L19 19' },
}
const line2Variants = {
  closed: { opacity: 1, scale: 1 },
  opened: { opacity: 0, scale: 0 },
}
const line3Variants = {
  closed: { d: 'M4 18 L20 18' },
  opened: { d: 'M5 19 L19 5' },
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const { data: session } = authClient.useSession()
  const isLoggedIn = !!session

  const handleLogout = async () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.removeItem("last_logged_in_user_id")
      }
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/login")
          }
        }
      })
    } catch (err) {
      console.error("Sign out failed:", err)
      if (typeof window !== "undefined") {
        localStorage.removeItem("last_logged_in_user_id")
      }
      window.location.href = "/login"
    }
  }

  return (
    <header className="flex justify-center px-4 py-4 sm:px-6 lg:px-8 w-full">
      {isLoggedIn ? (
        <nav className="relative w-full sm:w-fit px-0 sm:px-6 py-3 transition-all duration-300 rounded-none sm:rounded-3xl border-none sm:border sm:border-slate-800 bg-transparent sm:bg-slate-950/80 shadow-none sm:shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)] backdrop-blur-none sm:backdrop-blur-xl">
          <div className="flex items-center justify-start sm:justify-center">
            {/* Mobile Hamburger Toggle Button - Rendered first to sit on the left */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex sm:hidden items-center justify-center p-2 rounded-xl text-slate-300 hover:bg-slate-900 transition focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <motion.svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  variants={line1Variants}
                  animate={isOpen ? 'opened' : 'closed'}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                />
                <motion.path
                  d="M4 12H20"
                  variants={line2Variants}
                  animate={isOpen ? 'opened' : 'closed'}
                  transition={{ duration: 0.15 }}
                />
                <motion.path
                  variants={line3Variants}
                  animate={isOpen ? 'opened' : 'closed'}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                />
              </motion.svg>
            </button>

            {/* Desktop Navigation Links */}
            <ul className="hidden sm:flex items-center gap-2">
              {navItems.map((item) => {
                const isActive =
                  item.href === pathname ||
                  (item.href === '/wallets' && pathname.startsWith('/wallets/')) ||
                  (item.href === '/expenses' && pathname.startsWith('/expenses/'))
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`inline-flex items-center rounded-full px-4 py-2 text-xs sm:text-sm font-semibold transition ${isActive
                          ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                          : 'text-slate-200 hover:bg-slate-900/70 hover:text-white'
                        }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
              <li>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-full px-4 py-2 text-xs sm:text-sm font-semibold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition"
                >
                  Logout
                </button>
              </li>
            </ul>
          </div>

          {/* Mobile Dropdown Menu (Fades/Slides down) - Styled as floating card overlay */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 right-0 top-full mt-2 sm:hidden rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-xl z-50"
              >
                <ul className="flex flex-col gap-2">
                  {navItems.map((item) => {
                    const isActive =
                      item.href === pathname ||
                      (item.href === '/wallets' && pathname.startsWith('/wallets/')) ||
                      (item.href === '/expenses' && pathname.startsWith('/expenses/'))
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={() => setIsOpen(false)}
                          className={`block w-full rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${isActive
                              ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20'
                              : 'text-slate-200 hover:bg-slate-900/60 hover:text-white'
                            }`}
                        >
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                  <li>
                    <button
                      onClick={() => {
                        setIsOpen(false)
                        handleLogout()
                      }}
                      className="block w-full text-left rounded-2xl px-4 py-2.5 text-sm font-semibold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition"
                    >
                      Logout
                    </button>
                  </li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      ) : (
        <nav className="relative w-full sm:w-full sm:max-w-5xl px-0 sm:px-6 py-3 transition-all duration-300 rounded-none sm:rounded-3xl border-none sm:border sm:border-slate-800 bg-transparent sm:bg-slate-950/80 shadow-none sm:shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)] backdrop-blur-none sm:backdrop-blur-xl">
          <div className="flex items-center justify-between w-full">
            {/* Logo on the left */}
            <Link href="/" className="text-xl font-bold tracking-tight text-white">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Gruper</span>
            </Link>

            {/* Mobile Hamburger Toggle Button - Rendered on the right when logged out */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex sm:hidden items-center justify-center p-2 rounded-xl text-slate-300 hover:bg-slate-900 transition focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <motion.svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <motion.path
                  variants={line1Variants}
                  animate={isOpen ? 'opened' : 'closed'}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                />
                <motion.path
                  d="M4 12H20"
                  variants={line2Variants}
                  animate={isOpen ? 'opened' : 'closed'}
                  transition={{ duration: 0.15 }}
                />
                <motion.path
                  variants={line3Variants}
                  animate={isOpen ? 'opened' : 'closed'}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                />
              </motion.svg>
            </button>

            {/* Desktop Sign In / Sign Up on the right */}
            <div className="hidden sm:flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-semibold text-slate-300 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-cyan-500 px-5 py-2 text-sm font-semibold text-slate-950 shadow-sm shadow-cyan-500/20 transition hover:bg-cyan-400 hover:scale-105 active:scale-95"
              >
                Sign Up
              </Link>
            </div>
          </div>

          {/* Mobile Dropdown Menu (Fades/Slides down) - Styled as floating card overlay */}
          <AnimatePresence>
            {isOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-0 right-0 top-full mt-2 sm:hidden rounded-2xl border border-slate-800 bg-slate-950/95 p-4 shadow-xl z-50"
              >
                <ul className="flex flex-col gap-2">
                  <li>
                    <Link
                      href="/login"
                      onClick={() => setIsOpen(false)}
                      className="block w-full rounded-2xl px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-900/60 hover:text-white transition"
                    >
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/register"
                      onClick={() => setIsOpen(false)}
                      className="block w-full rounded-2xl px-4 py-2.5 text-sm font-semibold bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/20 hover:bg-cyan-400 transition text-center"
                    >
                      Sign Up
                    </Link>
                  </li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      )}
    </header>
  )
}
