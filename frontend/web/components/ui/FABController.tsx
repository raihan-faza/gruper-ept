"use client"

import { usePathname } from "next/navigation"
import SpeedDialFAB from "./SpeedDialFAB"
import SingleFAB from "./SingleFAB"
import { useSessionOfflineSafe } from "@/lib/auth-client"

/**
 * Renders the appropriate FAB based on the current route, only if the user is logged in.
 * - /wallets → SpeedDialFAB (two actions: add expense + create wallet)
 * - all other routes → SingleFAB (direct link to add expense)
 */
export default function FABController() {
  const pathname = usePathname()
  const { data: session, isPending } = useSessionOfflineSafe()

  // Do not render the FAB if the user is not logged in or during initial session resolution
  if (isPending || !session) {
    return null
  }

  if (pathname === "/wallets") {
    return <SpeedDialFAB />
  }

  return <SingleFAB />
}
