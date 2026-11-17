/**
 * @jest-environment node
 */

/**
 * Testes unitários da exportação e filtragem por período de evoluções clínicas
 * - GET /api/medical-records/export (ExcelJS .xlsx + parser WorldSensory + controle CLINIC_ADMIN + isolamento clinic_id)
 * - GET /api/medical-records?start_date=&end_date=
 */

import ExcelJS from 'exceljs'

jest.mock('next-axiom', () => ({
    withAxiomRouteHandler: (handler: any) => handler,
}))

jest.mock('next/server', () => ({
    NextRequest: class {},
    NextResponse: {
        json: jest.fn().mockImplementation((body, init) => ({
            status: init?.status || 200,
            json: async () => body,
        })),
    },
}))

const mockSupabase = {
    auth: {
        getUser: jest.fn(),
    },
    from: jest.fn(),
}

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(() => Promise.resolve(mockSupabase)),
}))

import { GET as exportGET } from '@/app/api/medical-records/export/route'
import { GET as listGET } from '@/app/api/medical-records/route'

function createBuilder(result: { data: any; error: any }, spies?: { eqSpy?: jest.Mock; insertSpy?: jest.Mock }) {
    const builder: any = {
        select: jest.fn(() => builder),
        eq: jest.fn((col: string, val: unknown) => {
            if (spies?.eqSpy) spies.eqSpy(col, val)
            return builder
        }),
        ilike: jest.fn(() => builder),
        in: jest.fn(() => builder),
        order: jest.fn(() => builder),
        range: jest.fn(() => builder),
        limit: jest.fn(() => builder),
        insert: jest.fn((payload: unknown) => {
            if (spies?.insertSpy) spies.insertSpy(payload)
            return Promise.resolve({ data: null, error: null })
        }),
        maybeSingle: jest.fn(() => Promise.resolve(result)),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
    }
    return builder
}

function makeRequest(url: string, headersMap: Record<string, string | null> = {}) {
    return {
        url,
        headers: {
            get: (name: string) => headersMap[name.toLowerCase()] ?? null,
        },
        log: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
    } as any
}

