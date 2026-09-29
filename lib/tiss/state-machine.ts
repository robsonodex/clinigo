/**
 * CLINIGO - Máquinas de Estado Oficiais de Faturamento TISS (Seção 4)
 * Fonte Única da Verdade para Estados e Transições de Guias, Lotes e Recursos de Glosa.
 */

// =============================================================================
// 1. GUIA TISS
// =============================================================================

export type TissGuideStandardStatus =
    | 'DRAFT'              // Em digitação
    | 'VALIDATED'          // Validada
    | 'IN_BATCH'           // Em lote
    | 'SENT'               // Enviada
    | 'PAID'               // Paga
    | 'PARTIALLY_GLOSED'   // Glosada parcial
    | 'TOTALLY_GLOSED'     // Glosada total
    | 'APPEALING'          // Em recurso
    | 'APPEAL_ACCEPTED'    // Recurso acatado
    | 'APPEAL_PARTIAL'     // Recurso parcial
    | 'DEFINITIVE_LOSS'    // Perda definitiva
    | 'CLOSED'             // Encerrada
    | 'CANCELLED';         // Cancelada

export const GUIDE_STATUS_LABELS_PT: Record<TissGuideStandardStatus, string> = {
    DRAFT: 'Em digitação',
    VALIDATED: 'Validada',
    IN_BATCH: 'Em lote',
    SENT: 'Enviada',
    PAID: 'Paga',
    PARTIALLY_GLOSED: 'Glosada parcial',
    TOTALLY_GLOSED: 'Glosada total',
    APPEALING: 'Em recurso',
    APPEAL_ACCEPTED: 'Recurso acatado',
    APPEAL_PARTIAL: 'Recurso parcial',
    DEFINITIVE_LOSS: 'Perda definitiva',
    CLOSED: 'Encerrada',
    CANCELLED: 'Cancelada',
};

/**
 * Normaliza valores de status legados de guia para o padrão formal da máquina de estados
 */
export function normalizeGuideStatus(status: string): TissGuideStandardStatus {
    const s = String(status || '').toUpperCase().trim();
    switch (s) {
        case 'DRAFT':
            return 'DRAFT';
        case 'PENDING':
        case 'VALID':
        case 'VALIDATED':
            return 'VALIDATED';
        case 'IN_BATCH':
        case 'BATCHED':
            return 'IN_BATCH';
        case 'SENT':
        case 'SUBMITTED':
            return 'SENT';
        case 'PAID':
        case 'APPROVED':
            return 'PAID';
        case 'PARTIAL':
        case 'PARTIALLY_GLOSED':
            return 'PARTIALLY_GLOSED';
        case 'DENIED':
        case 'TOTALLY_GLOSED':
        case 'GLOSA':
            return 'TOTALLY_GLOSED';
        case 'APPEALING':
        case 'IN_REVIEW':
            return 'APPEALING';
        case 'APPEAL_ACCEPTED':
        case 'ACCEPTED':
            return 'APPEAL_ACCEPTED';
        case 'APPEAL_PARTIAL':
            return 'APPEAL_PARTIAL';
        case 'DEFINITIVE_LOSS':
        case 'LOSS':
            return 'DEFINITIVE_LOSS';
        case 'CLOSED':
        case 'FINISHED':
            return 'CLOSED';
        case 'CANCELLED':
        case 'CANCELED':
            return 'CANCELLED';
        default:
            return 'DRAFT';
    }
}

const GUIDE_TRANSITIONS: Record<TissGuideStandardStatus, TissGuideStandardStatus[]> = {
    DRAFT: ['VALIDATED', 'CANCELLED'],
    VALIDATED: ['DRAFT', 'IN_BATCH', 'CANCELLED'],
    IN_BATCH: ['VALIDATED', 'SENT', 'CANCELLED'],
    SENT: ['PAID', 'PARTIALLY_GLOSED', 'TOTALLY_GLOSED'],
    PAID: ['CLOSED'],
    PARTIALLY_GLOSED: ['APPEALING', 'DEFINITIVE_LOSS'],
    TOTALLY_GLOSED: ['APPEALING', 'DEFINITIVE_LOSS'],
    APPEALING: ['APPEAL_ACCEPTED', 'APPEAL_PARTIAL', 'DEFINITIVE_LOSS'],
    APPEAL_ACCEPTED: ['CLOSED'],
    APPEAL_PARTIAL: ['CLOSED'],
    DEFINITIVE_LOSS: ['CLOSED'],
    CLOSED: [],
    CANCELLED: [],
};

