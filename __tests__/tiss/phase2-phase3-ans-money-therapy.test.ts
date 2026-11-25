/**
 * @jest-environment node
 *
 * CLINIGO — Suíte de Regressão Fases 2 e 3 (TISS / Glosas Padrão ANS para Terapias)
 * Valida:
 * 1. Aritmética em centavos inteiros (lib/tiss/money.ts — zero drift IEEE-754)
 * 2. Epílogo MD5 Oficial ANS em ISO-8859-1 (tiss-hash-calculator.ts)
 * 3. Geração XML Oficial ANS TISS 4.01/4.02 (tiss-xml-generator-v2.ts — zero tags inventadas)
 * 4. Motor Anti-Glosa TEA/Terapias + Caçador "Dinheiro na Mesa" (PRE-05) + Radar "Acato Sem Crédito" (KPI-06) + FIN-08
 * 5. Reconciliação de Glosas multi-código (QA-06) e separação Acato × Caixa (FIN-01)
 */

import crypto from 'crypto';
import iconv from 'iconv-lite';
import {
    allocateProportionalCents,
    fromCents,
    multiplyQtyUnitCents,
    subtractCurrency,
    sumCurrency,
    toCents,
} from '@/lib/tiss/money';
import {
    calculateOfficialAnsEpilogoMd5,
    extractAnsTissCanonicalText,
} from '@/lib/services/tiss/tiss-hash-calculator';
import { createTissGenerator } from '@/lib/services/tiss/tiss-xml-generator-v2';
import {
    auditTherapyGuidesForGlosa,
    computeAcceptedUnpaidRadar,
    computeGuideShieldScore,
    detectUnbilledCompletedSessions,
} from '@/lib/tiss/therapy-antiglosa-engine';
import {
    calculateGuideGlosaSummary,
    recalculateGuideFromItems,
} from '@/lib/services/tiss/glosa-reconciliation';

