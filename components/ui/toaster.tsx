'use client'

import * as React from 'react'
import { useToast } from './use-toast'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Toaster() {
    const { toasts, dismiss } = useToast()

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
            {toasts.map((toast) => (
                <div
                    key={toast.id}
                    className={cn(
                        'pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-lg border p-4 shadow-lg transition-all',
                        'bg-white border-gray-200',
                        toast.variant === 'destructive' && 'border-red-200 bg-red-50'
                    )}
                    role="alert"
                >
                    <div className="flex-1 space-y-1">
                        {toast.title && (
                            <p className={cn(
                                'text-sm font-semibold',
                                toast.variant === 'destructive' && 'text-red-600'
                            )}>
                                {toast.title}
                            </p>
                        )}
                        {toast.description && (
                            <p className={cn(
                                'text-sm text-muted-foreground',
                                toast.variant === 'destructive' && 'text-red-500'
                            )}>
                                {toast.description}
                            </p>
                        )}
                    </div>
                    {toast.action}
                    <button
                        onClick={() => dismiss(toast.id)}
                        className={cn(
                            'absolute top-2 right-2 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity',
                            toast.variant === 'destructive' && 'text-red-600'
                        )}
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">Fechar</span>
                    </button>
                </div>
            ))}
        </div>
    )
}
