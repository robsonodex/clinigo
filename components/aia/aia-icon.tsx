'use client'

import { cn } from '@/lib/utils'

interface AiAIconProps {
    className?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    animated?: boolean
    variant?: 'default' | 'ring' | 'pulse'
}

const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
}

/**
 * AiA - Visual Identity Component
 * Minimalist "A" icon with pulsing ring animation
 */
export function AiAIcon({
    className,
    size = 'md',
    animated = true,
    variant = 'default'
}: AiAIconProps) {
    return (
        <div className={cn('relative inline-flex items-center justify-center', className)}>
            {/* Outer pulsing ring */}
            {animated && variant !== 'default' && (
                <div className={cn(
                    'absolute rounded-full',
                    sizeClasses[size],
                    variant === 'pulse' && 'animate-ping bg-emerald-400/30',
                    variant === 'ring' && 'animate-pulse border-2 border-emerald-400/50'
                )} />
            )}

            {/* Main circle */}
            <div className={cn(
                'relative flex items-center justify-center rounded-full',
                'bg-gradient-to-br from-emerald-500 to-teal-600',
                'shadow-lg shadow-emerald-500/30',
                sizeClasses[size],
                animated && 'transition-transform hover:scale-110'
            )}>
                {/* Stylized "A" */}
                <span className="font-bold text-white tracking-tight">
                    A<sub className="text-[0.6em] opacity-80">i</sub>A
                </span>
            </div>

            {/* Glow effect */}
            {animated && (
                <div className={cn(
                    'absolute inset-0 rounded-full',
                    'bg-gradient-to-br from-emerald-400 to-teal-500',
                    'opacity-0 group-hover:opacity-20 blur-md transition-opacity'
                )} />
            )}
        </div>
    )
}

/**
 * AiA Badge - For inline mentions
 */
export function AiABadge({ className }: { className?: string }) {
    return (
        <span className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
            'bg-emerald-100 text-emerald-700 text-xs font-medium',
            'dark:bg-emerald-900/30 dark:text-emerald-400',
            className
        )}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            AiA
        </span>
    )
}

/**
 * AiA Loading State
 */
export function AiALoading({ message = 'AiA está analisando...' }: { message?: string }) {
    return (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
            <AiAIcon size="md" variant="pulse" />
            <div>
                <p className="font-medium text-emerald-700 dark:text-emerald-400">{message}</p>
                <p className="text-xs text-emerald-600/70 mt-0.5">
                    Inteligência Preditiva CliniGo
                </p>
            </div>
        </div>
    )
}

/**
 * AiA Signature - For messages
 */
export function AiASignature({ variant = 'full' }: { variant?: 'full' | 'compact' }) {
    if (variant === 'compact') {
        return (
            <span className="text-xs text-muted-foreground italic">
                — AiA, assistente do CliniGo
            </span>
        )
    }

    return (
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
            <AiAIcon size="sm" animated={false} />
            <div className="text-xs text-muted-foreground">
                <p className="font-medium">AiA - Inteligência Preditiva</p>
                <p>CliniGo Health Platform</p>
            </div>
        </div>
    )
}

/**
 * AiA Button - For triggering AI actions
 */
export function AiAButton({
    onClick,
    loading = false,
    disabled = false,
    children = 'Consultar AiA'
}: {
    onClick?: () => void
    loading?: boolean
    disabled?: boolean
    children?: React.ReactNode
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled || loading}
            className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-gradient-to-r from-emerald-500 to-teal-600',
                'text-white font-medium shadow-md',
                'hover:from-emerald-600 hover:to-teal-700',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all'
            )}
        >
            <AiAIcon size="sm" animated={!loading} />
            {loading ? 'AiA analisando...' : children}
        </button>
    )
}
