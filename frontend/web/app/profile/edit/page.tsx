import { cookies } from "next/headers"
import Navbar from "@/components/Navbar"
import EditProfileForm from "./EditProfileForm"
import { GetCurrentUser } from "@/app/api/user/user"

export default async function EditProfile() {
  const cookieStore = await cookies()
  const mockUserProfileStr = cookieStore.get("mock_user_profile")?.value
  const sessionCookie = cookieStore.get("better-auth.session_data")?.value || cookieStore.get("__Secure-better-auth.session_data")?.value

  let initialProfile: {
    username: string
    first_name: string
    last_name: string
    email: string
    phone_number: string
  } = {
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
  }

  try {
    if (sessionCookie) {
      const data = await GetCurrentUser(sessionCookie, true)
      const raw = data?.data ?? data ?? {}
      initialProfile = {
        username: raw.username ?? initialProfile.username,
        first_name: raw.first_name ?? initialProfile.first_name,
        last_name: raw.last_name ?? initialProfile.last_name,
        email: raw.email ?? initialProfile.email,
        phone_number: raw.phone_number ?? initialProfile.phone_number,
      }
    } else if (mockUserProfileStr) {
      const parsed = JSON.parse(mockUserProfileStr)
      initialProfile = {
        username: parsed.username || initialProfile.username,
        first_name: parsed.first_name || initialProfile.first_name,
        last_name: parsed.last_name || initialProfile.last_name,
        email: parsed.email || initialProfile.email,
        phone_number: parsed.phone_number ?? initialProfile.phone_number,
      }
    }
  } catch (e) {
    if (mockUserProfileStr) {
      try {
        const parsed = JSON.parse(mockUserProfileStr)
        initialProfile = {
          username: parsed.username || initialProfile.username,
          first_name: parsed.first_name || initialProfile.first_name,
          last_name: parsed.last_name || initialProfile.last_name,
          email: parsed.email || initialProfile.email,
          phone_number: parsed.phone_number ?? initialProfile.phone_number,
        }
      } catch (innerErr) {
        // ignore
      }
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <EditProfileForm initialProfile={initialProfile} />
    </main>
  )
}
