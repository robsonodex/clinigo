/**
 * Responsive Dialog Component
 * Dialog on desktop, Drawer on mobile
 */
'use client'

import * as React from 'react'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer'

interface ResponsiveDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    title?: string
    description?: string
    children: React.ReactNode
    className?: string
}

export function ResponsiveDialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    className,
}: ResponsiveDialogProps) {
    const isMobile = useMediaQuery('(max-width: 767px)')

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className={className}>
                    {(title || description) ? (
                        <DrawerHeader>
                            {title && <DrawerTitle>{title}</DrawerTitle>}
                            {description && <DrawerDescription>{description}</DrawerDescription>}
                        </DrawerHeader>
                    ) : (
                        <DrawerHeader className="sr-only">
                            <DrawerTitle>Drawer</DrawerTitle>
                            <DrawerDescription>Drawer content</DrawerDescription>
                        </DrawerHeader>
                    )}
                    <div className="px-4 pb-4 max-h-[85vh] overflow-auto">
                        {children}
                    </div>
                </DrawerContent>
            </Drawer>
        )
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={className}>
                {(title || description) ? (
                    <DialogHeader>
                        {title && <DialogTitle>{title}</DialogTitle>}
                        {description && <DialogDescription>{description}</DialogDescription>}
                    </DialogHeader>
                ) : (
                    <DialogHeader className="sr-only">
                        <DialogTitle>Dialog</DialogTitle>
                        <DialogDescription>Dialog content</DialogDescription>
                    </DialogHeader>
                )}
                {children}
            </DialogContent>
        </Dialog>
    )
}
