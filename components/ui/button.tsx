import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-xs font-semibold transition-all duration-150 active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 cursor-pointer',
    {
        variants: {
            variant: {
                default:
                    'bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(15,31,27,0.08)] hover:bg-primary/90',
                destructive:
                    'bg-destructive text-destructive-foreground shadow-[0_1px_2px_rgba(15,31,27,0.08)] hover:bg-destructive/90',
                outline:
                    'border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground hover:border-primary/30',
                secondary:
                    'bg-secondary text-secondary-foreground hover:bg-secondary/80',
                ghost: 'text-foreground/85 hover:bg-accent hover:text-accent-foreground',
                link: 'text-primary underline-offset-4 hover:underline',
                premium:
                    'btn-premium text-white',
            },
            size: {
                default: 'h-9 px-4 py-2 text-xs',
                sm: 'h-8 px-3 text-xs',
                lg: 'h-10 px-6 text-sm',
                xl: 'h-11 px-8 text-sm',
                icon: 'h-9 w-9',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'default',
        },
    }
)


export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
    loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
        const Comp = asChild ? Slot : 'button'

        // When asChild is true, we need to ensure the child is a single element
        // The loading spinner should not be rendered with asChild since the child element handles its own content
        if (asChild) {
            return (
                <Comp
                    className={cn(buttonVariants({ variant, size, className }))}
                    ref={ref}
                    {...props}
                >
                    {children}
                </Comp>
            )
        }

        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={disabled || loading}
                {...props}
            >
                {loading && <Loader2 className="animate-spin" />}
                {children}
            </Comp>
        )
    }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
