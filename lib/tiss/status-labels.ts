import {
    TissGuideStandardStatus,
    GUIDE_STATUS_LABELS_PT,
    TissBatchStandardStatus,
    BATCH_STATUS_LABELS_PT,
    TissAppealStandardStatus,
    APPEAL_STATUS_LABELS_PT,
    normalizeGuideStatus,
    normalizeBatchStatus,
    normalizeAppealStatus,
} from './state-machine';

/**
 * CLINIGO - Camada Unificada de Rótulos, Cores e Badges PT-BR (B1.2)
 * Padrão: SaaS Médico Corporativo Internacional (Zero emojis, contraste AA)
 */

export interface StatusMeta {
    label: string;
    variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'warning' | 'success';
    badgeClass: string;
}

export function getGuideStatusMeta(status: string): StatusMeta {
    const s = normalizeGuideStatus(status);
    const label = GUIDE_STATUS_LABELS_PT[s] || s;

    switch (s) {
        case 'DRAFT':
            return {
                label,
                variant: 'secondary',
                badgeClass: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
            };
        case 'VALIDATED':
            return {
                label,
                variant: 'default',
                badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
            };
        case 'IN_BATCH':
            return {
                label,
                variant: 'secondary',
                badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
            };
        case 'SENT':
            return {
                label,
                variant: 'default',
                badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
            };
        case 'PAID':
            return {
                label,
                variant: 'success',
                badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
            };
        case 'PARTIALLY_GLOSED':
            return {
                label,
                variant: 'warning',
                badgeClass: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border-orange-200 dark:border-orange-800',
            };
        case 'TOTALLY_GLOSED':
        case 'DEFINITIVE_LOSS':
            return {
                label,
                variant: 'destructive',
                badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
            };
        case 'APPEALING':
            return {
                label,
                variant: 'secondary',
                badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
            };
        case 'APPEAL_ACCEPTED':
            return {
                label,
                variant: 'success',
                badgeClass: 'bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 border-teal-200 dark:border-teal-800',
            };
        case 'APPEAL_PARTIAL':
            return {
                label,
                variant: 'warning',
                badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800',
            };
        case 'CLOSED':
            return {
                label,
                variant: 'outline',
                badgeClass: 'bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700',
            };
        case 'CANCELLED':
            return {
                label,
                variant: 'outline',
                badgeClass: 'bg-zinc-100 text-zinc-500 line-through dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
            };
        default:
            return {
                label,
                variant: 'secondary',
                badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200',
            };
    }
}

export function getBatchStatusMeta(status: string): StatusMeta {
    const s = normalizeBatchStatus(status);
    const label = BATCH_STATUS_LABELS_PT[s] || s;

    switch (s) {
        case 'OPEN':
            return {
                label,
                variant: 'secondary',
                badgeClass: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
            };
        case 'CLOSED':
            return {
                label,
                variant: 'default',
                badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
            };
        case 'SENT':
            return {
                label,
                variant: 'default',
                badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
            };
        case 'IN_ANALYSIS':
            return {
                label,
                variant: 'secondary',
                badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
            };
        case 'RETURNED':
            return {
                label,
                variant: 'warning',
                badgeClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800',
            };
        case 'FINISHED':
            return {
                label,
                variant: 'outline',
                badgeClass: 'bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700',
            };
        case 'CANCELLED':
            return {
                label,
                variant: 'destructive',
                badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
            };
        default:
            return {
                label,
                variant: 'secondary',
                badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200',
            };
    }
}

export function getAppealStatusMeta(status: string): StatusMeta {
    const s = normalizeAppealStatus(status);
    const label = APPEAL_STATUS_LABELS_PT[s] || s;

    switch (s) {
        case 'IN_PREPARATION':
            return {
                label,
                variant: 'secondary',
                badgeClass: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700',
            };
        case 'RELEASED':
            return {
                label,
                variant: 'default',
                badgeClass: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800',
            };
        case 'SENT':
            return {
                label,
                variant: 'default',
                badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800',
            };
        case 'IN_ANALYSIS':
            return {
                label,
                variant: 'secondary',
                badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800',
            };
        case 'ACCEPTED':
            return {
                label,
                variant: 'success',
                badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
            };
        case 'PARTIAL':
            return {
                label,
                variant: 'warning',
                badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border-amber-300 dark:border-amber-800',
            };
        case 'DENIED':
            return {
                label,
                variant: 'destructive',
                badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-800',
            };
        case 'FINISHED':
            return {
                label,
                variant: 'outline',
                badgeClass: 'bg-zinc-50 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700',
            };
        case 'CANCELLED':
            return {
                label,
                variant: 'destructive',
                badgeClass: 'bg-zinc-100 text-zinc-500 border-zinc-200',
            };
        default:
            return {
                label,
                variant: 'secondary',
                badgeClass: 'bg-zinc-100 text-zinc-700 border-zinc-200',
            };
    }
}
