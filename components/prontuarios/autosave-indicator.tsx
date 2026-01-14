'use client'

/**
 * CLINIGO PREMIUM - AutoSave Status Indicator
 * Squad A: Prontuário Premium
 * 
 * Visual feedback component for auto-save status
 */

import { useEffect, useState } from 'react'
import { Check, Cloud, CloudOff, Loader2, WifiOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutoSaveIndicatorProps {
    isSaving: boolean
    lastSaved: Date | null
    hasUnsavedChanges: boolean
    isOnline?: boolean
    error: Error | null
    className?: string
}

export function AutoSaveIndicator({
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    isOnline = true,
    error,
    className
}: AutoSaveIndicatorProps) {
    const [timeAgo, setTimeAgo] = useState('')

    // Update "time ago" every 10 seconds
    useEffect(() => {
        const updateTimeAgo = () => {
            if (!lastSaved) {
                setTimeAgo('')
                return
            }

            const seconds = Math.floor((Date.now() - lastSaved.getTime()) / 1000)

            if (seconds < 10) {
                setTimeAgo('agora mesmo')
            } else if (seconds < 60) {
                setTimeAgo(`${seconds}s atrás`)
            } else if (seconds < 3600) {
                const minutes = Math.floor(seconds / 60)
                setTimeAgo(`${minutes}min atrás`)
            } else {
                const hours = Math.floor(seconds / 3600)
                setTimeAgo(`${hours}h atrás`)
            }
        }

        updateTimeAgo()
        const interval = setInterval(updateTimeAgo, 10000)

        return () => clearInterval(interval)
    }, [lastSaved])

    // Render different states
    if (error) {
        return (
            <div className={cn('flex items-center gap-2 text-sm text-red-600', className)}>
                <CloudOff className="w-4 h-4 animate-pulse" />
                <span>Erro ao salvar - dados seguros localmente</span>
            </div>
        )
    }

    if (!isOnline) {
        return (
            <div className={cn('flex items-center gap-2 text-sm text-amber-600', className)}>
                <WifiOff className="w-4 h-4" />
                <span>Offline - salvando localmente</span>
            </div>
        )
    }

    if (isSaving) {
        return (
            <div className={cn('flex items-center gap-2 text-sm text-blue-600', className)}>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Salvando...</span>
            </div>
        )
    }

    if (hasUnsavedChanges) {
        return (
            <div className={cn('flex items-center gap-2 text-sm text-gray-500', className)}>
                <Cloud className="w-4 h-4" />
                <span>Alterações não salvas</span>
            </div>
        )
    }

    if (lastSaved) {
        return (
            <div className={cn('flex items-center gap-2 text-sm text-green-600', className)}>
                <Check className="w-4 h-4" />
                <span>Salvo {timeAgo}</span>
            </div>
        )
    }

    return null
}

/**
 * Compact version for toolbar
 */
export function AutoSaveIndicatorCompact({
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    isOnline = true,
    error
}: Omit<AutoSaveIndicatorProps, 'className'>) {
    if (error) {
        return <CloudOff className="w-4 h-4 text-red-600 animate-pulse" title="Erro ao salvar" />
    }

    if (!isOnline) {
        return <WifiOff className="w-4 h-4 text-amber-600" title="Offline" />
    }

    if (isSaving) {
        return <Loader2 className="w-4 h-4 text-blue-600 animate-spin" title="Salvando..." />
    }

    if (hasUnsavedChanges) {
        return <Cloud className="w-4 h-4 text-gray-400" title="Alterações não salvas" />
    }

    if (lastSaved) {
        return <Check className="w-4 h-4 text-green-600" title="Salvo" />
    }

    return null
}
