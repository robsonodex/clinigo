'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { SessionGuardProvider } from '@/components/providers/SessionGuardProvider'
import { AuthProvider } from '@/components/providers/AuthProvider'

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 5 * 60 * 1000, // 5 minutos de dados frescos (elimina refetches em trocas de tela)
                gcTime: 30 * 60 * 1000, // 30 minutos em memória
                refetchOnWindowFocus: false, // Não refetch ao trocar de aba
                refetchOnMount: false, // Reutiliza dados se estiverem no cache
                refetchOnReconnect: false,
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
            <AuthProvider>
                <SessionGuardProvider />
                {children}
            </AuthProvider>
            <Toaster
                position="top-right"
                toastOptions={{
                    classNames: {
                        toast: '!rounded-lg !border !shadow-lg !font-sans',
                        title: '!font-semibold !text-sm !text-current',
                        description: '!text-xs !text-current !opacity-90',
                        success: '!bg-[#155E4B] !text-white !border-[#0F493A]',
                        error: '!bg-[#B91C1C] !text-white !border-[#991B1B]',
                        warning: '!bg-[#B45309] !text-white !border-[#92400E]',
                        info: '!bg-[#0F1F1B] !text-[#F2F5F3] !border-[#243E36]',
                    },
                }}
            />
        </QueryClientProvider>
    )
}

