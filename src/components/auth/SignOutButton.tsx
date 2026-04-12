"use client"

import { signOut } from "next-auth/react"

export default function SignOutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="text-xs text-text-secondary/60 hover:text-coral transition-colors cursor-pointer"
    >
      Ieși din cont
    </button>
  )
}
