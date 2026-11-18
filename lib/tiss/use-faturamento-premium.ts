'use client';

import { useState, useEffect } from 'react';

let cachedPremiumFlag: boolean | null = null;

/**
 * Hook para consultar o status da feature flag faturamento_premium para a clínica atual.
 * Mantém cache em memória de módulo para evitar flash visual (Legacy -> Premium) ao navegar ou atualizar.
 */
export function useFaturamentoPremium() {
    const [isPremium, setIsPremium] = useState<boolean>(cachedPremiumFlag ?? true);
    const [isLoading, setIsLoading] = useState<boolean>(cachedPremiumFlag === null);

    useEffect(() => {
        let mounted = true;

        async function fetchPremiumStatus() {
            try {
                const response = await fetch('/api/tiss/settings/premium');
                if (response.ok) {
                    const json = await response.json();
                    const val = Boolean(json?.data?.faturamento_premium);
                    cachedPremiumFlag = val;
                    if (mounted) {
                        setIsPremium(val);
                    }
                } else {
                    cachedPremiumFlag = false;
                    if (mounted) setIsPremium(false);
                }
            } catch {
                cachedPremiumFlag = false;
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
        isPremium,
        isLoading,
    };
}
