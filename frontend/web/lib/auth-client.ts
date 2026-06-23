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
