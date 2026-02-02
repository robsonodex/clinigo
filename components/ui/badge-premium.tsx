import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
    'inline-flex items-center rounded-brutal border-2 px-3 py-1 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
    {
        variants: {
            variant: {
                pioneer:
                    'border-medical-emerald bg-medical-emerald/10 text-medical-emerald hover:bg-medical-emerald hover:text-white',
                secure:
                    'border-medical-dark bg-medical-dark/10 text-medical-dark hover:bg-medical-dark hover:text-white',
                native:
                    'border-medical-teal bg-medical-teal/10 text-medical-teal hover:bg-medical-teal hover:text-white',
                certified:
                    'border-amber-600 bg-amber-50 text-amber-700 hover:bg-amber-600 hover:text-white',
                hd:
                    'border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white',
                realtime:
                    'border-red-600 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white',
                complete:
                    'border-green-600 bg-green-50 text-green-700 hover:bg-green-600 hover:text-white',
            },
        },
        defaultVariants: {
            variant: 'native',
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
