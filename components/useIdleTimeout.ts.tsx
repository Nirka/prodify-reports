"use client"
import { useEffect, useRef } from "react"
import { signOut } from "next-auth/react"

const IDLE_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

export function useIdleTimeout() {
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const reset = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        signOut({ callbackUrl: "/login?reason=idle" })
      }, IDLE_TIMEOUT_MS)
    }

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"]
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }))

    // Start the timer immediately
    reset()

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      events.forEach((e) => window.removeEventListener(e, reset))
    }
  }, [])
}