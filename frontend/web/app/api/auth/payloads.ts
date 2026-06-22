// ---------------------------------------------------------------------------
// Auth payloads — TypeScript types for authentication flows.
//
// These are the shapes used by the better-auth client and server, as well as
// the Go backend login/register responses that are surfaced through the session.
// ---------------------------------------------------------------------------

/**
 * User profile embedded in the better-auth session.
 * Mirrors what the Go user microservice returns after a successful login.
 */
export interface SessionUser {
    /** better-auth user identifier (set to the backend user ID or email). */
    id: string
    /** User's email address. */
    email: string
    /** Display name — typically the username from the Go backend. */
    name: string
    /** Whether the email has been verified (always true for backend-delegated auth). */
    emailVerified: boolean
    createdAt: Date
    updatedAt: Date
}

/**
 * Shape of the better-auth session object as enriched by `customSession`.
 * `backendToken` is the raw JWT issued by the Go microservice — attach it
 * as `Authorization: Bearer <backendToken>` on all authenticated API calls.
 */
export interface EnrichedSession {
    user: SessionUser
    session: {
        /** Raw backend JWT for use in `Authorization: Bearer` headers. */
        backendToken: string | null
        // Standard better-auth session fields:
        id: string
        token: string
        userId: string
        expiresAt: Date
        createdAt: Date
        updatedAt: Date
        ipAddress?: string | null
        userAgent?: string | null
    }
}

/**
 * Payload sent to the better-auth `signIn.email` action.
 * `email` is used as the username field when calling the Go backend.
 */
export interface SignInPayload {
    email: string
    password: string
}

/**
 * Payload sent to the better-auth `signUp.email` action.
 */
export interface SignUpPayload {
    email: string
    password: string
    /** Full display name — split into first / last name when calling the Go backend. */
    name: string
}
