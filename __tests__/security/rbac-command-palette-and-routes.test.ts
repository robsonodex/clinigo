import fs from 'fs'
import path from 'path'
import {
    ESPACO_INCLUIR_CLINIC_ID,
    JESSICA_WORLD_SENSORY_USER_ID,
    WORLD_SENSORY_CLINIC_ID,
    evaluateDashboardPageAccess,
    type DashboardRole,
} from '@/lib/constants/dashboard-rbac'

const GENERIC_CLINIC_ID = '99999999-9999-4999-8999-999999999999'
const GENERIC_USER_ID = '11111111-1111-4111-8111-111111111111'

function checkAccess(
    pathname: string,
    role: DashboardRole | null,
    opts?: {
        isCoordinator?: boolean
        clinicId?: string
        userId?: string
        userEmail?: string
    }
): boolean {
    return evaluateDashboardPageAccess({
        pathname,
        role,
        isCoordinator: opts?.isCoordinator ?? false,
        clinicId: opts?.clinicId ?? GENERIC_CLINIC_ID,
        userId: opts?.userId ?? GENERIC_USER_ID,
        userEmail: opts?.userEmail ?? 'usuario@clinica-exemplo.com',
    }).allowed
}

describe('Blindagem Global de RBAC — Matriz por Perfil, Isolamento de Exceções Pontuais e Regressão Supervisão', () => {
    it('deve operar fail-closed quando não há perfil autenticado', () => {
        expect(checkAccess('/dashboard/meu-dia', null)).toBe(false)
        expect(checkAccess('/dashboard/prontuarios', null)).toBe(false)
        expect(checkAccess('/dashboard/tiss', null)).toBe(false)
        expect(checkAccess('/dashboard/contratos', null)).toBe(false)
    })

    it('deve restringir /dashboard/meu-dia exclusivamente a DOCTOR, CLINIC_ADMIN e SUPER_ADMIN', () => {
        expect(checkAccess('/dashboard/meu-dia', 'DOCTOR')).toBe(true)
        expect(checkAccess('/dashboard/meu-dia', 'CLINIC_ADMIN')).toBe(true)
        expect(checkAccess('/dashboard/meu-dia', 'SUPER_ADMIN')).toBe(true)

        expect(checkAccess('/dashboard/meu-dia', 'RECEPTIONIST')).toBe(false)
        expect(checkAccess('/dashboard/meu-dia', 'FINANCIAL')).toBe(false)
        expect(checkAccess('/dashboard/meu-dia', 'NURSE')).toBe(false)
        expect(checkAccess('/dashboard/meu-dia', 'STAFF')).toBe(false)
        expect(checkAccess('/dashboard/meu-dia', 'READONLY')).toBe(false)
    })

    it('deve garantir que DOCTOR comum acesse apenas módulos clínicos e pessoais, nunca Contratos, Agenda Geral, TISS ou Financeiro Geral', () => {
        // Permitidos para DOCTOR
        expect(checkAccess('/dashboard/meu-dia', 'DOCTOR')).toBe(true)
        expect(checkAccess('/dashboard/minha-agenda', 'DOCTOR')).toBe(true)
        expect(checkAccess('/dashboard/prontuarios', 'DOCTOR')).toBe(true)
        expect(checkAccess('/dashboard/pacientes', 'DOCTOR')).toBe(true)
        expect(checkAccess('/dashboard/pacientes/abc/psicomotricidade', 'DOCTOR')).toBe(true)
        expect(checkAccess('/dashboard/pacientes/abc/planos-sessao/intervencao-precoce-aba', 'DOCTOR')).toBe(true)
        expect(checkAccess('/dashboard/meu-financeiro', 'DOCTOR')).toBe(true)
        expect(checkAccess('/dashboard/terapia/supervisao', 'DOCTOR')).toBe(true)

        // Bloqueados para DOCTOR comum
        expect(checkAccess('/dashboard/agenda', 'DOCTOR')).toBe(false)
        expect(checkAccess('/dashboard/contratos', 'DOCTOR')).toBe(false)
        expect(checkAccess('/dashboard/recepcao', 'DOCTOR')).toBe(false)
        expect(checkAccess('/dashboard/tiss', 'DOCTOR')).toBe(false)
        expect(checkAccess('/dashboard/tiss/reports/loss-analysis', 'DOCTOR')).toBe(false)
        expect(checkAccess('/dashboard/financeiro', 'DOCTOR')).toBe(false)
        expect(checkAccess('/dashboard/configuracoes', 'DOCTOR')).toBe(false)
        expect(checkAccess('/dashboard/medicos', 'DOCTOR')).toBe(false)
    })

    it('deve garantir que RECEPTIONIST acesse Recepção, Agenda, Pacientes e Contratos, mas NUNCA Prontuários, Planos de Sessão, Meu Dia ou TISS/Financeiro', () => {
        // Permitidos para RECEPTIONIST em clínica padrão
        expect(checkAccess('/dashboard/agenda', 'RECEPTIONIST')).toBe(true)
        expect(checkAccess('/dashboard/recepcao', 'RECEPTIONIST')).toBe(true)
        expect(checkAccess('/dashboard/pacientes', 'RECEPTIONIST')).toBe(true)
        expect(checkAccess('/dashboard/contratos', 'RECEPTIONIST')).toBe(true)
        expect(checkAccess('/dashboard/terapia/fila-espera', 'RECEPTIONIST')).toBe(true)
        expect(checkAccess('/dashboard/configuracoes', 'RECEPTIONIST')).toBe(true)

        // Bloqueados para RECEPTIONIST (sigilo clínico + financeiro)
        expect(checkAccess('/dashboard/prontuarios', 'RECEPTIONIST')).toBe(false)
        expect(checkAccess('/dashboard/meu-dia', 'RECEPTIONIST')).toBe(false)
        expect(checkAccess('/dashboard/minha-agenda', 'RECEPTIONIST')).toBe(false)
        expect(checkAccess('/dashboard/pacientes/abc/psicomotricidade', 'RECEPTIONIST')).toBe(false)
        expect(checkAccess('/dashboard/pacientes/abc/planos-sessao/psicologia', 'RECEPTIONIST')).toBe(false)
        expect(checkAccess('/dashboard/tiss', 'RECEPTIONIST')).toBe(false)
        expect(checkAccess('/dashboard/tiss/reports/loss-analysis', 'RECEPTIONIST')).toBe(false)
        expect(checkAccess('/dashboard/financeiro', 'RECEPTIONIST')).toBe(false)
        expect(checkAccess('/dashboard/meu-financeiro', 'RECEPTIONIST')).toBe(false)
    })

    it('deve garantir que FINANCIAL acesse Financeiro e TISS, mas NUNCA Pacientes, Prontuários, Contratos, Agenda ou Recepção', () => {
        expect(checkAccess('/dashboard/financeiro', 'FINANCIAL')).toBe(true)
        expect(checkAccess('/dashboard/tiss', 'FINANCIAL')).toBe(true)
        expect(checkAccess('/dashboard/tiss/reports/loss-analysis', 'FINANCIAL')).toBe(true)
        expect(checkAccess('/dashboard/convenios', 'FINANCIAL')).toBe(true)

        expect(checkAccess('/dashboard/pacientes', 'FINANCIAL')).toBe(false)
        expect(checkAccess('/dashboard/prontuarios', 'FINANCIAL')).toBe(false)
        expect(checkAccess('/dashboard/meu-dia', 'FINANCIAL')).toBe(false)
        expect(checkAccess('/dashboard/agenda', 'FINANCIAL')).toBe(false)
        expect(checkAccess('/dashboard/recepcao', 'FINANCIAL')).toBe(false)
        expect(checkAccess('/dashboard/contratos', 'FINANCIAL')).toBe(false)
        expect(checkAccess('/dashboard/terapia/supervisao', 'FINANCIAL')).toBe(false)
        expect(checkAccess('/dashboard/configuracoes', 'FINANCIAL')).toBe(false)
    })

    it('deve bloquear rotas clínicas e financeiras para NURSE, STAFF e READONLY', () => {
        for (const role of ['NURSE', 'STAFF', 'READONLY'] as DashboardRole[]) {
            expect(checkAccess('/dashboard/prontuarios', role)).toBe(false)
            expect(checkAccess('/dashboard/meu-dia', role)).toBe(false)
            expect(checkAccess('/dashboard/tiss', role)).toBe(false)
            expect(checkAccess('/dashboard/financeiro', role)).toBe(false)
            expect(checkAccess('/dashboard/contratos', role)).toBe(false)
            expect(checkAccess('/dashboard/pacientes/abc/psicomotricidade', role)).toBe(false)
            expect(checkAccess('/dashboard/pacientes/abc/planos-sessao/fonoaudiologia', role)).toBe(false)
        }
        expect(checkAccess('/dashboard/pacientes', 'READONLY')).toBe(false)
        expect(checkAccess('/dashboard/agenda', 'READONLY')).toBe(false)
    })

    it('deve preservar 100% das exceções pontuais de clínicas homologadas SEM vazar para nenhuma outra clínica ou usuário', () => {
        // 1. Coordenadora DOCTOR -> liberada em Agenda Geral e Indicadores de Evolução, mas bloqueada em Contratos/TISS
        expect(checkAccess('/dashboard/agenda', 'DOCTOR', { isCoordinator: true })).toBe(true)
        expect(checkAccess('/dashboard/terapia/conformidade-evolucao', 'DOCTOR', { isCoordinator: true })).toBe(true)
        expect(checkAccess('/dashboard/contratos', 'DOCTOR', { isCoordinator: true })).toBe(false)
        expect(checkAccess('/dashboard/tiss', 'DOCTOR', { isCoordinator: true })).toBe(false)

        // 2. Exceção pontual Espaço Incluir e WorldSensory: RECEPTIONIST em /dashboard/medicos
        expect(checkAccess('/dashboard/medicos', 'RECEPTIONIST', { clinicId: ESPACO_INCLUIR_CLINIC_ID })).toBe(true)
        expect(checkAccess('/dashboard/medicos', 'RECEPTIONIST', { clinicId: WORLD_SENSORY_CLINIC_ID })).toBe(true)
        // Isolamento estrito: outra clínica NUNCA herda a exceção
        expect(checkAccess('/dashboard/medicos', 'RECEPTIONIST', { clinicId: GENERIC_CLINIC_ID })).toBe(false)

        // 3. Exceção pontual WorldSensory (Jéssica): /dashboard/horarios e /dashboard/agenda
        expect(
            checkAccess('/dashboard/agenda', 'DOCTOR', {
                clinicId: WORLD_SENSORY_CLINIC_ID,
                userId: JESSICA_WORLD_SENSORY_USER_ID,
            })
        ).toBe(true)
        expect(
            checkAccess('/dashboard/horarios', 'DOCTOR', {
                clinicId: WORLD_SENSORY_CLINIC_ID,
                userId: JESSICA_WORLD_SENSORY_USER_ID,
            })
        ).toBe(true)
        // Isolamento estrito: mesmo userId/email em outra clínica NÃO herda a exceção
        expect(
            checkAccess('/dashboard/agenda', 'DOCTOR', {
                clinicId: GENERIC_CLINIC_ID,
                userId: JESSICA_WORLD_SENSORY_USER_ID,
                userEmail: 'wsadm.jessica@gmail.com',
            })
        ).toBe(false)
        // Outro usuário na WorldSensory também NÃO herda a exceção da Jéssica
        expect(
            checkAccess('/dashboard/agenda', 'DOCTOR', {
                clinicId: WORLD_SENSORY_CLINIC_ID,
                userId: GENERIC_USER_ID,
                userEmail: 'outro@clinica.com',
            })
        ).toBe(false)
    })

    it('deve garantir que GlobalCommandPalette, Pacientes, Planos de Sessão e APIs clínicas usam fonte única de RBAC e allowlists explícitas', () => {
        const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8')

        const palette = read('components/layout/GlobalCommandPalette.tsx')
        expect(palette).toContain('evaluateDashboardPageAccess')
        expect(palette).toContain('isClinicAuthorizedForContracts')
        expect(palette).toContain('if (!canAccessRoute(cleanPath, featureKey))')
        expect(palette).toContain('canSearchPatients')
        expect(palette).toContain('?tab=signatures')
        expect(palette).not.toContain('canSeeMedicalRecords = !isReceptionist')

        const pacientesList = read('app/dashboard/(clinic)/pacientes/page.tsx')
        expect(pacientesList).toContain('evaluateDashboardPageAccess')
        expect(pacientesList).toContain('canSeeMedicalRecords')
        expect(pacientesList).toContain('canSeeContracts')

        const pacienteDetail = read('app/dashboard/(clinic)/pacientes/[id]/page.tsx')
        expect(pacienteDetail).toContain('evaluateDashboardPageAccess')
        expect(pacienteDetail).toContain('canSeeMedicalRecords')
        expect(pacienteDetail).toContain('canSeeContracts')
        expect(pacienteDetail).toContain('canSeeReimbursement')

        const sessionDropdown = read('components/session-plans/SessionPlansDropdown.tsx')
        expect(sessionDropdown).toContain('SESSION_PLAN_CLINICAL_ROLES')

        const sessionGuard = read('lib/services/session-plans-guard.ts')
        expect(sessionGuard).toContain("['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'].includes(role)")

        const modulosAtivos = read('app/api/planos-sessao/modulos-ativos/route.ts')
        expect(modulosAtivos).toContain("['CLINIC_ADMIN', 'DOCTOR', 'SUPER_ADMIN'].includes(role)")

        const radarPanel = read('components/session-plans/SupervisionRadarPanel.tsx')
        expect(radarPanel).toContain('CLINICAL_SUPERVISION_ROLES')
        expect(radarPanel).toContain('enabled: canSeeClinicalSupervision')

        for (const apiPath of [
            'app/api/doctor/my-day/route.ts',
            'app/api/terapia/supervision-radar/route.ts',
            'app/api/patients/[id]/cross-specialty-context/route.ts',
        ]) {
            const src = read(apiPath)
            expect(src).toContain("const ALLOWED_ROLES = new Set(['DOCTOR', 'CLINIC_ADMIN', 'SUPER_ADMIN'])")
            expect(src).toContain('if (!ALLOWED_ROLES.has(role))')
        }
    })

    it('deve impedir regressão do erro PostgreSQL 42703 (doctors!inner(name)) em /api/supervision e garantir isolamento multi-tenant', () => {
        const supervisionApi = fs.readFileSync(
            path.join(process.cwd(), 'app/api/supervision/route.ts'),
            'utf8'
        )
        const supervisionPage = fs.readFileSync(
            path.join(process.cwd(), 'app/dashboard/(clinic)/terapia/supervisao/page.tsx'),
            'utf8'
        )
        const sidebar = fs.readFileSync(
            path.join(process.cwd(), 'components/layout/sidebar.tsx'),
            'utf8'
        )

        expect(supervisionApi).not.toContain('doctors!inner(name)')
        expect(supervisionApi).not.toContain('doctors(name)')
        expect(supervisionApi).toContain('doctors(id, specialty, user:users(full_name))')
        expect(supervisionApi).toContain('SUPERVISION_ALLOWED_ROLES')
        // Isolamento multi-tenant em GET, POST, PUT e DELETE
        expect(supervisionApi.match(/\.eq\('clinic_id', profile\.clinic_id\)/g)?.length || 0).toBeGreaterThanOrEqual(4)

        expect(supervisionPage).toContain('d.data || d.doctors')
        expect(supervisionPage).toContain('d.user?.full_name')

        expect(sidebar).toContain("href: '/dashboard/meu-dia'")
    })
})
