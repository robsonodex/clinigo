import fs from 'fs'
import path from 'path'
import {
    buildTasksCsv,
    DEFAULT_CLINIC_PROJECTS_CLEAN,
    formatTeamMemberOption,
    formatTeamRoleLabel,
    sanitizeNullableUuid,
    sanitizeProjectName,
} from '@/lib/tasks/task-helpers'

describe('Módulo Tarefas e Projetos — Rótulos em pt-BR, Zero "&" e Proteção de Dados', () => {
    describe('1. Tradução de perfis do banco (zero enum cru exposto na interface)', () => {
        it('deve traduzir todos os enums do banco para português claro', () => {
            expect(formatTeamRoleLabel('CLINIC_ADMIN')).toBe('Administrador')
            expect(formatTeamRoleLabel('SUPER_ADMIN')).toBe('Administrador')
            expect(formatTeamRoleLabel('COORDINATOR')).toBe('Coordenação')
            expect(formatTeamRoleLabel('DOCTOR')).toBe('Profissional')
            expect(formatTeamRoleLabel('DOCTOR', 'Terapeuta')).toBe('Terapeuta')
            expect(formatTeamRoleLabel('RECEPTIONIST')).toBe('Recepção')
            expect(formatTeamRoleLabel('FINANCIAL')).toBe('Financeiro')
            expect(formatTeamRoleLabel('NURSE')).toBe('Enfermagem')
            expect(formatTeamRoleLabel('STAFF')).toBe('Equipe')
            expect(formatTeamRoleLabel('READONLY')).toBe('Somente leitura')
            expect(formatTeamRoleLabel('DESCONHECIDO_RAW')).toBe('Equipe')
        })

        it('deve formatar opções do seletor de responsável sem exibir DOCTOR/CLINIC_ADMIN/RECEPTIONIST', () => {
            const opt1 = formatTeamMemberOption({ full_name: 'Ana Costa', role: 'DOCTOR' }, 'Terapeuta')
            const opt2 = formatTeamMemberOption({ full_name: 'Carlos Lima', role: 'CLINIC_ADMIN' })
            const opt3 = formatTeamMemberOption({ full_name: 'Bruna Dias', role: 'RECEPTIONIST' })

            expect(opt1).toBe('Ana Costa — Terapeuta')
            expect(opt2).toBe('Carlos Lima — Administrador')
            expect(opt3).toBe('Bruna Dias — Recepção')

            for (const opt of [opt1, opt2, opt3]) {
                expect(opt).not.toMatch(/CLINIC_ADMIN|DOCTOR|RECEPTIONIST|SUPER_ADMIN/)
            }
        })
    })

    describe('2. Remoção total do caractere "&" em projetos e saneamento de UUID', () => {
        it('todos os projetos padrão devem estar 100% sem "&"', () => {
            expect(DEFAULT_CLINIC_PROJECTS_CLEAN.length).toBe(4)
            for (const p of DEFAULT_CLINIC_PROJECTS_CLEAN) {
                expect(p.name).not.toContain('&')
            }
            expect(sanitizeProjectName('Rotinas Administrativas & Recepção')).toBe(
                'Rotinas Administrativas e Recepção'
            )
            expect(sanitizeProjectName('Infraestrutura & Materiais')).toBe('Infraestrutura e Materiais')
        })

        it('deve converter "none", "all" e strings inválidas para null (evitando erro UUID no Postgres)', () => {
            expect(sanitizeNullableUuid('none')).toBeNull()
            expect(sanitizeNullableUuid('all')).toBeNull()
            expect(sanitizeNullableUuid('')).toBeNull()
            expect(sanitizeNullableUuid(null)).toBeNull()
            expect(sanitizeNullableUuid('11111111-1111-4111-8111-111111111111')).toBe(
                '11111111-1111-4111-8111-111111111111'
            )
        })

        it('deve gerar CSV com nomes limpos e perfis traduzidos', () => {
            const csv = buildTasksCsv(
                [
                    {
                        title: 'Revisar guia TISS',
                        status: 'TODO',
                        priority: 'HIGH',
                        due_date: '2026-11-25',
                        project: { name: 'Rotinas Administrativas & Recepção' },
                        assigned_user: { full_name: 'Maria Clara', role: 'RECEPTIONIST' },
                        traffic_light: { label: 'Vence em 1d' },
                        checklists: [{ is_completed: true }, { is_completed: false }],
                    },
                ],
                'Terapeuta'
            )
            expect(csv).toContain('Rotinas Administrativas e Recepção')
            expect(csv).toContain('Recepção')
            expect(csv).not.toContain('RECEPTIONIST')
            expect(csv).not.toContain('&')
            expect(csv).toContain('1/2')
        })
    })

    describe('3. Auditoria Estrutural da Tela e APIs de Tarefas', () => {
        const root = process.cwd()

        it('tarefas/page.tsx não deve expor {m.role}, não deve usar confirm() nativo e não deve ter "&" em rótulos', () => {
            const page = fs.readFileSync(
                path.join(root, 'app/dashboard/(clinic)/tarefas/page.tsx'),
                'utf8'
            )
            expect(page).not.toContain('({m.role})')
            expect(page).not.toContain("confirm('Deseja realmente excluir")
            expect(page).not.toContain('Título & Descrição')
            expect(page).toContain('formatTeamMemberOption')
            expect(page).toContain('formatTeamRoleLabel')
            expect(page).toContain('handleDuplicateTask')
            expect(page).toContain('handleExportCsv')
            expect(page).not.toMatch(/\bSparkles\b|\bPartyPopper\b|bg-gradient-to-/)
        })

        it('tasks-service.ts e rotas /api/tasks/* devem persistir checklists e validar RBAC de projetos', () => {
            const service = fs.readFileSync(path.join(root, 'lib/services/tasks-service.ts'), 'utf8')
            const projRoute = fs.readFileSync(path.join(root, 'app/api/tasks/projects/route.ts'), 'utf8')
            const idRoute = fs.readFileSync(path.join(root, 'app/api/tasks/[id]/route.ts'), 'utf8')

            expect(service).not.toMatch(
                /Rotinas Administrativas\s*&|Demandas Terapêuticas\s*&|Gestão Clínica\s*&|Infraestrutura\s*&/
            )
            expect(service).toContain('updateProject')
            expect(service).toContain('archiveProject')
            expect(service).toContain("from('clinic_task_checklists').delete()")

            expect(projRoute).toContain('export const PATCH')
            expect(projRoute).toContain('export const DELETE')
            expect(projRoute).toContain('MANAGER_ROLES')

            expect(idRoute).toContain('MANAGER_ROLES')
            expect(idRoute).toContain('sanitizeNullableUuid')
        })
    })
})
