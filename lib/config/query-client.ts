/**
 * React Query Configuration
 * Aggressive caching for optimal performance
 */
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Cache por 5 minutos
            staleTime: 5 * 60 * 1000,
            // Manter cache por 30 minutos
            gcTime: 30 * 60 * 1000,
            // Retry apenas 1 vez
            retry: 1,
            // Refetch apenas quando foco
            refetchOnWindowFocus: false,
            // Não refetch ao montar se tem cache
            refetchOnMount: false,
        },
        mutations: {
            // Retry mutations apenas 1 vez
            retry: 1,
        },
    },
})
