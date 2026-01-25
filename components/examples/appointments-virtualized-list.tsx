/**
 * Example: VirtualizedList Usage for Appointments
 * 
 * How to apply VirtualizedList to existing appointments list
 */
'use client'

import { VirtualizedList } from '@/components/ui/virtualized-list'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, Clock, User } from 'lucide-react'

interface Appointment {
    id: string
    patient_name: string
    doctor_name: string
    date: string
    time: string
    status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
    type: string
}

interface AppointmentsVirtualizedListProps {
    appointments: Appointment[]
    onAppointmentClick?: (appointment: Appointment) => void
}

const STATUS_COLORS = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-800',
}

const STATUS_LABELS = {
    PENDING: 'Pendente',
    CONFIRMED: 'Confirmado',
    COMPLETED: 'Concluído',
    CANCELLED: 'Cancelado',
}

function AppointmentCard({ appointment, onClick }: {
    appointment: Appointment
    onClick?: (apt: Appointment) => void
}) {
    return (
        <Card
            className="p-4 hover:bg-accent cursor-pointer transition-colors"
            onClick={() => onClick?.(appointment)}
        >
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{appointment.patient_name}</span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(appointment.date), 'dd/MM/yyyy', { locale: ptBR })}
                        </div>
                        <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {appointment.time}
                        </div>
                    </div>

                    <p className="text-sm text-muted-foreground mt-1">
                        Dr. {appointment.doctor_name}
                    </p>
                </div>

                <Badge className={STATUS_COLORS[appointment.status]}>
                    {STATUS_LABELS[appointment.status]}
                </Badge>
            </div>
        </Card>
    )
}

export function AppointmentsVirtualizedList({
    appointments,
    onAppointmentClick,
}: AppointmentsVirtualizedListProps) {
    return (
        <VirtualizedList
            items={appointments}
            renderItem={(appointment) => (
                <AppointmentCard
                    appointment={appointment}
                    onClick={onAppointmentClick}
                />
            )}
            getItemKey={(apt) => apt.id}
            estimateSize={96} // Altura estimada do card em pixels
            height="calc(100vh - 200px)" // Ajustar baseado no layout
            className="space-y-2" // Spacing entre cards
        />
    )
}

/**
 * Usage in page:
 * 
 * import { AppointmentsVirtualizedList } from '@/components/examples/appointments-virtualized-list'
 * import { useQuery } from '@tanstack/react-query'
 * 
 * export function AppointmentsPage() {
 *   const { data: appointments = [] } = useQuery({
 *     queryKey: ['appointments'],
 *     queryFn: () => fetchAppointments()
 *   })
 * 
 *   return (
 *     <AppointmentsVirtualizedList
 *       appointments={appointments}
 *       onAppointmentClick={(apt) => router.push(`/appointments/${apt.id}`)}
 *     />
 *   )
 * }
 */
