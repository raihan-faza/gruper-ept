"use server"

import { redirect } from "next/navigation"
import { cookies, headers } from "next/headers"
import { LoginUser } from "@/app/api/user/user"
import { LoginPayload } from "@/app/api/user/payloads"
import { auth } from "@/app/api/auth/auth"

export interface LoginState {
  error?: string
  success?: boolean
}

export async function SubmitLoginForm(prevState: LoginState | null, formData: FormData): Promise<LoginState> {
  const email = (formData.get("email") as string)?.trim()
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Please enter your email and password." }
  }

  let success = false
  try {
    const response = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      headers: await headers(),
    })
    success = true
  } catch (error: any) {
    return { error: error.message || "Invalid credentials. Please try again." }
  }

  if (success) {
    const cookieStore = await cookies()
    cookieStore.set("logged_in", "true", { path: "/" })
    redirect("/wallets")
  }

  return {}
}
