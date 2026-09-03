import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    'flex h-8 w-full rounded-xs border border-border bg-background px-2.5 py-1 text-xs shadow-none transition-colors file:border-0 file:bg-transparent file:text-xs file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
                    error && 'border-destructive focus-visible:ring-destructive',
                    className
                )}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = 'Input'

export { Input }