describe('GET /api/medical-records/export', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('retorna 401 quando não há sessão autenticada', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

        const res = await exportGET(makeRequest('http://localhost:3000/api/medical-records/export'))
        expect(res.status).toBe(401)
    })

    it.each(['DOCTOR', 'RECEPTIONIST', 'FINANCIAL', 'PATIENT'])(
        'bloqueia perfil %s com status 403 (apenas CLINIC_ADMIN pode exportar)',
        async (role) => {
            mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-1' } } })
            mockSupabase.from.mockImplementation((table: string) => {
                if (table === 'users') {
                    return createBuilder({ data: { clinic_id: 'cli-1', role }, error: null })
                }
                return createBuilder({ data: [], error: null })
            })

            const res = await exportGET(makeRequest('http://localhost:3000/api/medical-records/export'))
            expect(res.status).toBe(403)
        }
    )

    it('retorna 400 para intervalo de datas inválido', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-admin' } } })
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return createBuilder({ data: { clinic_id: 'cli-1', role: 'CLINIC_ADMIN' }, error: null })
            }
            return createBuilder({ data: [], error: null })
        })

        const res = await exportGET(
            makeRequest('http://localhost:3000/api/medical-records/export?start_date=2026-10-31&end_date=2026-10-01')
        )
        expect(res.status).toBe(400)
    })

    it('filtra estritamente por clinic_id do usuário, faz parse do JSON WorldSensory e gera planilha Excel válida', async () => {
        const eqSpy = jest.fn()
        const insertSpy = jest.fn()

        const recordsMock = [
            {
                id: 'mr-oct',
                clinic_id: 'cli-1',
                patient_id: 'pat-1',
                doctor_id: 'doc-1',
                appointment_id: 'apt-oct',
                chief_complaint: 'Objetivo fallback',
                history_present_illness: 'Procedimento fallback',
                treatment_plan: 'Conduta fallback',
                follow_up_instructions: JSON.stringify({
                    hasWorldSensoryEvolution: true,
                    worldSensoryData: {
                        objetivo_sessao: 'Trabalhar coordenação motora fina',
                        procedimentos_realizados: 'Circuito proprioceptivo e pinça',
                        resposta_paciente_geral: 'Boa aceitação durante os estímulos',
                        desempenho_observado: 'Completou 4 etapas com apoio mínimo',
                        nivel_ajuda_necessario: 'Dica verbal leve',
                        interpretacao_dados_indicam: 'Melhora progressiva na preensão',
                        interpretacao_comparacao_anteriores: 'Evolução positiva frente ao mês anterior',
                        conduta: 'Manter frequência semanal',
                        intercorrencias: 'Nenhuma',
                        orientacoes_contato_familia: 'Estimular encaixes em casa',
                    },
                }),
                signed_at: null,
                signed_by_patient: false,
                created_at: '2026-11-02T14:00:00Z', // evoluído em novembro referente à sessão de outubro
                patient: { id: 'pat-1', full_name: 'Paciente Exemplo A', cpf: '000.000.000-00' },
                doctor: { id: 'doc-1', specialty: 'Terapia Ocupacional', user: { full_name: 'Terapeuta Modelo' } },
                appointment: {
                    id: 'apt-oct',
                    appointment_date: '2026-10-29',
                    appointment_time: '14:30:00',
                    status: 'COMPLETED',
                    session_status: 'Presente',
                    digital_signature_at: '2026-11-02T14:05:00Z',
                    digital_signature_signer: 'Terapeuta Modelo',
                },
            },
            {
                id: 'mr-sep',
                clinic_id: 'cli-1',
                patient_id: 'pat-2',
                doctor_id: 'doc-1',
                appointment_id: 'apt-sep',
                chief_complaint: 'Fora do filtro de outubro',
                follow_up_instructions: null,
                created_at: '2026-09-15T12:00:00Z',
                patient: { id: 'pat-2', full_name: 'Paciente Exemplo B', cpf: '111.111.111-11' },
                doctor: { id: 'doc-1', specialty: 'Psicologia', user: { full_name: 'Terapeuta Modelo' } },
                appointment: {
                    id: 'apt-sep',
                    appointment_date: '2026-09-15',
                    appointment_time: '09:00:00',
                    status: 'COMPLETED',
                    session_status: 'Presente',
                },
            },
        ]

        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-admin' } } })
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return createBuilder({ data: { clinic_id: 'cli-1', role: 'CLINIC_ADMIN' }, error: null })
            }
            if (table === 'medical_records') {
                return createBuilder({ data: recordsMock, error: null }, { eqSpy })
            }
            if (table === 'clinics') {
                return createBuilder({ data: { name: 'Clínica Exemplo' }, error: null })
            }
            if (table === 'audit_logs') {
                return createBuilder({ data: null, error: null }, { insertSpy })
            }
            return createBuilder({ data: [], error: null })
        })

        // Mesmo tentando passar ?clinic_id=outra-clinica, deve usar cli-1 da sessão
        const res = await exportGET(
            makeRequest(
                'http://localhost:3000/api/medical-records/export?start_date=2026-10-01&end_date=2026-10-31&clinic_id=outra-clinica'
            )
        )

        expect(res.status).toBe(200)
        expect(eqSpy).toHaveBeenCalledWith('clinic_id', 'cli-1')
        expect(eqSpy).not.toHaveBeenCalledWith('clinic_id', 'outra-clinica')
        expect(res.headers.get('Content-Type')).toBe(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )
        expect(res.headers.get('X-Total-Exported')).toBe('1')
        expect(insertSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                clinic_id: 'cli-1',
                user_id: 'u-admin',
                action: 'EXPORT_MEDICAL_RECORDS_EXCEL',
                severity: 'info',
            })
        )

        const arrayBuf = await res.arrayBuffer()
        const wb = new ExcelJS.Workbook()
        await wb.xlsx.load(Buffer.from(arrayBuf))

        const ws = wb.getWorksheet('Evoluções')
        const summaryWs = wb.getWorksheet('Resumo')
        expect(ws).toBeDefined()
        expect(summaryWs).toBeDefined()
        expect(ws?.rowCount).toBe(2) // header + 1 registro de outubro (setembro foi filtrado fora)

        const dataRow = ws!.getRow(2)
        const valuesText = JSON.stringify(dataRow.values)
        expect(valuesText).toContain('29/10/2026')
        expect(valuesText).toContain('Paciente Exemplo A')
        expect(valuesText).toContain('Trabalhar coordenação motora fina')
        expect(valuesText).toContain('Circuito proprioceptivo e pinça')
        expect(valuesText).toContain('Assinado Digitalmente')
        expect(valuesText).not.toContain('worldSensoryData')
    })

    it('retorna 404 quando nenhuma evolução corresponde ao período filtrado', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-admin' } } })
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return createBuilder({ data: { clinic_id: 'cli-1', role: 'CLINIC_ADMIN' }, error: null })
            }
            if (table === 'medical_records') {
                return createBuilder({ data: [], error: null })
            }
            return createBuilder({ data: [], error: null })
        })

        const res = await exportGET(
            makeRequest('http://localhost:3000/api/medical-records/export?start_date=2026-08-01&end_date=2026-08-31')
        )
        expect(res.status).toBe(404)
    })
})

