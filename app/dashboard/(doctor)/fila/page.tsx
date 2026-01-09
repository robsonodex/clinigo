'use client'

import { useUser } from '@/hooks/use-user'
import { QueueManager } from '@/components/dashboard/doctor/QueueManager'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function FilaAtendimentoPage() {
    const { user, isLoading } = useUser()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        )
    }

    if (!user?.id || !user?.clinic_id) {
        return (
            <div className="p-6">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-muted-foreground">
                            Usuário ou clínica não configurados
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Get doctor ID - if user is a doctor, use their ID
    // Otherwise this page shouldn't be accessible
    const doctorId = user.role === 'DOCTOR' ? user.id : user.id

    return (
        <div className="p-6">
            <QueueManager
                doctorId={doctorId}
                clinicId={user.clinic_id}
                doctorName={user.full_name || user.name}
            />
        </div>
    )
}

