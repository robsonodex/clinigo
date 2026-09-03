import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
    'inline-flex items-center rounded-xs border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-ring',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900',
                secondary:
                    'border-border bg-secondary text-secondary-foreground',
                destructive:
                    'border-transparent bg-destructive text-destructive-foreground',
                outline: 'border-border text-foreground',
                success:
                    'border-emerald-600/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
                warning:
                    'border-amber-600/30 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
                info:
                    'border-blue-600/30 bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <span className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