describe('Fase 2 & 3 — TISS/Glosas Padrão ANS para Clínicas de Terapias', () => {
    describe('1. Aritmética Financeira em Centavos Inteiros (FIN-06)', () => {
        it('elimina erro de ponto flutuante IEEE-754 em somas e subtrações', () => {
            expect(toCents(0.1) + toCents(0.2)).toBe(30);
            expect(sumCurrency([0.1, 0.2])).toBe(0.3);
            expect(subtractCurrency(19.99, 10.1)).toBe(9.89);
            expect(multiplyQtyUnitCents(3, 33.33)).toBe(9999);
            expect(fromCents(9999)).toBe(99.99);
        });

        it('distribui rateio proporcional pelo método de Hamilton sem perder 1 centavo', () => {
            const parts = allocateProportionalCents(100, [1, 1, 1]);
            expect(parts).toEqual([34, 33, 33]);
            expect(parts.reduce((a, b) => a + b, 0)).toBe(100);

            const weighted = allocateProportionalCents(1000, [120, 120, 120]);
            expect(weighted.reduce((a, b) => a + b, 0)).toBe(1000);
        });
    });

    describe('2. Epílogo MD5 Oficial ANS em ISO-8859-1 (TISS-04)', () => {
        it('extrai texto canônico ignorando tags XML, epílogo e assinatura digital e calcula MD5 em ISO-8859-1', () => {
            const xml = [
                '<?xml version="1.0" encoding="ISO-8859-1"?>',
                '<ans:mensagemTISS>',
                '  <ans:cabecalho><ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao></ans:cabecalho>',
                '  <ans:prestadorParaOperadora><ans:descricao>Sessão Fonoaudiologia Ação</ans:descricao></ans:prestadorParaOperadora>',
                '  <ans:epilogo><ans:hash>DEADBEEF</ans:hash></ans:epilogo>',
                '  <ds:Signature><ds:SignatureValue>IGNORED</ds:SignatureValue></ds:Signature>',
                '</ans:mensagemTISS>',
            ].join('\n');

            const canonical = extractAnsTissCanonicalText(xml);
            expect(canonical).toContain('ENVIO_LOTE_GUIAS');
            expect(canonical).toContain('Sessão Fonoaudiologia Ação');
            expect(canonical).not.toContain('DEADBEEF');
            expect(canonical).not.toContain('IGNORED');
            expect(canonical).not.toContain('<ans:');

            const expectedMd5Latin1 = crypto
                .createHash('md5')
                .update(iconv.encode(canonical, 'iso-8859-1'))
                .digest('hex');

            const utf8Md5 = crypto
                .createHash('md5')
                .update(Buffer.from(canonical, 'utf8'))
                .digest('hex');

            const calculated = calculateOfficialAnsEpilogoMd5(xml);
            expect(calculated).toBe(expectedMd5Latin1);
            expect(calculated).not.toBe(utf8Md5);
            expect(calculated).toMatch(/^[a-f0-9]{32}$/);
        });
    });

    describe('3. Gerador XML TISS ANS 4.01/4.02 Oficial (TISS-01 a TISS-07)', () => {
        it('gera XML ISO-8859-1 compatível com XSD ANS (SP/SADT, registroANS real, TUSS 8 dígitos, Epílogo MD5 e zero tags inventadas)', async () => {
            const gen = createTissGenerator('4.01.00');
            const provider = {
                cnesCode: '1234567',
                name: 'Clínica Terapias Exemplo',
                taxId: '12.345.678/0001-90',
                type: 'PJ' as const,
                operatorCode: '998877',
            };
            const xml = await gen.generateBatchXML({
                batchNumber: '20260401',
                insuranceAnsCode: '326305',
                insuranceName: 'Operadora Exemplo',
                provider,
                createdAt: new Date('2026-04-10T10:00:00Z'),
                guides: [
                    {
                        guideNumber: '2026000010',
                        type: 'SP/SADT',
                        issueDate: '2026-04-10',
                        beneficiary: {
                            cardNumber: '009988776655',
                            fullName: 'Paciente Fictício',
                        },
                        provider,
                        procedures: [
                            {
                                code: '50000470',
                                description: 'Sessão de Psicoterapia Individual',
                                quantity: 2,
                                unitValue: 145.5,
                                executionDate: '2026-04-10',
                                tableCode: '22',
                            },
                        ],
                        totalValue: 291.0,
                        authorizationCode: 'SENHA-7788',
                    },
                ],
            });

            expect(xml).toContain('<?xml version="1.0" encoding="ISO-8859-1"?>');
            expect(xml).toContain('<ans:registroANS>326305</ans:registroANS>');
            expect(xml).toContain('<ans:guiaSP-SADT>');
            expect(xml).toContain('<ans:codigoTabela>22</ans:codigoTabela>');
            expect(xml).toContain('<ans:codigoProcedimento>50000470</ans:codigoProcedimento>');
            expect(xml).toContain('<ans:senha>SENHA-7788</ans:senha>');
            expect(xml).toContain('<ans:valorTotalGeral>291.00</ans:valorTotalGeral>');

            // Nenhuma tag proprietária/inventada fora do XSD ANS
            expect(xml).not.toContain('iniciaisBeneficiario');
            expect(xml).not.toContain('consentimentoLGPD');
            expect(xml).not.toContain('versaoAplicativo');
            expect(xml).not.toContain('conformidadeLGPD');
            expect(xml).not.toContain('hashDocumento');

            // Epílogo MD5 válido e verificável contra o próprio XML gerado
            const hashMatch = xml.match(/<ans:epilogo>[\s\S]*?<ans:hash>([a-f0-9]{32})<\/ans:hash>[\s\S]*?<\/ans:epilogo>/i);
            expect(hashMatch).not.toBeNull();
            expect(hashMatch![1]).toBe(calculateOfficialAnsEpilogoMd5(xml));
        });
    });

    describe('4. Motor Anti-Glosa Terapias + Dinheiro na Mesa + Acato Sem Crédito', () => {
        it('detecta sessões concluídas não faturadas e classifica urgência pelo prazo ANS (PRE-05)', () => {
            const refNow = new Date('2026-05-01T12:00:00Z');
            const report = detectUnbilledCompletedSessions(
                [
                    {
                        id: 'appt-billed',
                        appointment_date: '2026-04-20',
                        patient_name: 'Já Faturado',
                        estimated_value: 180,
                        has_biometric_or_checkin: true,
                        has_signed_evolution: true,
                    },
                    {
                        id: 'appt-urgent',
                        appointment_date: '2026-03-08',
                        patient_name: 'Paciente Urgente',
                        health_insurance_name: 'Convênio A',
                        send_deadline_days: 60,
                        estimated_value: 160.5,
                        has_biometric_or_checkin: true,
                        has_signed_evolution: true,
                    },
                    {
                        id: 'appt-recent',
                        appointment_date: '2026-04-25',
                        patient_name: 'Paciente Recente',
                        health_insurance_name: 'Convênio B',
                        send_deadline_days: 60,
                        estimated_value: 140.25,
                        has_biometric_or_checkin: true,
                        has_signed_evolution: false,
                    },
                ],
                new Set(['appt-billed']),
                refNow
            );

            expect(report.total_count).toBe(2);
            expect(report.ready_to_bill_count).toBe(1);
            expect(report.expiring_soon_count).toBe(1);
            expect(report.total_estimated_value).toBe(300.75);
            expect(report.items[0].appointment_id).toBe('appt-urgent');
            expect(report.items[0].urgency).toBe('critical');
            expect(report.items[0].shield_ready).toBe(true);
            expect(report.items[1].shield_ready).toBe(false);
        });

        it('calcula Selo Guia Blindada em 3 camadas (Presença 35 + Evolução 40 + Admin 25)', () => {
            const blindada = computeGuideShieldScore({
                id: 'g1',
                has_biometric_or_checkin: true,
                has_signed_evolution: true,
                patient_card_number: '123456789',
                procedure_code: '50000470',
                total_value: 150,
            });
            expect(blindada.score).toBe(100);
            expect(blindada.level).toBe('blindada');

            const vulneravel = computeGuideShieldScore({
                id: 'g2',
                has_biometric_or_checkin: false,
                has_signed_evolution: false,
                patient_card_number: '123456789',
                procedure_code: '50000470',
                total_value: 150,
            });
            expect(vulneravel.score).toBe(25);
            expect(vulneravel.level).toBe('vulneravel');
        });

        it('detecta sobreposição de horário (ANS 1720), carteirinha vencida (1017), conselho inválido (1218) e subpagamento silencioso (FIN-08)', () => {
            const audit = auditTherapyGuidesForGlosa([
                {
                    id: 'g-ov-1',
                    guide_number: '1001',
                    patient_id: 'pat-1',
                    patient_name: 'Paciente Sobreposição',
                    doctor_id: 'doc-1',
                    doctor_council: 'INVALIDO',
                    execution_date: '2026-04-15',
                    execution_time: '14:00:00',
                    patient_card_validity: '2026-04-01',
                    total_value: 150,
                    status: 'VALIDATED',
                },
                {
                    id: 'g-ov-2',
                    guide_number: '1002',
                    patient_id: 'pat-1',
                    patient_name: 'Paciente Sobreposição',
                    doctor_id: 'doc-2',
                    execution_date: '2026-04-15',
                    execution_time: '14:00:00',
                    total_value: 150,
                    status: 'VALIDATED',
                },
                {
                    id: 'g-underpaid',
                    guide_number: '1003',
                    patient_id: 'pat-2',
                    patient_name: 'Paciente Subpago',
                    execution_date: '2026-04-16',
                    execution_time: '10:00:00',
                    total_value: 200,
                    contracted_value: 200,
                    paid_value: 165,
                    glosa_value: 0,
                    status: 'PAID',
                },
            ]);

            const codes = audit.findings.map((f) => f.code);
            expect(codes).toContain('1720');
            expect(codes).toContain('1017');
            expect(codes).toContain('1218');
            expect(codes).toContain('FIN_08');
            const underpay = audit.findings.find((f) => f.code === 'FIN_08');
            expect(underpay?.estimated_risk_value).toBe(35);
        });

        it('aponta recursos acatados sem depósito bancário e considera retenção na fonte no saldo (KPI-06)', () => {
            const refNow = new Date('2026-05-20T12:00:00Z');
            const radar = computeAcceptedUnpaidRadar(
                [
                    {
                        id: 'ap-overdue',
                        appeal_number: 'REC-01',
                        health_insurance_name: 'Operadora X',
                        accepted_value: 1000,
                        bank_received_value: 0,
                        tax_withheld_value: 0,
                        updated_at: '2026-04-01T12:00:00Z',
                        payment_post_appeal_days: 30,
                    },
                    {
                        id: 'ap-settled-with-tax',
                        appeal_number: 'REC-02',
                        health_insurance_name: 'Operadora Y',
                        accepted_value: 500,
                        bank_received_value: 475,
                        tax_withheld_value: 25,
                        updated_at: '2026-04-10T12:00:00Z',
                        payment_post_appeal_days: 30,
                    },
                ],
                refNow
            );

            expect(radar.items).toHaveLength(1);
            expect(radar.items[0].appeal_id).toBe('ap-overdue');
            expect(radar.items[0].is_overdue).toBe(true);
            expect(radar.overdue_count).toBe(1);
            expect(radar.total_pending_credit_value).toBe(1000);
        });
    });

    describe('5. Reconciliação de Glosas Multi-Código (QA-06) e Status SENT (FIN-01)', () => {
        it('limita glosa acumulada ao valor faturado do item quando múltiplos códigos ANS incidem (QA-06)', () => {
            const summary = calculateGuideGlosaSummary({
                guide: {
                    id: 'g-cap-1',
                    guide_number: '2026000999',
                    patient_name: 'Paciente Multi-Glosa',
                    total_value: 200,
                    glosa_value: 200,
                    paid_value: 0,
                },
                procedures: [
                    {
                        id: 'proc-1',
                        item_group: 'HONORARIOS',
                        total_value: 200,
                        status: 'ACTIVE',
                    },
                ],
                glosas: [
                    { procedure_id: 'proc-1', item_group: 'HONORARIOS', glosa_value: 150, status: 'OPEN', is_irrecoverable: false },
                    { procedure_id: 'proc-1', item_group: 'HONORARIOS', glosa_value: 100, status: 'OPEN', is_irrecoverable: false },
                ],
            });

            expect(summary.entered_glosa_total).toBe(200);
            expect(summary.approved_total).toBe(0);
            const honGroup = summary.by_group.find((g) => g.group === 'HONORARIOS');
            expect(honGroup?.glosa).toBe(200);
            expect(honGroup?.approved).toBe(0);
        });

        it('não fabrica status PAID ao estornar glosa de uma guia que estava apenas SENT (FIN-01)', async () => {
            let capturedGuideUpdate: any = null;
            const fakeSupabase = {
                from: (table: string) => {
                    if (table === 'tiss_guides') {
                        return {
                            select: () => ({
                                eq: () => ({
                                    eq: () => ({
                                        single: () =>
                                            Promise.resolve({
                                                data: {
                                                    id: 'g-sent-1',
                                                    status: 'SENT',
                                                    total_value: 200,
                                                    glosa_value: 0,
                                                    paid_value: 0,
                                                },
                                            }),
                                    }),
                                }),
                            }),
                            update: (payload: any) => {
                                capturedGuideUpdate = payload;
                                return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
                            },
                        };
                    }
                    if (table === 'tiss_guide_procedures') {
                        return {
                            select: () => ({
                                eq: () =>
                                    Promise.resolve({
                                        data: [{ id: 'p-1', total_value: 200, status: 'ACTIVE', glosa_value: 0 }],
                                    }),
                            }),
                            update: () => ({ eq: () => Promise.resolve({ error: null }) }),
                        };
                    }
                    if (table === 'tiss_glosas') {
                        return {
                            select: () => ({
                                eq: () => ({
                                    eq: () => ({
                                        is: () => ({
                                            neq: () => Promise.resolve({ data: [] }),
                                        }),
                                    }),
                                }),
                            }),
                        };
                    }
                    return {};
                },
            };

            const res = await recalculateGuideFromItems(fakeSupabase, 'cli-1', 'g-sent-1');
            expect(res.glosaValue).toBe(0);
            expect(res.paidValue).toBe(0);
            expect(res.status).toBe('SENT');
            expect(capturedGuideUpdate?.status).toBe('SENT');
            expect(capturedGuideUpdate?.paid_value).toBe(0);
        });
    });
});
