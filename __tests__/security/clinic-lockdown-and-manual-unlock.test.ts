import fs from 'fs'
import path from 'path'
import {
    buildClinicBlockedErrorPayload,
    formatScheduledBlockBrt,
    getClinicBlockedRedirectPath,
    hasPendingScheduledBlock,
    isClinicEffectivelyBlocked,
    isClinicTerminated,
} from '@/lib/auth/clinic-lockdown'

const ROOT = process.cwd()

describe('Bloqueio Definitivo/Agendado de Clínica (LGPD) e Desbloqueio Manual Exclusivo', () => {
    describe('Regras puras de lib/auth/clinic-lockdown.ts', () => {
        const block21hBrt = '2026-11-25T21:00:00-03:00'
        const before21h = new Date('2026-11-25T20:59:59-03:00').getTime()
        const exact21h = new Date('2026-11-25T21:00:00-03:00').getTime()
        const after21h = new Date('2026-11-25T21:00:01-03:00').getTime()

        it('mantém acesso liberado com aviso pendente até 20:59:59 BRT e bloqueia exatamente às 21:00:00 BRT', () => {
            const worldSensoryScheduled = {
                id: '4c13e586-5390-4393-a180-2c9dd7ed81c7',
                name: 'WorldSensory Terapias Multidisciplinares',
                is_active: true,
                scheduled_block_at: block21hBrt,
                block_type: 'TERMINATED_LGPD',
                manual_unlock_only: true,
            }

            expect(isClinicEffectivelyBlocked(worldSensoryScheduled, before21h)).toBe(false)
            expect(hasPendingScheduledBlock(worldSensoryScheduled, before21h)).toBe(true)

            expect(isClinicEffectivelyBlocked(worldSensoryScheduled, exact21h)).toBe(true)
            expect(hasPendingScheduledBlock(worldSensoryScheduled, exact21h)).toBe(false)

            expect(isClinicEffectivelyBlocked(worldSensoryScheduled, after21h)).toBe(true)
            expect(isClinicTerminated(worldSensoryScheduled)).toBe(true)
            expect(getClinicBlockedRedirectPath(worldSensoryScheduled)).toBe('/conta-bloqueada?type=terminated')
        })

        it('nunca afeta clínicas ativas sem agendamento de bloqueio', () => {
            const activeClinic = {
                id: 'active-clinic',
                name: 'Clínica Ativa',
                is_active: true,
                scheduled_block_at: null,
                block_type: null,
                manual_unlock_only: false,
            }

            expect(isClinicEffectivelyBlocked(activeClinic, after21h)).toBe(false)
            expect(hasPendingScheduledBlock(activeClinic, before21h)).toBe(false)
            expect(isClinicTerminated(activeClinic)).toBe(false)
        })

        it('diferencia conta encerrada definitivamente (LGPD) de suspensão por cobrança', () => {
            const billingSuspended = {
                is_active: false,
                block_type: 'SUSPENDED_BILLING',
                manual_unlock_only: false,
                blocked_reason: 'Mensalidade pendente',
            }
            const lgpdTerminated = {
                is_active: false,
                block_type: 'TERMINATED_LGPD',
                manual_unlock_only: true,
                blocked_reason: 'Encerramento LGPD',
            }

            expect(getClinicBlockedRedirectPath(billingSuspended)).toBe('/conta-bloqueada')
            expect(getClinicBlockedRedirectPath(lgpdTerminated)).toBe('/conta-bloqueada?type=terminated')

            const payload = buildClinicBlockedErrorPayload(lgpdTerminated)
            expect(payload.error.code).toBe('CLINIC_INACTIVE')
            expect(payload.error.block_type).toBe('TERMINATED_LGPD')
            expect(payload.error.manual_unlock_only).toBe(true)
            expect(payload.error.redirect_url).toBe('/conta-bloqueada?type=terminated')
        })

        it('formata o horário de encerramento no fuso de Brasília', () => {
            expect(formatScheduledBlockBrt('2026-11-26T00:00:00Z')).toBe('25/11/2026 às 21h00')
        })
    })

    describe('Cobertura anti-bypass em todas as rotas críticas de autenticação e desbloqueio', () => {
        const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8')

        it('bloqueia login, esqueci minha senha, redefinir senha, ativar conta, portal do paciente, totem/TV e sessão', () => {
            expect(read('app/api/auth/login/route.ts')).toContain('fetchClinicLockdownByUserEmail')
            expect(read('app/api/auth/forgot-password/route.ts')).toContain('isClinicEffectivelyBlocked')
            expect(read('app/api/auth/reset-password/route.ts')).toContain('isClinicEffectivelyBlocked')
            expect(read('app/api/auth/activate-account/route.ts')).toContain('isClinicEffectivelyBlocked')
            expect(read('app/api/patient/auth/login/route.ts')).toContain('isClinicEffectivelyBlocked')
            expect(read('app/api/auth/session/validate/route.ts')).toContain('isClinicEffectivelyBlocked')
            expect(read('middleware.ts')).toContain('isClinicEffectivelyBlocked')
            expect(read('middleware.ts')).toContain('totem|painel-tv')
            expect(read('app/dashboard/layout.tsx')).toContain('isClinicEffectivelyBlocked')
            expect(read('app/dashboard/layout.tsx')).not.toContain('ScheduledShutdownBanner')
        })

        it('impede desbloqueio automático ou via mark_paid/activate_plan/PATCH genérico', () => {
            const superAdminRoute = read('app/api/super-admin/clinics/[id]/route.ts')
            expect(superAdminRoute).toContain('MANUAL_UNLOCK_REQUIRED')
            expect(superAdminRoute).toContain("action === 'manual_unlock_terminated'")
            expect(superAdminRoute).toContain('super_admin_manual_unlock_clinic')

            const clinicsDetailRoute = read('app/api/clinics-detail/route.ts')
            expect(clinicsDetailRoute).toContain('MANUAL_UNLOCK_REQUIRED')

            const masterHub = read('app/system-master-hub/page.tsx')
            expect(masterHub).toContain('NOVO CONTRATO')
            expect(masterHub).toContain('manual_unlock_terminated')
        })

        it('garante tela Acesso Encerrado no Padrão Premium (zero emoji, zero & e contato comercial oficial)', () => {
            const blockedPage = read('app/conta-bloqueada/page.tsx')
            expect(blockedPage).toContain('Acesso ao sistema encerrado')
            expect(blockedPage).toContain('5521975129005')
            expect(blockedPage).toContain('contato@clinigo.app')
            expect(blockedPage).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u)
            // Garante ausência de '&' em textos visíveis ao usuário (ignora operadores JS && e querystring ?type=...)
            const visibleStrings = blockedPage
                .replace(/&&/g, '')
                .replace(/type=terminated&preview=1/g, '')
            expect(visibleStrings).not.toMatch(/\s&\s/)
        })
    })
})

