import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const premiumCardVariants = cva(
    'rounded-brutal bg-white border-2 transition-all duration-300 ease-premium',
    {
        variants: {
            variant: {
                default:
                    'border-medical-dark/10 shadow-premium hover:shadow-premium-lg hover:-translate-y-1',
                elevated:
                    'border-medical-dark/20 shadow-premium-lg hover:shadow-premium-xl hover:-translate-y-2',
                glow:
                    'border-medical-teal/30 shadow-glow-teal hover:shadow-glow-emerald hover:border-medical-emerald/30',
            },
            padding: {
                none: 'p-0',
                sm: 'p-4',
                default: 'p-6',
                lg: 'p-8',
                xl: 'p-10',
            },
        },
        defaultVariants: {
            variant: 'default',
            padding: 'default',
        },
    }
)

export interface PremiumCardProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof premiumCardVariants> { }

const PremiumCard = React.forwardRef<HTMLDivElement, PremiumCardProps>(
    ({ className, variant, padding, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(premiumCardVariants({ variant, padding, className }))}
                {...props}
            />
        )
    }
)
PremiumCard.displayName = 'PremiumCard'

const PremiumCardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5', className)}
        {...props}
    />
))
PremiumCardHeader.displayName = 'PremiumCardHeader'

const PremiumCardTitle = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn(
            'text-2xl font-semibold leading-none tracking-tight text-medical-dark',
            className
        )}
        {...props}
    />
))
PremiumCardTitle.displayName = 'PremiumCardTitle'

const PremiumCardDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn('text-sm text-slate-600', className)}
        {...props}
    />
))
PremiumCardDescription.displayName = 'PremiumCardDescription'

const PremiumCardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn('pt-0', className)} {...props} />
))
PremiumCardContent.displayName = 'PremiumCardContent'

const PremiumCardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('flex items-center pt-4', className)}
        {...props}
    />
))
PremiumCardFooter.displayName = 'PremiumCardFooter'

export {
    PremiumCard,
    PremiumCardHeader,
    PremiumCardFooter,
    PremiumCardTitle,
    PremiumCardDescription,
    PremiumCardContent,
}
