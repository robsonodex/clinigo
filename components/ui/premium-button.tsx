import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const premiumButtonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-brutal text-sm font-medium transition-all duration-300 ease-premium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-teal focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                primary:
                    'bg-gradient-to-r from-medical-dark to-medical-teal text-white shadow-premium-lg hover:shadow-premium-xl hover:scale-[1.02] active:scale-[0.98]',
                secondary:
                    'bg-medical-teal/10 text-medical-teal border-2 border-medical-teal hover:bg-medical-teal hover:text-white shadow-premium hover:shadow-premium-lg',
                ghost:
                    'text-medical-dark hover:bg-medical-dark/5 hover:text-medical-teal',
                outline:
                    'border-2 border-medical-dark/20 bg-transparent hover:bg-medical-dark hover:text-white hover:border-medical-dark',
            },
            size: {
                default: 'h-12 px-6 py-3',
                sm: 'h-10 px-4 py-2 text-xs',
                lg: 'h-14 px-8 py-4 text-base',
                xl: 'h-16 px-10 py-5 text-lg',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'default',
        },
    }
)

export interface PremiumButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof premiumButtonVariants> {
    asChild?: boolean
}

const PremiumButton = React.forwardRef<HTMLButtonElement, PremiumButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button'
        return (
            <Comp
                className={cn(premiumButtonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
PremiumButton.displayName = 'PremiumButton'

export { PremiumButton, premiumButtonVariants }
