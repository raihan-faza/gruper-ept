"use server"

import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { UpdateUser } from "@/app/api/user/user"
import { UpdateUserPayload } from "@/app/api/user/payloads"

export interface ProfileUpdateState {
  error?: string
  success?: boolean
}

export async function SubmitUpdateProfileForm(
  prevState: ProfileUpdateState | null,
  formData: FormData
): Promise<ProfileUpdateState> {
  const username = (formData.get("username") as string)?.trim()
  const firstName = (formData.get("first_name") as string)?.trim()
  const lastName = (formData.get("last_name") as string)?.trim()
  const email = (formData.get("email") as string)?.trim()
  const phoneNumber = (formData.get("phone_number") as string)?.trim()
  const password = formData.get("password") as string

  if (!username) {
    return { error: "Username cannot be empty." }
  }
  if (!firstName) {
    return { error: "First Name cannot be empty." }
  }
  if (!lastName) {
    return { error: "Last Name cannot be empty." }
  }
  if (!email) {
    return { error: "Email cannot be empty." }
  }

  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { error: "Please enter a valid email address." }
  }

  if (password && password.length < 8) {
    return { error: "Password must be at least 8 characters long." }
  }

  try {
    const payload: UpdateUserPayload = {
      username,
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
    }

    const result = await UpdateUser(payload)
    if (result && result.success) {
      const cookieStore = await cookies()
      const currentUserProfileStr = cookieStore.get("mock_user_profile")?.value
      let currentProfile: any = {
        username: "johndoe",
        first_name: "John",
        last_name: "Doe",
        email: "johndoe@example.com",
        phone_number: "+1234567890",
        joined: "2024-01-18",
        profilePicture: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=512&q=80",
        totalWallets: 3,
        totalExpenses: 42,
        totalAmount: "Rp 15.670.000",
      }

      if (currentUserProfileStr) {
        try {
          currentProfile = JSON.parse(currentUserProfileStr)
        } catch (e) {
          // ignore
        }
      }

      const updatedProfile = {
        ...currentProfile,
        username: payload.username || currentProfile.username,
        first_name: payload.first_name || currentProfile.first_name,
        last_name: payload.last_name || currentProfile.last_name,
        email: email || currentProfile.email, // using email from form data
        phone_number: payload.phone_number ?? currentProfile.phone_number,
      }

      cookieStore.set("mock_user_profile", JSON.stringify(updatedProfile), { path: "/" })
    } else {
      return { error: "Failed to update profile information." }
    }
  } catch (error: any) {
    return { error: error.message || "An error occurred while updating your profile." }
  }

  // Redirect to /profile on success
  redirect("/profile")
}
