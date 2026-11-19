import * as React from 'react'
import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                'flex min-h-[76px] w-full rounded-md border border-border bg-background/70 px-3 py-2 text-sm text-foreground shadow-none transition-colors placeholder:text-muted-foreground focus-visible:bg-card focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50',
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
Textarea.displayName = 'Textarea'

export { Textarea }
