'use client'

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { User } from 'lucide-react'

interface ProfileHeaderProps {
    // Optional props for future customization
}

export default function ProfileHeader({ }: ProfileHeaderProps) {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadUser() {
            const supabase = createClient()
            const { data: { user: authUser } } = await supabase.auth.getUser()

            if (authUser) {
                // Buscar dados completos do usuário
                const { data: userData } = await supabase
                    .from('users')
                    .select('*, clinic:clinics(name)')
                    .eq('id', authUser.id)
                    .single()

                setUser(userData || authUser.user_metadata)
            }
            setLoading(false)
        }

        loadUser()
    }, [])

    if (loading) {
        return null // Skeleton is handled by loading.tsx
    }

    const getInitials = (name: string) => {
        if (!name) return '??'
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const getRoleBadge = (role: string) => {
        const roleColors: Record<string, string> = {
            SUPER_ADMIN: 'bg-purple-100 text-purple-800',
            CLINIC_ADMIN: 'bg-blue-100 text-blue-800',
            DOCTOR: 'bg-green-100 text-green-800',
            SECRETARY: 'bg-yellow-100 text-yellow-800',
        }

        const roleLabels: Record<string, string> = {
            SUPER_ADMIN: 'Super Administrador',
            CLINIC_ADMIN: 'Administrador',
            DOCTOR: 'Médico',
            SECRETARY: 'Secretária',
        }

        return (
            <Badge className={roleColors[role] || 'bg-gray-100 text-gray-800'}>
                {roleLabels[role] || role}
            </Badge>
        )
    }

    return (
        <Card>
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-6">
                {/* Avatar */}
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24">
                    <AvatarImage src={user?.avatar_url} alt={user?.name || 'Avatar'} />
                    <AvatarFallback className="text-lg">
                        {user?.name ? getInitials(user.name) : <User className="h-8 w-8" />}
                    </AvatarFallback>
                </Avatar>

                {/* Informações Básicas */}
                <div className="flex-1 text-center sm:text-left space-y-1">
                    <h1 className="text-2xl font-bold">
                        {user?.name || 'Usuário'}
                    </h1>
                    <p className="text-muted-foreground">
                        {user?.email}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2">
                        {user?.role && getRoleBadge(user.role)}
                        {user?.clinic?.name && (
                            <Badge variant="outline">
                                {user.clinic.name}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Status / Ações futuras */}
                <div className="text-center sm:text-right text-sm text-muted-foreground">
                    <p>Membro desde</p>
                    <p className="font-medium">
                        {user?.created_at
                            ? new Date(user.created_at).toLocaleDateString('pt-BR')
                            : '-'
                        }
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}
