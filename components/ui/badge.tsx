import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
    'inline-flex items-center rounded-md border px-2.5 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30',
    {
        variants: {
            variant: {
                default:
                    'border-transparent bg-primary text-primary-foreground',
                secondary:
                    'border-border bg-secondary text-secondary-foreground',
                destructive:
                    'border-transparent bg-destructive text-destructive-foreground',
                outline: 'border-border text-foreground bg-card',
                success:
                    'border-[#155E4B]/20 bg-[#E6F2EE] text-[#114D3E] dark:border-emerald-500/30 dark:bg-emerald-950/50 dark:text-emerald-300',
                warning:
                    'border-amber-600/25 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/50 dark:text-amber-300',
                info:
                    'border-sky-600/25 bg-sky-50 text-sky-800 dark:border-sky-500/30 dark:bg-sky-950/50 dark:text-sky-300',
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
