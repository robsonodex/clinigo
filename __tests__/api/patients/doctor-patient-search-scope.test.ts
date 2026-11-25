import fs from 'fs'
import path from 'path'
import {
    getDoctorLinkedPatientIds,
    matchesPatientSearch,
    normalizeSearchText,
} from '@/lib/patients/doctor-patient-scope'

const ROOT = process.cwd()

describe('Busca de Pacientes sem Truncamento de 1.000 Agendamentos e Insensível a Acentos', () => {
    describe('normalizeSearchText e matchesPatientSearch', () => {
        const heloisa = {
            full_name: 'Heloísa  Vasco  Remédio ',
            cpf: '12345678901',
            phone: '11999998888',
            email: null,
        }

        const muriloCorrompido = {
            full_name: 'Murilo Louren\uFFFDo Costa Bochetti',
            cpf: '99988877766',
            phone: '11974546607',
            email: null,
        }

        it('encontra paciente com acento agudo e espaços duplos mesmo digitando sem acento', () => {
            expect(normalizeSearchText(heloisa.full_name)).toBe('heloisa vasco remedio')
            expect(matchesPatientSearch(heloisa, 'heloisa')).toBe(true)
            expect(matchesPatientSearch(heloisa, 'Heloísa')).toBe(true)
            expect(matchesPatientSearch(heloisa, 'heloisa vasco')).toBe(true)
            expect(matchesPatientSearch(heloisa, 'heloisa remedio')).toBe(true)
            expect(matchesPatientSearch(heloisa, 'REMEDIO')).toBe(true)
            expect(matchesPatientSearch(heloisa, '123.456.789-01')).toBe(true)
            expect(matchesPatientSearch(heloisa, 'outro nome')).toBe(false)
        })

        it('lida com nomes contendo caractere de substituição Unicode sem quebrar busca', () => {
            expect(matchesPatientSearch(muriloCorrompido, 'murilo')).toBe(true)
            expect(matchesPatientSearch(muriloCorrompido, 'murilo bochetti')).toBe(true)
        })
    })

    describe('getDoctorLinkedPatientIds (RPC + fallback paginado > 1.000 linhas)', () => {
        it('retorna todos os IDs distintos direto da RPC SQL sem truncamento', async () => {
            const mockSupabase = {
                rpc: jest.fn().mockResolvedValue({
                    data: [
                        { patient_id: 'pat-1' },
                        { patient_id: 'pat-heloisa' },
                        { patient_id: 'pat-1' },
                    ],
                    error: null,
                }),
            }

            const ids = await getDoctorLinkedPatientIds(mockSupabase, 'doc-denise', 'clinic-espaco')
            expect(ids).toEqual(['pat-1', 'pat-heloisa'])
            expect(mockSupabase.rpc).toHaveBeenCalledWith('get_doctor_linked_patient_ids', {
                p_doctor_id: 'doc-denise',
                p_clinic_id: 'clinic-espaco',
            })
        })

        it('no fallback paginado percorre além da linha 1.000 (ex.: 1.196 agendamentos) sem perder pacientes', async () => {
            const page0 = Array.from({ length: 1000 }, (_, i) => ({ patient_id: `pat-${i % 20}` }))
            const page1 = Array.from({ length: 196 }, () => ({ patient_id: 'pat-heloisa-1196' }))

            const mockSupabase = {
                rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'rpc missing' } }),
                from: jest.fn((table: string) => ({
                    select: () => ({
                        or: () => ({
                            not: () => ({
                                order: () => ({
                                    range: (from: number) => ({
                                        eq: () => Promise.resolve({ data: from === 0 ? page0 : from === 1000 ? page1 : [], error: null }),
                                    }),
                                }),
                            }),
                        }),
                        eq: () => ({
                            order: () => ({
                                range: () => {
                                    const res = Promise.resolve({ data: [], error: null }) as any
                                    res.eq = () => Promise.resolve({ data: [], error: null })
                                    return res
                                },
                            }),
                        }),
                    }),
                })),
            }

            const ids = await getDoctorLinkedPatientIds(mockSupabase, 'doc-denise', 'clinic-espaco')
            expect(ids).toContain('pat-heloisa-1196')
            expect(ids.length).toBe(21)
        })
    })

    describe('Integração nos endpoints de busca e listagem de pacientes', () => {
        const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

        it('app/api/patients/search/route.ts usa getDoctorLinkedPatientIds e matchesPatientSearch sem truncar em 20', () => {
            const src = read('app/api/patients/search/route.ts')
            expect(src).toContain('getDoctorLinkedPatientIds')
            expect(src).toContain('matchesPatientSearch')
            expect(src).not.toContain('.limit(20)')
        })

        it('app/api/patients/route.ts e app/api/documents/route.ts usam getDoctorLinkedPatientIds', () => {
            expect(read('app/api/patients/route.ts')).toContain('getDoctorLinkedPatientIds')
            expect(read('app/api/documents/route.ts')).toContain('getDoctorLinkedPatientIds')
        })
    })
})

