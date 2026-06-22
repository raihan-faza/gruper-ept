"use client"

import { useActionState, startTransition, useState, useEffect } from "react"
import Link from "next/link"
import { SubmitLoginForm } from "./actions/actions"
import { authClient } from "@/lib/auth-client"

export default function Login() {
  const [state, formAction, isPending] = useActionState(SubmitLoginForm, null)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const error = params.get("error")
      if (error) {
        const decoded = decodeURIComponent(error)
        if (decoded.includes("Invalid_or_missing_invitation_code") || decoded.toLowerCase().includes("invitation")) {
          setErrorMessage("You need to register first")
        } else {
          setErrorMessage(decoded)
        }
      }
    }
  }, [])

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(() => {
      formAction(formData)
    })
  }

  async function handleSocialSignIn(provider: "google") {
    setOauthError(null)
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "/wallets",
      })
    } catch (err: any) {
      setOauthError(err.message || "An error occurred during social sign in.")
    }
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-8 sm:py-12 text-slate-100">
      {/* Back to Home Button */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to home
        </Link>
      </div>

      {/* Container Card */}
      <div className="w-[92%] max-w-[360px] sm:w-full sm:max-w-md rounded-2xl sm:rounded-3xl border border-slate-800 bg-slate-900/60 p-4 sm:p-10 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.8)] backdrop-blur-sm mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-8 text-center">
          <Link
            href="/"
            className="text-lg sm:text-2xl font-bold tracking-tight text-white hover:opacity-95"
          >
            Gruper
          </Link>
          <h1 className="mt-1 sm:mt-3 text-base sm:text-2xl font-semibold text-white">
            Welcome back
          </h1>
          <p className="mt-1 sm:mt-2 text-[11px] sm:text-sm text-slate-400">
            Sign in to manage and split your group expenses.
          </p>
        </div>

        {/* Error Message */}
        {(state?.error || oauthError || errorMessage) && (
          <div className="mb-4 sm:mb-6 flex gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-red-500/30 bg-red-500/10 p-2.5 sm:p-4 text-xs sm:text-sm text-red-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="h-4 w-4 sm:h-5 sm:w-5 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <span>{state?.error || oauthError || errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-5">
          {/* Email */}
          <div className="space-y-1 sm:space-y-2">
            <label
              htmlFor="email"
              className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              required
              className="w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:px-4 sm:py-3 sm:text-sm"
            />
          </div>

          {/* Password */}
          <div className="space-y-1 sm:space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-slate-400"
              >
                Password
              </label>
            </div>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              required
              className="w-full rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 outline-none transition duration-200 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 sm:px-4 sm:py-3 sm:text-sm"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="mt-1.5 flex w-full items-center justify-center gap-2 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 py-2.5 text-xs sm:text-sm font-bold shadow-lg shadow-cyan-500/20 transition duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 sm:py-3.5"
          >
            {isPending ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin text-slate-950"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                Logging in…
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-4 sm:my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-800" />
          </div>
          <div className="relative flex justify-center text-[10px] sm:text-xs uppercase">
            <span className="bg-slate-900 px-2 text-slate-400">
              Or continue with
            </span>
          </div>
        </div>

        {/* Social Sign-in Buttons */}
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          <button
            type="button"
            onClick={() => handleSocialSignIn("google")}
            className="flex items-center justify-center gap-2 rounded-xl sm:rounded-2xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-100 transition duration-200 hover:bg-slate-900 hover:text-white sm:px-4 sm:py-3"
          >
            {/* Google SVG Icon */}
            <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-slate-400">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-cyan-450 hover:text-cyan-400 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    </main>
  )
}