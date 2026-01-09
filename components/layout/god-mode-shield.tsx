'use client'

/**
 * God Mode Shield Component
 * Discrete access to Super Admin portal
 * 
 * Only visible to whitelisted emails
 */

import { Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface GodModeShieldProps {
    userEmail?: string
    className?: string
}

/**
 * Discrete shield icon for Super Admin access
 * Appears with 0.05 opacity, becomes slightly more visible on hover
 * Only navigates if user email is in whitelist
 */
export function GodModeShield({ userEmail, className }: GodModeShieldProps) {
    const router = useRouter()

    // Get whitelist from environment (client-side check - server validates too)
    const whitelist = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []

    // Don't render if no whitelist configured
    if (whitelist.length === 0) {
        return null
    }

    const isWhitelisted = userEmail && whitelist.includes(userEmail.toLowerCase())

    const handleClick = () => {
        if (isWhitelisted) {
            router.push('/dashboard/super')
        } else {
            // Silently do nothing - don't reveal the feature exists
            console.debug('[GodMode] Access denied')
        }
    }

    return (
        <button
            onClick={handleClick}
            className={cn(
                'p-2 rounded-lg transition-all duration-300',
                'opacity-[0.05] hover:opacity-20',
                isWhitelisted && 'cursor-pointer',
                !isWhitelisted && 'cursor-default',
                className
            )}
            aria-label="System Access"
            title=""
        >
            <Shield className="h-4 w-4" />
        </button>
    )
}

/**
 * Server Component version - checks at server level
 */
export async function GodModeShieldServer({ userEmail }: { userEmail?: string }) {
    const whitelist = process.env.SUPER_ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []

    if (!userEmail || !whitelist.includes(userEmail.toLowerCase())) {
        return null
    }

    return (
        <a
            href="/dashboard/super"
            className="p-2 rounded-lg opacity-[0.05] hover:opacity-20 transition-opacity"
            aria-label="System Access"
        >
            <Shield className="h-4 w-4" />
        </a>
    )
}
