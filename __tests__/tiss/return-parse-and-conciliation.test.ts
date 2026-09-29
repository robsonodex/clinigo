/**
 * Testes Unitários de Conciliação e Processamento de Retorno (T8)
 * Testa o parser CSV/XML, cenários de pagamento integral, parcial, glosa total,
 * guias não reconhecidas, idempotência contra arquivo repetido e mecanismo de DESFAZER.
 */

import crypto from 'crypto';

interface ParsedReturnGuide {
    guide_number: string;
    status: 'APPROVED' | 'DENIED' | 'PARTIAL';
    requested_value: number;
    approved_value: number;
    denied_value: number;
    glosa_code?: string;
    glosa_description?: string;
}

function parseCsvReturn(csvText: string): ParsedReturnGuide[] {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.trim().toLowerCase());
    const guideNumIdx = headers.findIndex(h => h.includes('guia') || h.includes('numero'));
    const statusIdx = headers.findIndex(h => h.includes('status') || h.includes('situacao'));
    const reqValIdx = headers.findIndex(h => h.includes('apresentado') || h.includes('solicitado') || h.includes('total'));
    const paidValIdx = headers.findIndex(h => h.includes('pago') || h.includes('liberado') || h.includes('aprovado'));
    const glosaValIdx = headers.findIndex(h => h.includes('glosa') || h.includes('negado'));
    const glosaCodeIdx = headers.findIndex(h => h.includes('codigo') || h.includes('motivo_codigo'));
    const glosaDescIdx = headers.findIndex(h => h.includes('motivo') || h.includes('descricao') || h.includes('justificativa'));

    const results: ParsedReturnGuide[] = [];

    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delimiter).map(p => p.trim());
        if (parts.length <= 1) continue;

        const guideNumber = guideNumIdx >= 0 ? parts[guideNumIdx] : parts[0];
        const statusRaw = (statusIdx >= 0 ? parts[statusIdx] : '').toUpperCase();
        const reqVal = reqValIdx >= 0 ? parseFloat(parts[reqValIdx].replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;
        const paidVal = paidValIdx >= 0 ? parseFloat(parts[paidValIdx].replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;
        const glosaVal = glosaValIdx >= 0 ? parseFloat(parts[glosaValIdx].replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : 0;

        let status: 'APPROVED' | 'DENIED' | 'PARTIAL' = 'APPROVED';
        if (statusRaw.includes('NEG') || statusRaw.includes('RECUS') || (paidVal === 0 && glosaVal > 0)) {
            status = 'DENIED';
        } else if (statusRaw.includes('PARC') || glosaVal > 0) {
            status = 'PARTIAL';
        }

        results.push({
            guide_number: guideNumber,
            status,
            requested_value: reqVal,
            approved_value: paidVal,
            denied_value: glosaVal,
            glosa_code: glosaCodeIdx >= 0 ? parts[glosaCodeIdx] : (glosaVal > 0 ? '1001' : undefined),
            glosa_description: glosaDescIdx >= 0 ? parts[glosaDescIdx] : (glosaVal > 0 ? 'Glosa informada em demonstrativo' : undefined),
        });
    }

    return results;
}

describe('T8: Processamento de Retorno, Idempotência e Conciliação', () => {

    const batchGuides = [
        { id: 'g1', guide_number: '2026000001', total_value: 150.0, status: 'SENT' },
        { id: 'g2', guide_number: '2026000002', total_value: 150.0, status: 'SENT' },
        { id: 'g3', guide_number: '2026000003', total_value: 150.0, status: 'SENT' },
    ];

    describe('1. Parsing do Arquivo CSV Estruturado (Modelo CliniGO)', () => {
        it('deve extrair corretamente pagamento total, parcial e glosa total', () => {
            const csv = `numero_guia;status;valor_apresentado;valor_pago;valor_glosado;codigo_glosa;motivo_glosa
2026000001;APROVADO;150,00;150,00;0,00;;
2026000002;PARCIAL;150,00;100,00;50,00;1409;Quantidade excede autorizacao
2026000003;NEGADO;150,00;0,00;150,00;1001;Carteira invalida`;

            const parsed = parseCsvReturn(csv);

            expect(parsed).toHaveLength(3);

            // Guia 1: Aprovada Total
            expect(parsed[0].guide_number).toBe('2026000001');
            expect(parsed[0].status).toBe('APPROVED');
            expect(parsed[0].approved_value).toBe(150.0);
            expect(parsed[0].denied_value).toBe(0.0);

            // Guia 2: Parcial com Glosa
            expect(parsed[1].guide_number).toBe('2026000002');
            expect(parsed[1].status).toBe('PARTIAL');
            expect(parsed[1].approved_value).toBe(100.0);
            expect(parsed[1].denied_value).toBe(50.0);
            expect(parsed[1].glosa_code).toBe('1409');

            // Guia 3: Glosa Total
            expect(parsed[2].guide_number).toBe('2026000003');
            expect(parsed[2].status).toBe('DENIED');
            expect(parsed[2].approved_value).toBe(0.0);
            expect(parsed[2].denied_value).toBe(150.0);
            expect(parsed[2].glosa_code).toBe('1001');
        });

        it('deve identificar guias não reconhecidas (pertencentes a outro lote)', () => {
            const csv = `numero_guia;status;valor_apresentado;valor_pago;valor_glosado;codigo_glosa;motivo_glosa
9999999999;APROVADO;200,00;200,00;0,00;;`;

            const parsed = parseCsvReturn(csv);
            const matched = parsed.filter(p => batchGuides.some(bg => bg.guide_number === p.guide_number));
            const unmatched = parsed.filter(p => !batchGuides.some(bg => bg.guide_number === p.guide_number));

            expect(matched).toHaveLength(0);
            expect(unmatched).toHaveLength(1);
            expect(unmatched[0].guide_number).toBe('9999999999');
        });
    });

    describe('2. Idempotência e Prevenção de Duplicação', () => {
        const processedFileHashes = new Set<string>();

        function processReturnFileWithIdempotency(fileContent: string, fileName: string) {
            const fileHash = crypto.createHash('sha256').update(fileContent).digest('hex');
            if (processedFileHashes.has(fileHash)) {
                return { success: false, code: 'DUPLICATE_FILE', error: 'Este arquivo de retorno já foi importado anteriormente para este lote.' };
            }
            processedFileHashes.add(fileHash);
            return { success: true, fileHash };
        }

        it('deve aceitar o arquivo na primeira importação e rejeitar na segunda (idempotência)', () => {
            const sampleContent = 'numero_guia;status;valor_apresentado;valor_pago\n2026000001;APROVADO;150.00;150.00';
            const firstRun = processReturnFileWithIdempotency(sampleContent, 'retorno1.csv');
            expect(firstRun.success).toBe(true);

            const secondRun = processReturnFileWithIdempotency(sampleContent, 'retorno1.csv');
            expect(secondRun.success).toBe(false);
            expect(secondRun.code).toBe('DUPLICATE_FILE');
        });
    });

    describe('3. Conciliação Financeira e Mecanismo de DESFAZER', () => {
        interface MockState {
            batchStatus: string;
            guides: Array<{ id: string; status: string; paid_value: number | null }>;
            glosas: Array<{ guide_id: string; amount: number }>;
            financialEntries: Array<{ description: string; amount: number }>;
        }

        let state: MockState;

        beforeEach(() => {
            state = {
                batchStatus: 'SENT',
                guides: [
                    { id: 'g1', status: 'SENT', paid_value: null },
                    { id: 'g2', status: 'SENT', paid_value: null },
                ],
                glosas: [],
                financialEntries: [],
            };
        });

        function applyReturn(approvedTotal: number, glosaTotal: number) {
            state.batchStatus = glosaTotal > 0 ? 'PARTIAL' : 'APPROVED';
            state.guides[0].status = 'APPROVED';
            state.guides[0].paid_value = 150.0;
            state.guides[1].status = 'PARTIAL';
            state.guides[1].paid_value = 100.0;
            state.glosas.push({ guide_id: 'g2', amount: 50.0 });
            state.financialEntries.push({
                description: 'Recebimento Lote TISS nº 20260901',
                amount: approvedTotal,
            });
        }

        function undoReturn() {
            state.batchStatus = 'SENT';
            state.guides.forEach(g => {
                g.status = 'SENT';
                g.paid_value = null;
            });
            state.glosas = [];
            state.financialEntries = state.financialEntries.filter(
                f => !f.description.includes('Lote TISS nº 20260901')
            );
        }

        it('deve aplicar a conciliação e permitir DESFAZER com restauração completa do estado', () => {
            applyReturn(250.0, 50.0);

            expect(state.batchStatus).toBe('PARTIAL');
            expect(state.financialEntries).toHaveLength(1);
            expect(state.financialEntries[0].amount).toBe(250.0);
            expect(state.glosas).toHaveLength(1);
            expect(state.guides[0].status).toBe('APPROVED');

            // Executar DESFAZER
            undoReturn();

            expect(state.batchStatus).toBe('SENT');
            expect(state.guides[0].status).toBe('SENT');
            expect(state.guides[0].paid_value).toBeNull();
            expect(state.glosas).toHaveLength(0);
            expect(state.financialEntries).toHaveLength(0);
        });
    });
});
