'use client'

import { LucideIcon, PackageOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
    icon?: LucideIcon
    title: string
    description: string
    action?: {
        label: string
        onClick?: () => void
        href?: string
    }
    className?: string
}

/**
 * EmptyState Component
 * Professional empty state for when there's no data
 */
export function EmptyState({
    icon: Icon = PackageOpen,
    title,
    description,
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-16 px-4 ${className}`}>
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                <Icon className="w-10 h-10 text-muted-foreground" />
            </div>

            <h3 className="text-xl font-semibold text-foreground mb-2 text-center">
                {title}
            </h3>

            <p className="text-muted-foreground text-center max-w-md mb-6">
                {description}
            </p>

            {action && (
                action.href ? (
                    <a href={action.href}>
                        <Button>{action.label}</Button>
                    </a>
                ) : (
                    <Button onClick={action.onClick}>
                        {action.label}
                    </Button>
                )
            )}
        </div>
    )
}

/**
 * Specific Empty States for common scenarios
 */
export function NoPatientsState() {
    return (
        <EmptyState
            title="Nenhum paciente cadastrado"
            description="Cadastre ou importe seus pacientes para começar a gerenciá-los."
            action={{
                label: 'Cadastrar Paciente',
                href: '/dashboard/pacientes/novo',
            }}
        />
    )
}

export function NoDoctorsState() {
    return (
        <EmptyState
            title="Nenhum médico cadastrado"
            description="Adicione os médicos da sua clínica para habilitar agendamentos."
            action={{
                label: 'Cadastrar Médico',
                href: '/dashboard/medicos',
            }}
        />
    )
}

export function NoAppointmentsState() {
    return (
        <EmptyState
            title="Nenhuma consulta agendada"
            description="Quando pacientes agendarem consultas, elas aparecerão aqui."
            action={{
                label: 'Ver Agenda',
                href: '/dashboard/agenda',
            }}
        />
    )
}

export function NoInvoicesState() {
    return (
        <EmptyState
            title="Nenhuma fatura encontrada"
            description="As faturas das consultas aparecerão aqui após os atendimentos."
        />
    )
}

export function NoDataState({ entity = 'registros' }: { entity?: string }) {
    return (
        <EmptyState
            title={`Nenhum ${entity} encontrado`}
            description={`Quando você adicionar ${entity}, eles aparecerão aqui.`}
        />
    )
}
