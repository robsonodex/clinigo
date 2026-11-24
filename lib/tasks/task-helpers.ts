/**
 * Helpers puros do módulo Tarefas e Projetos (/dashboard/tarefas)
 * — Tradução amigável de perfis (nunca expor enums crus do banco ao usuário)
 * — Saneamento de nomes de projetos (sem "&") e UUIDs opcionais
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const DEFAULT_CLINIC_PROJECTS_CLEAN = [
    {
        name: 'Rotinas Administrativas e Recepção',
        color: '#10b981',
        description: 'Atendimento, guias TISS, cadastros e recepção',
    },
    {
        name: 'Demandas Terapêuticas e Laudos',
        color: '#0284c7',
        description: 'Relatórios escolares, PEI, interconsultas e devoluções',
    },
    {
        name: 'Gestão Clínica e Coordenação',
        color: '#6366f1',
        description: 'Reuniões de equipe, supervisões e auditoria de prontuários',
    },
    {
        name: 'Infraestrutura e Materiais',
        color: '#f59e0b',
        description: 'Materiais pedagógicos, jogos e suprimentos da clínica',
    },
] as const

const ROLE_LABELS_PT: Record<string, string> = {
    SUPER_ADMIN: 'Administrador',
    CLINIC_ADMIN: 'Administrador',
    ADMIN: 'Administrador',
    COORDINATOR: 'Coordenação',
    RECEPTIONIST: 'Recepção',
    FINANCIAL: 'Financeiro',
    NURSE: 'Enfermagem',
    STAFF: 'Equipe',
    READONLY: 'Somente leitura',
}

/**
 * Converte o enum técnico de role do banco em rótulo legível em pt-BR.
 * Nunca retorna códigos técnicos em inglês como CLINIC_ADMIN, DOCTOR ou RECEPTIONIST.
 */
export function formatTeamRoleLabel(
    role?: string | null,
    professionalLabel?: string | null
): string {
    const normalized = String(role || '').trim().toUpperCase()
    if (!normalized) return 'Equipe'
    if (normalized === 'DOCTOR') {
        const custom = String(professionalLabel || '').trim()
        return custom || 'Profissional'
    }
    return ROLE_LABELS_PT[normalized] || 'Equipe'
}

/**
 * Formata um membro da equipe para exibição em seletores e listas:
 * ex.: "Ana Silva — Profissional" ou "Carlos Souza — Recepção".
 */
export function formatTeamMemberOption(
    member: { full_name?: string | null; role?: string | null },
    professionalLabel?: string | null
): string {
    const name = String(member.full_name || '').trim() || 'Colaborador'
    const roleLabel = formatTeamRoleLabel(member.role, professionalLabel)
    return `${name} — ${roleLabel}`
}

/**
 * Remove o caractere "&" em nomes de projetos/categorias, substituindo por "e".
 */
export function sanitizeProjectName(rawName?: string | null): string {
    return String(rawName || '')
        .replace(/\s*&\s*/g, ' e ')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

/**
 * Garante que valores sentinelas de UI ("none", "all", "") nunca sejam enviados como UUID ao Postgres.
 */
export function sanitizeNullableUuid(value?: string | null): string | null {
    const clean = String(value || '').trim()
    if (!clean || clean === 'none' || clean === 'all') return null
    return UUID_REGEX.test(clean) ? clean : null
}

/**
 * Gera conteúdo CSV seguro (UTF-8 com BOM) das tarefas filtradas.
 */
export function buildTasksCsv(
    rows: Array<{
        title: string
        status: string
        priority: string
        due_date?: string | null
        project?: { name: string } | null
        assigned_user?: { full_name: string; role?: string } | null
        traffic_light?: { label: string }
        checklists?: Array<{ is_completed: boolean }>
    }>,
    professionalLabel?: string | null
): string {
    const statusMap: Record<string, string> = {
        TODO: 'A Fazer',
        IN_PROGRESS: 'Em Andamento',
        DONE: 'Concluído',
        CANCELLED: 'Cancelado',
    }
    const priorityMap: Record<string, string> = {
        LOW: 'Baixa',
        MEDIUM: 'Média',
        HIGH: 'Alta',
        URGENT: 'Urgente',
    }

    const escapeCell = (val: string) => `"${String(val || '').replace(/"/g, '""')}"`

    const header = [
        'Título',
        'Projeto',
        'Responsável',
        'Perfil',
        'Prioridade',
        'Status',
        'Prazo',
        'Situação',
        'Checklist',
    ]

    const lines = rows.map((t) => {
        const total = t.checklists?.length || 0
        const done = t.checklists?.filter((c) => c.is_completed).length || 0
        const dueBr = t.due_date ? t.due_date.split('-').reverse().join('/') : 'Sem prazo'
        return [
            t.title,
            t.project?.name ? sanitizeProjectName(t.project.name) : 'Sem projeto',
            t.assigned_user?.full_name || 'Não atribuído',
            t.assigned_user ? formatTeamRoleLabel(t.assigned_user.role, professionalLabel) : '-',
            priorityMap[t.priority] || t.priority,
            statusMap[t.status] || t.status,
            dueBr,
            t.traffic_light?.label || '-',
            total > 0 ? `${done}/${total}` : '-',
        ]
            .map(escapeCell)
            .join(';')
    })

    return '\uFEFF' + [header.map(escapeCell).join(';'), ...lines].join('\r\n')
}
