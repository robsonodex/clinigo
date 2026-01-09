'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60 * 1000, // 1 minute
                refetchOnWindowFocus: false,
                retry: 1,
            },
        },
    })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
    if (typeof window === 'undefined') {
        // Server: always make a new query client
        return makeQueryClient()
    } else {
        // Browser: make a new query client if we don't already have one
        if (!browserQueryClient) browserQueryClient = makeQueryClient()
        return browserQueryClient
    }
}

export function Providers({ children }: { children: React.ReactNode }) {
    const queryClient = getQueryClient()

    return (
        <QueryClientProvider client={queryClient}>
            {children}
            <Toaster
                position="top-right"
                toastOptions={{
                    classNames: {
                        error: 'bg-destructive text-destructive-foreground',
                        success: 'bg-green-500 text-white',
                        warning: 'bg-yellow-500 text-white',
                        info: 'bg-blue-500 text-white',
                    },
                }}
            />
        </QueryClientProvider>
    )
}

