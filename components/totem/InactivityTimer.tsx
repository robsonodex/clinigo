'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface InactivityTimerProps {
    /** Timeout in seconds before redirect */
    timeoutSeconds: number
    /** URL to redirect to on inactivity */
    redirectTo: string
    /** Whether the timer is active */
    enabled?: boolean
}

/**
 * Detects user inactivity and redirects to a given URL.
 * Resets on any touch, click, or key press.
 */
export function InactivityTimer({
    timeoutSeconds,
    redirectTo,
    enabled = true,
}: InactivityTimerProps) {
    const router = useRouter()
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    const resetTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current)
        }
        if (enabled) {
            timerRef.current = setTimeout(() => {
                router.push(redirectTo)
            }, timeoutSeconds * 1000)
        }
    }, [timeoutSeconds, redirectTo, enabled, router])

    useEffect(() => {
        if (!enabled) return

        const events = ['touchstart', 'click', 'keydown', 'mousemove']

        events.forEach((event) => {
            window.addEventListener(event, resetTimer, { passive: true })
        })

        // Start initial timer
        resetTimer()

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current)
            events.forEach((event) => {
                window.removeEventListener(event, resetTimer)
            })
        }
    }, [enabled, resetTimer])

    return null // Invisible component
}
