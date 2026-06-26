import { createAuthClient } from "better-auth/react"
import type { auth } from "@/app/api/auth/auth"
import type { EnrichedSession } from "@/app/api/auth/payloads"
import { jwtClient } from "better-auth/client/plugins"
/**
 * Better-auth client for use in React Client Components and hooks.
 *
 * Infers the full type from the server `auth` instance so you get
 * end-to-end type safety for session data, including `backendToken`.
 *
 * Usage (Client Component):
 * ```tsx
 * "use client"
 * import { authClient } from "@/lib/auth-client"
 *
 * const { data: session } = authClient.useSession()
 * const token = session?.session.backendToken
 * ```
 *
 * Usage (sign in):
 * ```ts
 * await authClient.signIn.email({ email, password })
 * ```
 */
export const authClient = createAuthClient({
    // Defaults to window.location.origin in the browser, but can be
    // overridden for SSR scenarios if needed.
    baseURL: process.env.NEXT_PUBLIC_BASE_URL,
    plugins: [
        jwtClient()
    ]
}) satisfies ReturnType<typeof createAuthClient>

import { useState, useEffect } from "react"

/**
 * Helper: retrieves the enriched session from the client.
 * Returns null if the user is not signed in.
 */
export async function getClientSession(): Promise<EnrichedSession | null> {
    const { data } = await authClient.getSession()
    return data as EnrichedSession | null
}

export type AuthClient = typeof authClient

export function useUserId(): string {
    const { data: session } = authClient.useSession()
    const [userId, setUserId] = useState<string>(() => {
        if (typeof window !== "undefined") {
            return localStorage.getItem("last_logged_in_user_id") || ""
        }
        return ""
    })

    useEffect(() => {
        if (session?.user?.id) {
            setUserId(session.user.id)
            localStorage.setItem("last_logged_in_user_id", session.user.id)
        }
    }, [session])

    return userId
}

import { usePathname } from "next/navigation"

/**
 * Custom hook that caches the session object in localStorage and falls back to
 * it if the network is offline or the authClient fails to fetch it.
 */
export function useSessionOfflineSafe() {
    const pathname = usePathname()
    const { data: session, isPending, refetch, ...rest } = authClient.useSession()
    const [cachedSession, setCachedSession] = useState<any>(null)

    // Load initial cached session from localStorage on mount
    useEffect(() => {
        if (typeof window !== "undefined") {
            const cached = localStorage.getItem("cached_session")
            if (cached) {
                try {
                    setCachedSession(JSON.parse(cached))
                } catch (e) {
                    console.error("Failed to parse cached session:", e)
                }
            }
        }
    }, [])

    // Update cached session in localStorage and local state
    useEffect(() => {
        if (session) {
            localStorage.setItem("cached_session", JSON.stringify(session))
            setCachedSession(session)
        } else if (session === null && typeof navigator !== "undefined" && navigator.onLine) {
            // Only clear the cache if we are explicitly online and the server returned null (user logged out)
            localStorage.removeItem("cached_session")
            setCachedSession(null)
            if (typeof window !== "undefined") {
                document.cookie = "logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure"
            }
        }
    }, [session])

    // Sync session on path change if out of sync with logged_in cookie
    useEffect(() => {
        if (typeof window !== "undefined") {
            const hasLoggedInCookie = document.cookie.includes("logged_in=true")
            if (hasLoggedInCookie && !session && !isPending && navigator.onLine) {
                refetch()
            }
        }
    }, [pathname, session, isPending, refetch])

    const activeSession = session || cachedSession
    const activePending = isPending && !activeSession

    return { data: activeSession, isPending: activePending, refetch, ...rest }
}

