'use client'

import { AlertTriangle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OverdueBadgeProps {
    minutesOverdue: number
    className?: string
}

export function OverdueBadge({ minutesOverdue, className }: OverdueBadgeProps) {
    // Determine severity based on delay
    const getSeverity = () => {
        if (minutesOverdue < 30) return 'warning' // Yellow
        if (minutesOverdue < 60) return 'danger'  // Orange
        return 'critical' // Red with pulse
    }

    const severity = getSeverity()

    const styles = {
        warning: 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800',
        danger: 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
        critical: 'bg-red-100 text-red-800 border-red-300 animate-pulse dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
    }

    const formatTime = (minutes: number) => {
        if (minutes < 60) return `${Math.round(minutes)}min`
        const hours = Math.floor(minutes / 60)
        const mins = Math.round(minutes % 60)
        return `${hours}h${mins > 0 ? mins + 'min' : ''}`
    }

    return (
        <div className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium',
            styles[severity],
            className
        )}>
            {severity === 'critical' ? (
                <AlertTriangle className="w-3.5 h-3.5" />
            ) : (
                <Clock className="w-3.5 h-3.5" />
            )}
            <span>Atrasado {formatTime(minutesOverdue)}</span>
        </div>
    )
}
