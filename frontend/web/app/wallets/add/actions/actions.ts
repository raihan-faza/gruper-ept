"use server"

import { redirect } from "next/navigation"
import { CreateWallet } from "@/app/api/wallet/wallet"
import { getToken } from "@/app/api/auth/auth"
import { headers } from "next/headers"

export interface CreateWalletState {
  error?: string
  success?: boolean
}

export async function SubmitCreateWalletForm(prevState: CreateWalletState | null, formData: FormData): Promise<CreateWalletState> {
  const walletName = (formData.get("wallet_name") as string)?.trim()
  const description = (formData.get("description") as string)?.trim() // Description might not be supported by backend yet, we can pass it if we add it

  if (!walletName) {
    return { error: "Wallet name is required." }
  }

  const token = await getToken(await headers())
  
  if (!token) {
    return { error: "You must be logged in to create a wallet." }
  }

  let success = false
  try {
    await CreateWallet({
      wallet_name: walletName,
      initial_balance: 0,
      currency: "IDR"
    }, token)
    success = true
  } catch (error: any) {
    return { error: error.message || "Failed to create wallet." }
  }

  if (success) {
    redirect("/wallets")
  }

  return {}
}
