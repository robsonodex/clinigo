/**
 * Touch-Friendly Button Component
 * Minimum 44x44px touch target (iOS/Android guideline)
 */
'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TouchButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'primary' | 'secondary' | 'outline' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
}

export const TouchButton = React.forwardRef<HTMLButtonElement, TouchButtonProps>(
    ({ className, variant = 'default', size = 'md', ...props }, ref) => {
        const variantClasses = {
            default: 'bg-primary text-primary-foreground hover:bg-primary/90',
            primary: 'bg-blue-600 text-white hover:bg-blue-700',
            secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
            outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
            ghost: 'hover:bg-accent hover:text-accent-foreground',
        }

        const sizeClasses = {
            sm: 'min-h-[44px] min-w-[44px] px-3 text-sm',
            md: 'min-h-[48px] min-w-[48px] px-4 py-3 md:px-3 md:py-2',
            lg: 'min-h-[52px] min-w-[52px] px-6 py-4 text-lg',
        }

        return (
            <button
                ref={ref}
                className={cn(
                    // Base styles
                    'inline-flex items-center justify-center rounded-md font-medium',
                    'transition-all duration-75',
                    // Touch feedback
                    'active:scale-95',
                    // Prevenir seleção de texto
                    'select-none',
                    // Disabled state
                    'disabled:pointer-events-none disabled:opacity-50',
                    // Focus visible
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    // Variant
                    variantClasses[variant],
                    // Size
                    sizeClasses[size],
                    className
                )}
                {...props}
            />
        )
    }
)

TouchButton.displayName = 'TouchButton'
