/**
 * @jest-environment node
 */
import fs from 'fs'
import path from 'path'
import { NextRequest } from 'next/server'

const mockGetUser = jest.fn()
const mockProfileSingle = jest.fn()
const mockAdminFrom = jest.fn()

jest.mock('next-axiom', () => ({
    withAxiomRouteHandler: (handler: any) => handler,
}))

jest.mock('@/lib/supabase/server', () => ({
    createClient: jest.fn(async () => ({
        auth: {
            getUser: mockGetUser,
        },
        from: jest.fn(() => ({
            select: jest.fn(() => ({
                eq: jest.fn(() => ({
                    single: mockProfileSingle,
                })),
            })),
        })),
    })),
    createServiceRoleClient: jest.fn(() => ({
        from: mockAdminFrom,
    })),
}))

import { GET } from '@/app/api/reports/evolution-compliance/route'

function buildEmptyAdminChain() {
    const chain: any = {
        select: jest.fn(() => chain),
        eq: jest.fn(() => chain),
        gte: jest.fn(() => chain),
        lte: jest.fn(() => chain),
        in: jest.fn(() => chain),
        order: jest.fn(() => chain),
        range: jest.fn(async () => ({ data: [], error: null })),
        then: (resolve: any) => resolve({ data: [], error: null }),
    }
    return chain
}

describe('RBAC — Indicadores de Evolução (/api/reports/evolution-compliance, middleware e sidebar)', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockAdminFrom.mockImplementation(() => buildEmptyAdminChain())
    })

    it('deve retornar 401 para requisição não autenticada', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } })
        const req = new NextRequest('https://clinigo.app/api/reports/evolution-compliance?start_date=2026-11-01&end_date=2026-11-19') as any
        req.log = { error: jest.fn() }

        const res = await GET(req)
        expect(res.status).toBe(401)
    })

    it('deve BLOQUEAR (403) terapeuta comum (DOCTOR com is_coordinator=false)', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'doc-comum-1' } } })
        mockProfileSingle.mockResolvedValue({
            data: { clinic_id: 'clinic-espaco-incluir', role: 'DOCTOR', is_coordinator: false },
        })

        const req = new NextRequest('https://clinigo.app/api/reports/evolution-compliance?start_date=2026-11-01&end_date=2026-11-19') as any
        req.log = { error: jest.fn() }

        const res = await GET(req)
        expect(res.status).toBe(403)
        expect(mockAdminFrom).not.toHaveBeenCalled()
    })

    it('deve BLOQUEAR (403) recepcionista (RECEPTIONIST)', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'recep-1' } } })
        mockProfileSingle.mockResolvedValue({
            data: { clinic_id: 'clinic-espaco-incluir', role: 'RECEPTIONIST', is_coordinator: false },
        })

        const req = new NextRequest('https://clinigo.app/api/reports/evolution-compliance?start_date=2026-11-01&end_date=2026-11-19') as any
        req.log = { error: jest.fn() }

        const res = await GET(req)
        expect(res.status).toBe(403)
        expect(mockAdminFrom).not.toHaveBeenCalled()
    })

    it('deve LIBERAR (200) Coordenadora Clínica (DOCTOR com is_coordinator=true, ex.: Nathalia)', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'nathalia-coord-1' } } })
        mockProfileSingle.mockResolvedValue({
            data: { clinic_id: 'clinic-espaco-incluir', role: 'DOCTOR', is_coordinator: true },
        })

        const req = new NextRequest('https://clinigo.app/api/reports/evolution-compliance?start_date=2026-11-01&end_date=2026-11-19') as any
        req.log = { error: jest.fn() }

        const res = await GET(req)
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(body.summary).toBeDefined()
        expect(Array.isArray(body.by_doctor)).toBe(true)
    })

    it('deve LIBERAR (200) Administrador da Clínica (CLINIC_ADMIN)', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-1' } } })
        mockProfileSingle.mockResolvedValue({
            data: { clinic_id: 'clinic-espaco-incluir', role: 'CLINIC_ADMIN', is_coordinator: false },
        })

        const req = new NextRequest('https://clinigo.app/api/reports/evolution-compliance?start_date=2026-11-01&end_date=2026-11-19') as any
        req.log = { error: jest.fn() }

        const res = await GET(req)
        expect(res.status).toBe(200)
    })

    it('middleware.ts deve fazer lookup de is_coordinator em /dashboard/terapia/conformidade-evolucao e sidebar/page devem manter governança e padrão editorial sem emojis', () => {
        const root = process.cwd()
        const middleware = fs.readFileSync(path.join(root, 'middleware.ts'), 'utf8')
        const sidebar = fs.readFileSync(path.join(root, 'components/layout/sidebar.tsx'), 'utf8')
        const page = fs.readFileSync(path.join(root, 'app/dashboard/(clinic)/terapia/conformidade-evolucao/page.tsx'), 'utf8')

        expect(middleware).toContain("pathname === '/dashboard/terapia/conformidade-evolucao'")
        expect(sidebar).toContain("title: 'Indicadores de Evolução'")
        expect(sidebar).toContain("href: '/dashboard/terapia/conformidade-evolucao'")
        expect(sidebar).toContain("item.href === '/dashboard/terapia/conformidade-evolucao'")
        expect(sidebar).not.toContain("title: 'BI e Indicadores'")

        // Tela restrita: botão de limpeza apenas para ADM e zero emojis
        expect(page).toContain('const canCleanDuplicates = isClinicAdmin || isSuperAdmin')
        expect(page).toContain('if (accessDenied)')
        const emojiRegex = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u
        expect(emojiRegex.test(page)).toBe(false)
    })
})
