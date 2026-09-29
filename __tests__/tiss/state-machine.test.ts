import {
    canTransitionGuide,
    assertGuideTransition,
    isGuideEditable,
    normalizeGuideStatus,
    canTransitionBatch,
    assertBatchTransition,
    normalizeBatchStatus,
    canTransitionAppeal,
    assertAppealTransition,
    normalizeAppealStatus,
} from '@/lib/tiss/state-machine';

describe('Máquinas de Estado TISS (Seção 4)', () => {
    describe('Guia TISS', () => {
        it('permite fluxo regular: DRAFT -> VALIDATED -> IN_BATCH -> SENT -> PAID -> CLOSED', () => {
            expect(canTransitionGuide('DRAFT', 'VALIDATED')).toBe(true);
            expect(canTransitionGuide('VALIDATED', 'IN_BATCH')).toBe(true);
            expect(canTransitionGuide('IN_BATCH', 'SENT')).toBe(true);
            expect(canTransitionGuide('SENT', 'PAID')).toBe(true);
            expect(canTransitionGuide('PAID', 'CLOSED')).toBe(true);
        });

        it('permite re-edição: VALIDATED -> DRAFT e desvinculação: IN_BATCH -> VALIDATED', () => {
            expect(canTransitionGuide('VALIDATED', 'DRAFT')).toBe(true);
            expect(canTransitionGuide('IN_BATCH', 'VALIDATED')).toBe(true);
        });

        it('permite cancelamento a partir de DRAFT, VALIDATED ou IN_BATCH', () => {
            expect(canTransitionGuide('DRAFT', 'CANCELLED')).toBe(true);
            expect(canTransitionGuide('VALIDATED', 'CANCELLED')).toBe(true);
            expect(canTransitionGuide('IN_BATCH', 'CANCELLED')).toBe(true);
        });

        it('PROÍBE cancelamento ou exclusão de guia após envio (SENT -> CANCELLED)', () => {
            expect(canTransitionGuide('SENT', 'CANCELLED')).toBe(false);
            expect(() => assertGuideTransition('SENT', 'CANCELLED')).toThrow(/não é permitido alterar/);
        });

        it('PROÍBE cancelamento de guia paga ou encerrada', () => {
            expect(canTransitionGuide('PAID', 'CANCELLED')).toBe(false);
            expect(canTransitionGuide('CLOSED', 'CANCELLED')).toBe(false);
        });

        it('trata glosa parcial e total com recurso e desfecho', () => {
            expect(canTransitionGuide('SENT', 'PARTIALLY_GLOSED')).toBe(true);
            expect(canTransitionGuide('SENT', 'TOTALLY_GLOSED')).toBe(true);
            expect(canTransitionGuide('PARTIALLY_GLOSED', 'APPEALING')).toBe(true);
            expect(canTransitionGuide('PARTIALLY_GLOSED', 'DEFINITIVE_LOSS')).toBe(true);
            expect(canTransitionGuide('APPEALING', 'APPEAL_ACCEPTED')).toBe(true);
            expect(canTransitionGuide('APPEALING', 'APPEAL_PARTIAL')).toBe(true);
            expect(canTransitionGuide('APPEALING', 'DEFINITIVE_LOSS')).toBe(true);
            expect(canTransitionGuide('APPEAL_ACCEPTED', 'CLOSED')).toBe(true);
        });

        it('valida editabilidade: apenas DRAFT e VALIDATED são editáveis', () => {
            expect(isGuideEditable('DRAFT')).toBe(true);
            expect(isGuideEditable('VALIDATED')).toBe(true);
            expect(isGuideEditable('IN_BATCH')).toBe(false);
            expect(isGuideEditable('SENT')).toBe(false);
            expect(isGuideEditable('PAID')).toBe(false);
            expect(isGuideEditable('CLOSED')).toBe(false);
        });
    });

    describe('Lote TISS', () => {
        it('permite ciclo normal: OPEN -> CLOSED -> SENT -> RETURNED -> FINISHED', () => {
            expect(canTransitionBatch('OPEN', 'CLOSED')).toBe(true);
            expect(canTransitionBatch('CLOSED', 'SENT')).toBe(true);
            expect(canTransitionBatch('SENT', 'RETURNED')).toBe(true);
            expect(canTransitionBatch('RETURNED', 'FINISHED')).toBe(true);
        });

        it('permite reabrir lote antes de enviado: CLOSED -> OPEN com justificativa', () => {
            expect(canTransitionBatch('CLOSED', 'OPEN', { hasReopenReason: true })).toBe(true);
            expect(canTransitionBatch('CLOSED', 'OPEN', { hasReopenReason: false })).toBe(false);
        });

        it('permite transição de retorno para enviado SOMENTE via Desfazer Retorno', () => {
            expect(canTransitionBatch('RETURNED', 'SENT', { isUndoReturn: true })).toBe(true);
            expect(canTransitionBatch('RETURNED', 'SENT', { isUndoReturn: false })).toBe(false);
            expect(canTransitionBatch('RETURNED', 'SENT')).toBe(false);
        });

        it('PROÍBE reabertura de lote já enviado (SENT -> OPEN)', () => {
            expect(canTransitionBatch('SENT', 'OPEN')).toBe(false);
            expect(() => assertBatchTransition('SENT', 'OPEN')).toThrow(/não é permitido alterar/);
        });

        it('permite cancelamento a partir de OPEN', () => {
            expect(canTransitionBatch('OPEN', 'CANCELLED')).toBe(true);
            expect(canTransitionBatch('SENT', 'CANCELLED')).toBe(false);
        });
    });

    describe('Recurso de Glosa TISS', () => {
        it('permite ciclo completo: IN_PREPARATION -> RELEASED -> SENT -> ACCEPTED -> FINISHED', () => {
            expect(canTransitionAppeal('IN_PREPARATION', 'RELEASED')).toBe(true);
            expect(canTransitionAppeal('RELEASED', 'SENT')).toBe(true);
            expect(canTransitionAppeal('SENT', 'ACCEPTED')).toBe(true);
            expect(canTransitionAppeal('ACCEPTED', 'FINISHED')).toBe(true);
        });

        it('permite reverter liberação: RELEASED -> IN_PREPARATION', () => {
            expect(canTransitionAppeal('RELEASED', 'IN_PREPARATION')).toBe(true);
        });

        it('permite cancelamento apenas a partir de IN_PREPARATION', () => {
            expect(canTransitionAppeal('IN_PREPARATION', 'CANCELLED')).toBe(true);
            expect(canTransitionAppeal('SENT', 'CANCELLED')).toBe(false);
            expect(canTransitionAppeal('ACCEPTED', 'CANCELLED')).toBe(false);
        });

        it('PROÍBE envio direto sem prévia liberação (IN_PREPARATION -> SENT)', () => {
            expect(canTransitionAppeal('IN_PREPARATION', 'SENT')).toBe(false);
            expect(() => assertAppealTransition('IN_PREPARATION', 'SENT')).toThrow(/não é permitido alterar/);
        });
    });
});