describe('GET /api/medical-records com filtro de período', () => {
    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('filtra listagem por start_date e end_date usando appointment_date', async () => {
        mockSupabase.auth.getUser.mockResolvedValue({ data: { user: { id: 'u-admin' } } })
        mockSupabase.from.mockImplementation((table: string) => {
            if (table === 'users') {
                return createBuilder({ data: { clinic_id: 'cli-1', role: 'CLINIC_ADMIN' }, error: null })
            }
            if (table === 'medical_records') {
                return createBuilder({
                    data: [
                        {
                            id: 'mr-10',
                            patient_id: 'pat-1',
                            doctor_id: 'doc-1',
                            created_at: '2026-11-01T10:00:00Z',
                            chief_complaint: 'Sessão de outubro',
                            signed_by_patient: false,
                            patient: { id: 'pat-1', full_name: 'Paciente Teste' },
                            doctor: { id: 'doc-1', specialty: 'Fono', user: { full_name: 'Dra. A' } },
                            appointment: { id: 'apt-10', appointment_date: '2026-10-15', appointment_time: '10:00' },
                        },
                        {
                            id: 'mr-11',
                            patient_id: 'pat-2',
                            doctor_id: 'doc-1',
                            created_at: '2026-11-05T10:00:00Z',
                            chief_complaint: 'Sessão de novembro',
                            signed_by_patient: false,
                            patient: { id: 'pat-2', full_name: 'Paciente Teste 2' },
                            doctor: { id: 'doc-1', specialty: 'Fono', user: { full_name: 'Dra. A' } },
                            appointment: { id: 'apt-11', appointment_date: '2026-11-05', appointment_time: '11:00' },
                        },
                    ],
                    error: null,
                })
            }
            return createBuilder({ data: [], error: null })
        })

        const res = await listGET(
            makeRequest('http://localhost:3000/api/medical-records?start_date=2026-10-01&end_date=2026-10-31')
        )
        const body = await res.json()

        expect(res.status).toBe(200)
        expect(body.success).toBe(true)
        expect(body.data.records).toHaveLength(1)
        expect(body.data.records[0].id).toBe('mr-10')
        expect(body.data.total).toBe(1)
    })
})
