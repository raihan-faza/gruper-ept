import { betterAuth } from "better-auth"
import { customSession, jwt } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"
import { LoginUser, RegisterUser } from "@/app/api/user/user"
import type { SessionUser } from "./payloads"
import { Pool } from "pg"
import { Resend } from "resend"
import { cookies } from "next/headers"
import { APIError } from "better-auth/api"

const resend = new Resend(process.env.RESEND_API_KEY)

function getVerificationEmailHtml(url: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Account</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f9fafb;
      padding: 40px 20px;
      box-sizing: border-box;
    }
    .container {
      max-width: 570px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    }
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: #2563eb;
      text-align: center;
      margin-bottom: 24px;
    }
    h1 {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin-top: 0;
      margin-bottom: 16px;
      text-align: center;
    }
    p {
      font-size: 16px;
      line-height: 24px;
      color: #4b5563;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .button-container {
      text-align: center;
      margin-bottom: 24px;
    }
    .btn-primary {
      display: inline-block;
      background-color: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 32px;
      font-size: 16px;
      font-weight: 500;
      border-radius: 6px;
      box-shadow: 0 2px 4px rgba(37, 99, 235, 0.2);
      transition: background-color 0.2s ease;
    }
    .fallback-container {
      margin-top: 32px;
      padding-top: 24px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
    }
    .fallback-link {
      color: #2563eb;
      text-decoration: underline;
    }
    .thanks {
      margin-top: 24px;
      font-size: 15px;
      color: #4b5563;
      line-height: 22px;
    }
    .footer {
      text-align: center;
      margin-top: 32px;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="logo">Scriptsea</div>
      <h1>Verify Your Email Address</h1>
      <p>Thank you for signing up for Scriptsea. Please verify your email address by clicking the button below:</p>
      
      <div class="button-container">
        <a href="${url}" class="btn-primary" target="_blank">Verify Email</a>
      </div>
      
      <div class="fallback-container">
        If the button above does not work, please use the following link instead:
        <a class="fallback-link" href="${url}" target="_blank">Verify Account</a>
      </div>

      <div class="thanks">
        We sincerely thank you for joining us on this journey. We are excited to help you manage your applications, wallets, and workflows. If you have any questions, feel free to reply to this email.
        <br><br>
        Warm regards,<br>
        <strong>The Scriptsea Team</strong>
      </div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Scriptsea. All rights reserved.
    </div>
  </div>
</body>
</html>
    `;
}


export const auth = betterAuth({
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    database: new Pool({
        connectionString: process.env.DATABASE_URL,
    }),
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 7 * 24 * 60 * 60,
            strategy: "jwt",
            refreshCache: true,
        },
        expiresIn: 7 * 24 * 60 * 60,
        updateAge: 1 * 24 * 60 * 60,
    },
    user: {
        additionalFields: {
            username: { type: "string", required: false },
            first_name: { type: "string", required: false },
            last_name: { type: "string", required: false },
            phone_number: { type: "string", required: false },
        }
    },
    databaseHooks: {
        user: {
            create: {
                before: async (user) => {
                    const cookieStore = await cookies()
                    const invitationCode = cookieStore.get("invitation_code")?.value

                    const validCode = process.env.INVITATION_CODE || "GRUPER2026"
                    if (!invitationCode || invitationCode !== validCode) {
                        throw new APIError("BAD_REQUEST", {
                            message: "Invalid or missing invitation code."
                        })
                    }
                    return { data: user }
                },
                after: async (user) => {
                    console.log("user", user)
                    const displayName = (user as any).name || user.email || "User"
                    await RegisterUser({
                        id: user.id,
                        username: user.username as string || displayName,
                        first_name: user.first_name as string || displayName,
                        last_name: user.last_name as string || displayName,
                        phone_number: user.phone_number as string || undefined,
                    })
                }
            }
        }
    },
    emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            try {
                const { data: resendData, error } = await resend.emails.send({
                    from: "Scriptsea <onboarding@resend.dev>",
                    to: user.email,
                    subject: "Verify Your Scriptsea Account",
                    html: getVerificationEmailHtml(url),
                });
                if (error) {
                    console.error("Failed to send verification email:", error);
                } else {
                    console.log("Verification email sent successfully:", resendData);
                }
            } catch (err) {
                console.error("Error sending verification email:", err);
            }
        },
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "google-client-id",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "google-client-secret",
        },
    },
    plugins: [
        customSession(async ({ user, session }) => {
            return {
                user: {
                    ...user,
                } as SessionUser,
                session: {
                    ...session,
                    backendToken: session.token ?? null,
                },
            }
        }),
        nextCookies(),
        jwt()
    ],
})


export type Auth = typeof auth

export async function getToken(requestHeaders: Headers): Promise<string | null> {
    try {
        const session = await auth.api.getSession({ headers: requestHeaders })
        return (session?.session as { token?: string } | null)?.token ?? null
    } catch {
        return null
    }
}
