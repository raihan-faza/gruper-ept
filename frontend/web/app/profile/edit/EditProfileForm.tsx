"use client"

import { useActionState, startTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { SubmitUpdateProfileForm } from "./actions/actions"

interface ProfileData {
  username: string
  first_name: string
  last_name: string
  email: string
  phone_number?: string
}

interface EditProfileFormProps {
  initialProfile: ProfileData
}

export default function EditProfileForm({ initialProfile }: EditProfileFormProps) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(SubmitUpdateProfileForm, null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Back Link */}
      <div className="mb-6 flex justify-start">
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-800 bg-slate-900/90 text-slate-300 transition duration-300 hover:-translate-y-0.5 hover:border-cyan-400 hover:bg-cyan-500 hover:text-slate-950 shadow-sm shadow-slate-950/20"
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

      <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        <div className="mb-6 border-b border-slate-800 pb-5">
          <h1 className="text-2xl font-black text-white">Edit Profile</h1>
          <p className="text-xs text-slate-400 mt-1">
            Update your account details below.
          </p>
        </div>

        {/* Error Alert */}
        {state?.error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="h-5 w-5 shrink-0"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
              />
            </svg>
            <span>{state.error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-6">
          {/* Username */}
          <div className="form-control col-span-2 sm:col-span-1">
            <label className="label pb-2" htmlFor="username">
              <span className="label-text font-semibold text-slate-200">Username</span>
            </label>
            <input
              id="username"
              type="text"
              name="username"
              defaultValue={initialProfile.username}
              placeholder="Enter username"
              className="input input-bordered w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          {/* Password */}
          <div className="form-control col-span-2 sm:col-span-1">
            <label className="label pb-2" htmlFor="password">
              <span className="label-text font-semibold text-slate-200">Password</span>
            </label>
            <input
              id="password"
              type="password"
              name="password"
              placeholder="••••••••"
              className="input input-bordered w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
            <p className="text-xxs text-slate-500 mt-1.5 ml-1">Leave empty to keep current password</p>
          </div>

          {/* First Name */}
          <div className="form-control col-span-2 sm:col-span-1">
            <label className="label pb-2" htmlFor="first_name">
              <span className="label-text font-semibold text-slate-200">First Name</span>
            </label>
            <input
              id="first_name"
              type="text"
              name="first_name"
              defaultValue={initialProfile.first_name}
              placeholder="Enter first name"
              className="input input-bordered w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          {/* Last Name */}
          <div className="form-control col-span-2 sm:col-span-1">
            <label className="label pb-2" htmlFor="last_name">
              <span className="label-text font-semibold text-slate-200">Last Name</span>
            </label>
            <input
              id="last_name"
              type="text"
              name="last_name"
              defaultValue={initialProfile.last_name}
              placeholder="Enter last name"
              className="input input-bordered w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          {/* Email */}
          <div className="form-control col-span-2">
            <label className="label pb-2" htmlFor="email">
              <span className="label-text font-semibold text-slate-200">Email</span>
            </label>
            <input
              id="email"
              type="email"
              name="email"
              defaultValue={initialProfile.email}
              placeholder="Enter email address"
              className="input input-bordered w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          {/* Phone Number */}
          <div className="form-control col-span-2">
            <label className="label pb-2" htmlFor="phone_number">
              <span className="label-text font-semibold text-slate-200">Phone Number</span>
            </label>
            <input
              id="phone_number"
              type="text"
              name="phone_number"
              defaultValue={initialProfile.phone_number}
              placeholder="Enter phone number"
              className="input input-bordered w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="btn col-span-2 rounded-full border-none bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition duration-200 flex items-center justify-center gap-2 mt-2 h-11"
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
                Saving changes…
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