export function canTransitionGuide(from: string, to: string): boolean {
    const source = normalizeGuideStatus(from);
    const target = normalizeGuideStatus(to);
    return GUIDE_TRANSITIONS[source].includes(target);
}

export function assertGuideTransition(from: string, to: string): void {
    const source = normalizeGuideStatus(from);
    const target = normalizeGuideStatus(to);
    if (!canTransitionGuide(source, target)) {
        const sourceLabel = GUIDE_STATUS_LABELS_PT[source] || source;
        const targetLabel = GUIDE_STATUS_LABELS_PT[target] || target;
        throw new Error(
            `Transição inválida de Guia: não é permitido alterar de "${sourceLabel}" para "${targetLabel}".`
        );
    }
}

/**
 * Campos de uma guia só podem ser editados em DRAFT e VALIDATED
 */
export function isGuideEditable(status: string): boolean {
    const s = normalizeGuideStatus(status);
    return s === 'DRAFT' || s === 'VALIDATED';
}

// =============================================================================
// 2. LOTE TISS
// =============================================================================

export type TissBatchStandardStatus =
    | 'OPEN'          // Aberto (em digitação)
    | 'CLOSED'        // Fechado
    | 'SENT'          // Enviado
    | 'IN_ANALYSIS'   // Em análise
    | 'RETURNED'      // Retornado (aprovado/parcial/negado)
    | 'FINISHED'      // Encerrado
    | 'CANCELLED';    // Cancelado

export const BATCH_STATUS_LABELS_PT: Record<TissBatchStandardStatus, string> = {
    OPEN: 'Aberto (em digitação)',
    CLOSED: 'Fechado',
    SENT: 'Enviado',
    IN_ANALYSIS: 'Em análise',
    RETURNED: 'Retornado',
    FINISHED: 'Encerrado',
    CANCELLED: 'Cancelado',
};

export function normalizeBatchStatus(status: string): TissBatchStandardStatus {
    const s = String(status || '').toUpperCase().trim();
    switch (s) {
        case 'DRAFT':
        case 'OPEN':
            return 'OPEN';
        case 'VALID':
        case 'VALIDATED':
        case 'CLOSED':
            return 'CLOSED';
        case 'SENT':
        case 'SUBMITTED':
            return 'SENT';
        case 'PROCESSING':
        case 'IN_ANALYSIS':
            return 'IN_ANALYSIS';
        case 'APPROVED':
        case 'PARTIAL':
        case 'DENIED':
        case 'RETURNED':
            return 'RETURNED';
        case 'FINISHED':
        case 'RESOLVED':
            return 'FINISHED';
        case 'CANCELLED':
        case 'CANCELED':
            return 'CANCELLED';
        default:
            return 'OPEN';
    }
}

const BATCH_TRANSITIONS: Record<TissBatchStandardStatus, TissBatchStandardStatus[]> = {
    OPEN: ['CLOSED', 'CANCELLED'],
    CLOSED: ['OPEN', 'SENT'],
    SENT: ['IN_ANALYSIS', 'RETURNED'],
    IN_ANALYSIS: ['RETURNED'],
    RETURNED: ['FINISHED', 'SENT'], // SENT permitido apenas via "Desfazer retorno"
    FINISHED: [],
    CANCELLED: [],
};

export function canTransitionBatch(from: string, to: string, options?: { isUndoReturn?: boolean; hasReopenReason?: boolean }): boolean {
    const source = normalizeBatchStatus(from);
    const target = normalizeBatchStatus(to);

    // Fechado para Aberto exige motivo antes de Enviado
    if (source === 'CLOSED' && target === 'OPEN') {
        if (options && options.hasReopenReason === false) return false;
    }

    // Retornado para Enviado permitido somente com undo formal
    if (source === 'RETURNED' && target === 'SENT') {
        if (!options?.isUndoReturn) return false;
    }

    return BATCH_TRANSITIONS[source].includes(target);
}

