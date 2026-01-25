/**
 * Example: VirtualizedList Usage for Patients
 * 
 * How to apply VirtualizedList to existing patients list
 */
'use client'

import { VirtualizedList } from '@/components/ui/virtualized-list'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Mail, Phone, Calendar } from 'lucide-react'
import { format, differenceInYears } from 'date-fns'

interface Patient {
    id: string
    name: string
    email: string
    phone: string
    birth_date: string
    cpf: string
    last_appointment?: string
}

interface PatientsVirtualizedListProps {
    patients: Patient[]
    onPatientClick?: (patient: Patient) => void
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase()
}

function getAge(birthDate: string): number {
    return differenceInYears(new Date(), new Date(birthDate))
}

function PatientCard({ patient, onClick }: {
    patient: Patient
    onClick?: (patient: Patient) => void
}) {
    const age = getAge(patient.birth_date)

    return (
        <Card
            className="p-4 hover:bg-accent cursor-pointer transition-colors"
            onClick={() => onClick?.(patient)}
        >
            <div className="flex items-start gap-3">
                <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                        {getInitials(patient.name)}
                    </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className="font-medium truncate">{patient.name}</h3>
                        <Badge variant="outline">{age} anos</Badge>
                    </div>

                    <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{patient.email}</span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span>{patient.phone}</span>
                        </div>

                        {patient.last_appointment && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-3 w-3 flex-shrink-0" />
                                <span>
                                    Última consulta: {format(new Date(patient.last_appointment), 'dd/MM/yyyy')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Card>
    )
}

export function PatientsVirtualizedList({
    patients,
    onPatientClick,
}: PatientsVirtualizedListProps) {
    return (
        <VirtualizedList
            items={patients}
            renderItem={(patient) => (
                <PatientCard
                    patient={patient}
                    onClick={onPatientClick}
                />
            )}
            getItemKey={(patient) => patient.id}
            estimateSize={104} // Altura estimada do card
            height="calc(100vh - 200px)"
            className="space-y-2"
        />
    )
}

/**
 * Usage in page:
 * 
 * import { PatientsVirtualizedList } from '@/components/examples/patients-virtualized-list'
 * import { useQuery } from '@tanstack/react-query'
 * 
 * export function PatientsPage() {
 *   const { data: patients = [] } = useQuery({
 *     queryKey: ['patients'],
 *     queryFn: () => fetchPatients()
 *   })
 * 
 *   return (
 *     <div>
 *       <h1>Pacientes</h1>
 *       <PatientsVirtualizedList
 *         patients={patients}
 *         onPatientClick={(patient) => router.push(`/patients/${patient.id}`)}
 *       />
 *     </div>
 *   )
 * }
 */
