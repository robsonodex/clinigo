import fs from 'fs'
import path from 'path'
import { computeOperatorIntelligence } from '@/lib/tiss/operator-intelligence'
import { computeSupervisionRadar } from '@/lib/session-plans/supervision-radar'
import {
    decodeFamilyFeedback,
    encodeFamilyFeedbackV2,
} from '@/lib/family-portal/feedback-codec'

describe('Pacote Estratégico Completo — 4 Pilares CliniGo 2.0', () => {
    describe('Pilar 2 — Inteligência de Operadoras & Memória Anti-Glosa (TISS 2.0)', () => {
        it('deve calcular taxa de glosa, prazo de retorno (DSO), top motivos ANS e gerar regras aprendidas', () => {
            const report = computeOperatorIntelligence(
                [
                    {
                        id: 'b1',
                        insurance_company_id: 'op1',
                        insurance_company_name: 'Operadora Exemplo A',
                        total_value: 10000,
                        approved_value: 8500,
                        glosa_value: 1500,
                        submitted_at: '2026-10-01T10:00:00Z',
                        return_processed_at: '2026-10-31T10:00:00Z',
                    },
                    {
                        id: 'b2',
                        insurance_company_id: 'op2',
                        insurance_company_name: 'Operadora Exemplo B',
                        total_value: 5000,
                        approved_value: 4900,
                        glosa_value: 100,
                        submitted_at: '2026-10-01T10:00:00Z',
                        return_processed_at: '2026-10-16T10:00:00Z',
                    },
                ],
                [
                    {
                        id: 'g1',
                        batch_id: 'b1',
                        glosa_code: '1001',
                        glosa_description: 'Número da carteirinha inválido',
                        glosa_value: 900,
                        is_irrecoverable: false,
                    },
                    {
                        id: 'g2',
                        batch_id: 'b1',
                        glosa_code: '1001',
                        glosa_description: 'Número da carteirinha inválido',
                        glosa_value: 600,
                        is_irrecoverable: true,
                        irrecoverable_value: 600,
                    },
                ]
            )

            expect(report.totalOperators).toBe(2)
            expect(report.totalBilled).toBe(15000)
            expect(report.totalGlosa).toBe(1600)

            const opA = report.operators.find((o) => o.operatorId === 'op1')!
            expect(opA.glosaRatePct).toBe(15)
            expect(opA.avgReturnDays).toBe(30)
            expect(opA.riskLevel).toBe('alto')
            expect(opA.irrecoverableValue).toBe(600)
            expect(opA.appealableValue).toBe(900)
            expect(opA.topReasons[0].code).toBe('1001')
            expect(opA.topReasons[0].count).toBe(2)

            expect(report.antiGlosaMemory).toHaveLength(1)
            expect(report.antiGlosaMemory[0].glosaCode).toBe('1001')
            expect(report.antiGlosaMemory[0].recommendation).toContain('carteirinha')
        })
    })

    describe('Pilar 3 — Mesa de Supervisão Clínica ABA/PEI (Semáforo, Promoção e Calibração)', () => {
        it('deve detectar metas prontas para promoção, regressão e divergência >=25 p.p. entre aplicadores', () => {
            const nowMs = new Date('2026-11-23T12:00:00Z').getTime()
            const report = computeSupervisionRadar(
                [
                    // Paciente 1 — Meta ABA01 atingindo domínio >=80% em 3 sessões consecutivas
                    {
                        id: 's1',
                        paciente_id: 'p1',
                        patient_name: 'Paciente Exemplo 1',
                        profissional_id: 'u1',
                        professional_name: 'Terapeuta A',
                        especialidade: 'intervencao_precoce_aba',
                        data_sessao: '2026-11-01',
                        registro_desempenho: [
                            { code: 'ABA01', title: 'Contato visual funcional', dtt: { independent: 8, prompted: 2, error: 0, promptLevel: 'verbal' } },
                            { code: 'ABA02', title: 'Imitação motora', dtt: { independent: 9, prompted: 1, error: 0, promptLevel: 'independente' } },
                        ],
                    },
                    {
                        id: 's2',
                        paciente_id: 'p1',
                        patient_name: 'Paciente Exemplo 1',
                        profissional_id: 'u1',
                        professional_name: 'Terapeuta A',
                        especialidade: 'intervencao_precoce_aba',
                        data_sessao: '2026-11-08',
                        registro_desempenho: [
                            { code: 'ABA01', title: 'Contato visual funcional', dtt: { independent: 9, prompted: 1, error: 0, promptLevel: 'gestual' } },
                            { code: 'ABA02', title: 'Imitação motora', dtt: { independent: 7, prompted: 2, error: 1, promptLevel: 'verbal' } },
                        ],
                    },
                    {
                        id: 's3',
                        paciente_id: 'p1',
                        patient_name: 'Paciente Exemplo 1',
                        profissional_id: 'u2',
                        professional_name: 'Terapeuta B',
                        especialidade: 'intervencao_precoce_aba',
                        data_sessao: '2026-11-15',
                        registro_desempenho: [
                            { code: 'ABA01', title: 'Contato visual funcional', dtt: { independent: 9, prompted: 1, error: 0, promptLevel: 'independente' } },
                            // Aplicador B com 40% vs Aplicador A média 80% -> divergência 40 p.p. + regressão!
                            { code: 'ABA02', title: 'Imitação motora', dtt: { independent: 4, prompted: 3, error: 3, promptLevel: 'fisica_parcial' } },
                        ],
                    },
                ],
                60,
                nowMs
            )

            expect(report.totalSessionsAnalyzed).toBe(3)
            expect(report.promotionsReady.some((p) => p.code === 'ABA01')).toBe(true)
            expect(report.stagnationAlerts.some((a) => a.code === 'ABA02' && a.reason === 'regression')).toBe(true)
            expect(report.calibrationGaps.some((g) => g.code === 'ABA02' && g.gapPct >= 25)).toBe(true)
            expect(report.clinicalDraftSummary).toContain('decisão exclusiva do profissional supervisor')
        })
    })

    describe('Pilar 4 — Codec Retrocompatível do CliniGo Família 2.0', () => {
        it('deve codificar e decodificar contexto semanal, termômetro (1-5) e retorno da escola preservando textos legados', () => {
            const legacy = decodeFamilyFeedback('Fez super bem após o lanche')
            expect(legacy.note).toBe('Fez super bem após o lanche')
            expect(legacy.confidenceScore).toBeNull()
            expect(legacy.weeklyContextTags).toEqual([])
            expect(legacy.schoolReturn).toBeNull()

            const encoded = encodeFamilyFeedbackV2({
                note: 'Ótima semana em casa',
                confidenceScore: 2,
                weeklyContextTags: ['Sono agitado / cansaço', 'Mudança de rotina'],
                schoolReturn: {
                    participation: 'alta',
                    regulation: 'oscilante',
                    observation: 'Participou bem da roda de leitura.',
                    respondentName: 'Prof. Carla',
                    submittedAt: '2026-11-23T12:00:00Z',
                },
            })

            const decoded = decodeFamilyFeedback(encoded)
            expect(decoded.note).toBe('Ótima semana em casa')
            expect(decoded.confidenceScore).toBe(2)
            expect(decoded.weeklyContextTags).toEqual(['Sono agitado / cansaço', 'Mudança de rotina'])
            expect(decoded.schoolReturn?.participation).toBe('alta')
            expect(decoded.schoolReturn?.regulation).toBe('oscilante')
            expect(decoded.schoolReturn?.respondentName).toBe('Prof. Carla')
        })
    })

    describe('Pilar 1 & Integrações — Verificação Estrutural de Arquivos', () => {
        it('deve confirmar integração de Clonar Sessão, Meu Dia Clínico, Dossiê PDF e Anti-Churn', () => {
            const formSrc = fs.readFileSync(
                path.join(process.cwd(), 'components/session-plans/SessionPlanFormClient.tsx'),
                'utf8'
            )
            expect(formSrc).toContain('handleCloneLastSession')
            expect(formSrc).toContain('CrossSpecialtyContextCard')

            const radarApi = fs.readFileSync(
                path.join(process.cwd(), 'app/api/dashboard/operational-alerts/route.ts'),
                'utf8'
            )
            expect(radarApi).toContain('family_churn_alerts')

            const glosaLevel2 = fs.readFileSync(
                path.join(process.cwd(), 'components/tiss/glosa-level2-accounts.tsx'),
                'utf8'
            )
            expect(glosaLevel2).toContain('GlosaEvidenceDossierButton')

            const supervisaoPage = fs.readFileSync(
                path.join(process.cwd(), 'app/dashboard/(clinic)/terapia/supervisao/page.tsx'),
                'utf8'
            )
            expect(supervisaoPage).toContain('SupervisionRadarPanel')
        })
    })
})