export function assertBatchTransition(from: string, to: string, options?: { isUndoReturn?: boolean; hasReopenReason?: boolean }): void {
    const source = normalizeBatchStatus(from);
    const target = normalizeBatchStatus(to);
    if (!canTransitionBatch(source, target, options)) {
        const sourceLabel = BATCH_STATUS_LABELS_PT[source] || source;
        const targetLabel = BATCH_STATUS_LABELS_PT[target] || target;
        throw new Error(
            `Transição inválida de Lote: não é permitido alterar de "${sourceLabel}" para "${targetLabel}".`
        );
    }
}

// =============================================================================
// 3. RECURSO DE GLOSA
// =============================================================================

export type TissAppealStandardStatus =
    | 'IN_PREPARATION'   // Em preparo
    | 'RELEASED'         // Liberado para envio
    | 'SENT'             // Enviado
    | 'IN_ANALYSIS'      // Em análise
    | 'ACCEPTED'         // Acatado
    | 'PARTIAL'          // Parcial
    | 'DENIED'           // Negado
    | 'FINISHED'         // Encerrado
    | 'CANCELLED';       // Cancelado

export const APPEAL_STATUS_LABELS_PT: Record<TissAppealStandardStatus, string> = {
    IN_PREPARATION: 'Em preparo',
    RELEASED: 'Liberado para envio',
    SENT: 'Enviado',
    IN_ANALYSIS: 'Em análise',
    ACCEPTED: 'Acatado',
    PARTIAL: 'Parcial',
    DENIED: 'Negado',
    FINISHED: 'Encerrado',
    CANCELLED: 'Cancelado',
};

export function normalizeAppealStatus(status: string): TissAppealStandardStatus {
    const s = String(status || '').toUpperCase().trim();
    switch (s) {
        case 'PENDING':
        case 'DRAFT':
        case 'IN_PREPARATION':
            return 'IN_PREPARATION';
        case 'RELEASED':
        case 'READY':
            return 'RELEASED';
        case 'SENT':
        case 'SUBMITTED':
            return 'SENT';
        case 'IN_ANALYSIS':
        case 'IN_REVIEW':
            return 'IN_ANALYSIS';
        case 'ACCEPTED':
        case 'APPROVED':
            return 'ACCEPTED';
        case 'PARTIAL':
        case 'PARTIALLY_ACCEPTED':
            return 'PARTIAL';
        case 'DENIED':
        case 'REJECTED':
            return 'DENIED';
        case 'FINISHED':
        case 'CLOSED':
            return 'FINISHED';
        case 'CANCELLED':
        case 'CANCELED':
            return 'CANCELLED';
        default:
            return 'IN_PREPARATION';
    }
}

const APPEAL_TRANSITIONS: Record<TissAppealStandardStatus, TissAppealStandardStatus[]> = {
    IN_PREPARATION: ['RELEASED', 'CANCELLED'],
    RELEASED: ['IN_PREPARATION', 'SENT'],
    SENT: ['IN_ANALYSIS', 'ACCEPTED', 'PARTIAL', 'DENIED'],
    IN_ANALYSIS: ['ACCEPTED', 'PARTIAL', 'DENIED'],
    ACCEPTED: ['FINISHED'],
    PARTIAL: ['FINISHED'],
    DENIED: ['FINISHED'],
    FINISHED: [],
    CANCELLED: [],
};

export function canTransitionAppeal(from: string, to: string): boolean {
    const source = normalizeAppealStatus(from);
    const target = normalizeAppealStatus(to);
    return APPEAL_TRANSITIONS[source].includes(target);
}

export function assertAppealTransition(from: string, to: string): void {
    const source = normalizeAppealStatus(from);
    const target = normalizeAppealStatus(to);
    if (!canTransitionAppeal(source, target)) {
        const sourceLabel = APPEAL_STATUS_LABELS_PT[source] || source;
        const targetLabel = APPEAL_STATUS_LABELS_PT[target] || target;
        throw new Error(
            `Transição inválida de Recurso: não é permitido alterar de "${sourceLabel}" para "${targetLabel}".`
        );
    }
}
