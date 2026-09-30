'use client';

import { useState, useEffect } from 'react';

/**
 * Hook para consultar o status da feature flag faturamento_premium para a clínica atual.
 * Por padrão estrito de segurança, caso a consulta falhe ou esteja pendente, assume false.
 */
export function useFaturamentoPremium() {
    const [isPremium, setIsPremium] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    useEffect(() => {
        let mounted = true;

        async function fetchPremiumStatus() {
            try {
                const response = await fetch('/api/tiss/settings/premium');
                if (response.ok) {
                    const json = await response.json();
                    if (mounted) {
                        setIsPremium(Boolean(json?.data?.faturamento_premium));
                    }
                } else {
                    if (mounted) setIsPremium(false);
                }
            } catch (err) {
                if (mounted) setIsPremium(false);
            } finally {
                if (mounted) setIsLoading(false);
            }
        }

        fetchPremiumStatus();

        return () => {
            mounted = false;
        };
    }, []);

    return {
        isPremium: isPremium ?? false,
        isLoading,
    };
}
