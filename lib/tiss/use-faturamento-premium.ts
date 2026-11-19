'use client';

import { useState, useEffect } from 'react';

const PREMIUM_FLAG_TTL_MS = 5 * 60 * 1000;

let cachedPremiumFlag: boolean | null = null;
let cachedPremiumAt = 0;
let inFlightPremiumPromise: Promise<boolean> | null = null;

export function clearFaturamentoPremiumCache() {
    cachedPremiumFlag = null;
    cachedPremiumAt = 0;
    inFlightPremiumPromise = null;
}

if (typeof window !== 'undefined') {
    window.addEventListener('clinic-modules-updated', clearFaturamentoPremiumCache);
    window.addEventListener('clinic-switched', clearFaturamentoPremiumCache);
    window.addEventListener('clinic-profile-updated', clearFaturamentoPremiumCache);
}

async function fetchPremiumStatusShared(): Promise<boolean> {
    const now = Date.now();
    if (cachedPremiumFlag !== null && now - cachedPremiumAt < PREMIUM_FLAG_TTL_MS) {
        return cachedPremiumFlag;
    }

    if (inFlightPremiumPromise) {
        return inFlightPremiumPromise;
    }

    inFlightPremiumPromise = (async () => {
        try {
            const response = await fetch('/api/tiss/settings/premium');
            if (response.ok) {
                const json = await response.json();
                const val = Boolean(json?.data?.faturamento_premium);
                cachedPremiumFlag = val;
                cachedPremiumAt = Date.now();
                return val;
            }
            if (response.status === 403) {
                cachedPremiumFlag = false;
                cachedPremiumAt = Date.now();
            }
            return false;
        } catch {
            return cachedPremiumFlag ?? false;
        } finally {
            inFlightPremiumPromise = null;
        }
    })();

    return inFlightPremiumPromise;
}

/**
 * Hook para consultar o status da feature flag faturamento_premium para a clínica atual.
 * Mantém cache em memória compartilhado (TTL de 5 minutos) e deduplicação de requisições
 * simultâneas para evitar flash visual e múltiplas chamadas redundantes à API.
 */
export function useFaturamentoPremium() {
    const isCacheFresh =
        cachedPremiumFlag !== null && Date.now() - cachedPremiumAt < PREMIUM_FLAG_TTL_MS;

    const [isPremium, setIsPremium] = useState<boolean>(cachedPremiumFlag ?? true);
    const [isLoading, setIsLoading] = useState<boolean>(!isCacheFresh);

    useEffect(() => {
        let mounted = true;

        if (cachedPremiumFlag !== null && Date.now() - cachedPremiumAt < PREMIUM_FLAG_TTL_MS) {
            setIsPremium(cachedPremiumFlag);
            setIsLoading(false);
            return () => {
                mounted = false;
            };
        }

        fetchPremiumStatusShared().then((val) => {
            if (mounted) {
                setIsPremium(val);
                setIsLoading(false);
            }
        });

        return () => {
            mounted = false;
        };
    }, []);

    return {
        isPremium,
        isLoading,
    };
}
