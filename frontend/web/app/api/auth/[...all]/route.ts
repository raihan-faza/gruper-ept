import { auth } from "@/app/api/auth/auth"
import { toNextJsHandler } from "better-auth/next-js"

/**
 * Next.js Route Handler for all better-auth endpoints.
 *
 * Mounts the entire better-auth API under `/api/auth/[...all]`, which exposes:
 *   POST /api/auth/sign-in/email
 *   POST /api/auth/sign-up/email
 *   POST /api/auth/sign-out
 *   GET  /api/auth/get-session
 *   ...and any additional endpoints added by plugins.
 */
import { NextRequest, NextResponse } from "next/server"

const authHandler = toNextJsHandler(auth)

export async function GET(request: NextRequest) {
    const url = new URL(request.url)
    if (url.pathname.includes("/error")) {
        const error = url.searchParams.get("error")
        if (error && (error.includes("Invalid_or_missing_invitation_code") || error.toLowerCase().includes("invitation"))) {
            return NextResponse.redirect(new URL("/login?error=You%20need%20to%20register%20first", request.url))
        }
    }
    return authHandler.GET(request)
}

export async function POST(request: NextRequest) {
    return authHandler.POST(request)
}
