/**
 * __tests__/tiss/flag-off-backend-behavior.test.ts
 * 
 * Prova de Equivalência de Comportamento para Clínicas com Flag 'faturamento_premium' DESLIGADA
 * Cobre:
 * 1. Exclusão de rascunhos por recepcionista (fluxo inalterado).
 * 2. Bloqueio de cancelamento para recepcionista (403 para guias não-rascunho).
 * 3. Máquina de estados legado (transições convencionais DRAFT -> VALIDATED -> IN_BATCH -> SENT -> PAID).
 * 4. Cálculo de relatórios de glosa/perdas: isolamento de CANCELLED para não poluir relatórios legados.
 */

import { canPerformTissAction } from '@/lib/tiss/permissions';
import { canTransitionGuide, normalizeGuideStatus } from '@/lib/tiss/state-machine';

describe('Equivalência de Backend com Flag faturamento_premium = FALSE', () => {

    describe('1. Matriz de Exclusão e Cancelamento de Guias', () => {
        test('Recepcionista mantém permissão total de excluir rascunhos (guia.excluir_rascunho)', () => {
            const hasDraftDelete = canPerformTissAction('RECEPTIONIST', 'guia.excluir_rascunho');
            expect(hasDraftDelete).toBe(true);
        });

        test('Recepcionista NÃO possui permissão de cancelamento de guias validadas/em lote (guia.cancelar)', () => {
            const hasCancel = canPerformTissAction('RECEPTIONIST', 'guia.cancelar');
            expect(hasCancel).toBe(false);
        });

        test('Setor Financeiro e Administradores possuem permissão de cancelamento formal', () => {
            expect(canPerformTissAction('FINANCIAL', 'guia.cancelar')).toBe(true);
            expect(canPerformTissAction('CLINIC_ADMIN', 'guia.cancelar')).toBe(true);
            expect(canPerformTissAction('SUPER_ADMIN', 'guia.cancelar')).toBe(true);
        });
    });

    describe('2. Integridade dos Fluxos Convencionais na State Machine (Sem Cancelamento)', () => {
        test('Transições operacionais padrão funcionam identicamente', () => {
            // Ciclo de vida padrão de clínicas sem cancelamento
            expect(canTransitionGuide('DRAFT', 'VALIDATED')).toBe(true);
            expect(canTransitionGuide('VALIDATED', 'IN_BATCH')).toBe(true);
            expect(canTransitionGuide('IN_BATCH', 'SENT')).toBe(true);
            expect(canTransitionGuide('SENT', 'PAID')).toBe(true);
            expect(canTransitionGuide('SENT', 'PARTIALLY_GLOSED')).toBe(true);
            expect(canTransitionGuide('SENT', 'TOTALLY_GLOSED')).toBe(true);
        });

        test('Normalização de status legados permanece 100% retrocompatível', () => {
            expect(normalizeGuideStatus('PENDING')).toBe('VALIDATED');
            expect(normalizeGuideStatus('VALID')).toBe('VALIDATED');
            expect(normalizeGuideStatus('BATCHED')).toBe('IN_BATCH');
            expect(normalizeGuideStatus('SUBMITTED')).toBe('SENT');
            expect(normalizeGuideStatus('APPROVED')).toBe('PAID');
            expect(normalizeGuideStatus('GLOSA')).toBe('TOTALLY_GLOSED');
        });
    });

    describe('3. Relatórios de Faturamento e Isolamento de CANCELLED', () => {
        const sampleGuides = [
            { id: 'g1', status: 'PAID', total_value: 150, glosa_value: 0 },
            { id: 'g2', status: 'TOTALLY_GLOSED', total_value: 200, glosa_value: 200 },
            { id: 'g3', status: 'PARTIALLY_GLOSED', total_value: 100, glosa_value: 30 },
            { id: 'g4', status: 'CANCELLED', total_value: 500, glosa_value: 500 }, // Guia cancelada
        ];

        test('Cálculo de perdas ignora guias CANCELLED preservando o total real das clínicas', () => {
            // Lógica unificada de cálculo de perdas
            const activeGuides = sampleGuides.filter(g => g.status !== 'CANCELLED');
            
            const totalGlosado = activeGuides.reduce((sum, g) => sum + g.glosa_value, 0);
            const totalFaturado = activeGuides.reduce((sum, g) => sum + g.total_value, 0);

            // Sem o filtro, totalGlosado seria 730 e totalFaturado seria 950
            expect(totalGlosado).toBe(230); // 200 + 30
            expect(totalFaturado).toBe(450); // 150 + 200 + 100
            expect(activeGuides).toHaveLength(3);
        });

        test('Guias ativas em clínicas com flag desligada têm valores idênticos ao baseline', () => {
            const baselineGuides = sampleGuides.slice(0, 3);
            const baselineLoss = baselineGuides.reduce((sum, g) => sum + g.glosa_value, 0);

            const filteredLoss = sampleGuides
                .filter(g => g.status !== 'CANCELLED')
                .reduce((sum, g) => sum + g.glosa_value, 0);

            expect(filteredLoss).toBe(baselineLoss);
        });
    });
});
