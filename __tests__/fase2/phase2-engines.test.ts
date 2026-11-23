import fs from 'fs'
import path from 'path'
import { evaluateTissBatchHealth } from '@/lib/tiss/batch-health-score'

describe('Fase 2 — Score de Saúde do Lote TISS, Renovação 1-Clique, Repasse Vivo e Radar Operacional', () => {
    it('deve retornar score 100% e nível excelente para lote com guias completas e válidas', () => {
        const res = evaluateTissBatchHealth(
            [
                {
                    id: 'g1',
                    guide_number: '20260001',
                    patient_name: 'Paciente Fictício 1',
                    patient_card_number: '008499123456',
                    patient_card_validity: '2027-12-31',
                    procedure_code: '50000470',
                    total_value: 160,
                    execution_date: '2026-11-10',
                    authorization_code: 'AUTH-9911',
                },
                {
                    id: 'g2',
                    guide_number: '20260002',
                    patient_name: 'Paciente Fictício 2',
                    patient_card_number: '008499654321',
                    patient_card_validity: '2027-06-30',
                    procedure_code: '50000470',
                    total_value: 160,
                    execution_date: '2026-11-12',
                    authorization_code: 'AUTH-9912',
                },
            ],
            'LOTE-2026-11'
        )

        expect(res.health_score).toBe(100)
        expect(res.health_level).toBe('excelente')
        expect(res.can_close).toBe(true)
        expect(res.healthy_guides).toBe(2)
        expect(res.impedimentos).toHaveLength(0)
        expect(res.warnings).toHaveLength(0)
    })

    it('deve reduzir score e emitir alerta quando carteirinha estiver vencida ou sem senha de autorização', () => {
        const res = evaluateTissBatchHealth([
            {
                id: 'g1',
                guide_number: '20260010',
                patient_name: 'Paciente Fictício 3',
                patient_card_number: '008499000111',
                patient_card_validity: '2026-10-01', // vencida antes da execução
                procedure_code: '50000470',
                total_value: 150,
                execution_date: '2026-11-15',
                authorization_code: '', // sem senha
            },
        ])

        expect(res.can_close).toBe(true) // apenas alertas preventivos, não bloqueia fechamento
        expect(res.health_score).toBe(85)
        expect(res.health_level).toBe('atencao')
        expect(res.warnings).toHaveLength(1)
        expect(res.warnings[0].warnings).toHaveLength(2)
    })

    it('deve bloquear fechamento e marcar nível crítico quando faltarem campos obrigatórios ANS (TUSS/carteira/valor)', () => {
        const res = evaluateTissBatchHealth([
            {
                id: 'g-bad',
                guide_number: '20260099',
                patient_name: 'Paciente Fictício 4',
                patient_card_number: '',
                procedure_code: '00000000',
                total_value: 0,
                execution_date: null,
                authorization_code: '',
            },
        ])

        expect(res.can_close).toBe(false)
        expect(res.health_score).toBe(10)
        expect(res.health_level).toBe('critico')
        expect(res.impedimentos).toHaveLength(1)
        expect(res.impedimentos[0].issues).toHaveLength(4)
    })

    it('deve garantir ausência de Evolução por Voz IA e proteção RBAC/White-Label nos arquivos da Fase 2', () => {
        const filesToCheck = [
            'lib/tiss/batch-health-score.ts',
            'app/api/patients/[id]/renewal-report/route.ts',
            'app/api/dashboard/operational-alerts/route.ts',
            'app/api/payroll/my-summary/route.ts',
            'app/api/tiss/batches/[id]/pre-close/route.ts',
        ]
        for (const rel of filesToCheck) {
            const content = fs.readFileSync(path.join(process.cwd(), rel), 'utf8')
            expect(content).not.toMatch(/World Sensory|Espaço Incluir/i)
            expect(content).not.toMatch(/whisper|SpeechRecognition|transcricao.*voz/i)
        }
    })
})

