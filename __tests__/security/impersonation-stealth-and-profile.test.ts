import fs from 'fs'
import path from 'path'

describe('Impersonate 2.0 — Sigilo Total, 1-Clique, Multi-Perfil e Zero PGRST204', () => {
    it('elimina 100% da coluna inexistente target_clinic em INSERTs de system_logs', () => {
        const filesToCheck = [
            'app/api/super-admin/impersonation/route.ts',
            'app/api/super-admin/impersonation/[id]/route.ts',
            'app/api/super-admin/billing/route.ts',
            'app/api/super-admin/clinics/notify-feature/route.ts',
            'app/api/super-admin/clinics/send-billing/route.ts',
            'app/api/cron/billing/send-scheduled/route.ts',
        ]

        for (const rel of filesToCheck) {
            const content = fs.readFileSync(path.join(process.cwd(), rel), 'utf-8')
            expect(content).not.toMatch(/\btarget_clinic\s*:/)
        }
    })

    it('permite entrada em 1 clique sem exigir 10 caracteres de motivo e suporta Hot-Switch (PATCH)', () => {
        const routeContent = fs.readFileSync(
            path.join(process.cwd(), 'app/api/super-admin/impersonation/route.ts'),
            'utf-8'
        )
        expect(routeContent).not.toContain('Motivo deve ter no mínimo 10 caracteres')
        expect(routeContent).toContain('export const PATCH')
        expect(routeContent).toContain('clinic_users_for')
        expect(routeContent).toContain('target_user_id')
        expect(routeContent).toContain('target_role')

        // Sigilo absoluto: nunca grava em audit_logs (visível pela clínica) nem mexe em active_sessions
        expect(routeContent).not.toContain("from('audit_logs')")
        expect(routeContent).not.toContain("from('active_sessions')")
    })

    it('protege middleware.ts aplicando contexto de impersonation apenas para SUPER_ADMIN e fora do Master Hub', () => {
        const mwContent = fs.readFileSync(path.join(process.cwd(), 'middleware.ts'), 'utf-8')
        expect(mwContent).toContain('isSuperAdminOperator && !isMasterHubOrSuperApi')
        expect(mwContent).toContain('impersonation_target_user_id')
        expect(mwContent).toContain('impersonation_target_role')
    })

    it('substitui a barra laranja/vermelha fixa do topo pelo Dock Flutuante discreto e recolhível', () => {
        const dockContent = fs.readFileSync(
            path.join(process.cwd(), 'components/impersonation-banner.tsx'),
            'utf-8'
        )
        expect(dockContent).not.toContain('bg-amber-700')
        expect(dockContent).not.toContain('bg-red-')
        expect(dockContent).not.toContain('suas ações afetam esta clínica')
        expect(dockContent).toContain('fixed bottom-4 right-4')
        expect(dockContent).toContain('handleHotSwitch')
        expect(dockContent).toContain('/api/super-admin/impersonation/current')
    })
})

