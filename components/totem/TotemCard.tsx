'use client'

interface TotemCardProps {
    children: React.ReactNode
    className?: string
    onClick?: () => void
    disabled?: boolean
}

/**
 * Base card for totem screens.
 * Large, touch-friendly, with consistent styling.
 */
export function TotemCard({
    children,
    className = '',
    onClick,
    disabled = false,
}: TotemCardProps) {
    const isClickable = !!onClick && !disabled

    return (
        <div
            onClick={isClickable ? onClick : undefined}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={
                isClickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            onClick?.()
                        }
                    }
                    : undefined
            }
            className={`
                bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8
                ${isClickable ? 'cursor-pointer hover:bg-white/10 hover:border-white/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200' : ''}
                ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
                ${className}
            `}
        >
            {children}
        </div>
    )
}
