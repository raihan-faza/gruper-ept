"use server"

import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { RegisterUser } from "@/app/api/user/user"
import { CreateUserPayload } from "@/app/api/user/payloads"
import { auth } from "@/app/api/auth/auth"

export interface RegisterState {
  error?: string
  success?: boolean
}

export async function SubmitRegisterForm(prevState: RegisterState | null, formData: FormData): Promise<RegisterState> {
  const username = (formData.get("username") as string)?.trim()
  const password = formData.get("password") as string
  const firstName = (formData.get("first_name") as string)?.trim()
  const lastName = (formData.get("last_name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim()
  const phoneNumber = (formData.get("phone_number") as string)?.trim()
  const invitationCode = (formData.get("invitation_code") as string)?.trim()

  if (!username || !password || !firstName || !lastName || !email || !invitationCode) {
    return { error: "Please fill in all required fields." }
  }

  if (!checkInvitationCode(invitationCode)) {
    return { error: "Invalid invitation code." }
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters long." }
  }

  let success = false
  try {
    // create auth user using better auth
    const response = await auth.api.signUpEmail({
      body: {
        name: `${firstName} ${lastName}`,
        email,
        password,
        username,
        first_name: firstName,
        last_name: lastName,
        phone_number: phoneNumber || undefined,
      },
      headers: await headers(),
    })

    success = true

  } catch (error: any) {
    return { error: error.message || "An error occurred during registration. Please try again." }
  }

  if (success) {
    redirect("/login")
  }

  return {}
}

function checkInvitationCode(code: string): boolean {
  const validCode = process.env.INVITATION_CODE || "GRUPER2026"
  return code === validCode
}

export async function VerifyInvitationCode(code: string): Promise<boolean> {
  return checkInvitationCode(code)
}

