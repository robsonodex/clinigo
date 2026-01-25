'use client'

import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface NoShowPatientBadgeProps {
    noShowCount: number
    className?: string
}

export function NoShowPatientBadge({ noShowCount, className }: NoShowPatientBadgeProps) {
    if (noShowCount < 3) return null

    return (
        <Badge variant="destructive" className={cn('gap-1.5', className)}>
            <AlertTriangle className="w-3 h-3" />
            Costuma faltar ({noShowCount} faltas)
        </Badge>
    )
}

function cn(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ')
}
