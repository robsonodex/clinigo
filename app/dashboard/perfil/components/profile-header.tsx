'use client'

import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { User } from 'lucide-react'
import { useProfessionalLabel } from '@/lib/hooks/use-professional-label'

interface ProfileHeaderProps {
    // Optional props for future customization
}

export default function ProfileHeader({ }: ProfileHeaderProps) {
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const profLabel = useProfessionalLabel()

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

        const handleUpdate = (e?: any) => {
            if (e?.detail?.full_name || e?.detail?.avatar_url) {
                setUser((prev: any) => ({
                    ...prev,
                    full_name: e?.detail?.full_name ?? prev?.full_name,
                    name: e?.detail?.full_name ?? prev?.name,
                    avatar_url: e?.detail?.avatar_url ?? prev?.avatar_url,
                }))
            }
            loadUser()
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('user-profile-updated', handleUpdate)
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('user-profile-updated', handleUpdate)
            }
        }
    }, [])

    if (loading) {
        return null // Skeleton is handled by loading.tsx
    }

    const displayName = user?.full_name || user?.name || 'Usuário'

    const getInitials = (name: string) => {
        if (!name) return '??'
        return name
            .split(' ')
            .filter(Boolean)
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    const getRoleBadge = (role: string) => {
        const roleColors: Record<string, string> = {
            SUPER_ADMIN: 'bg-primary/10 text-primary border border-primary/20',
            CLINIC_ADMIN: 'bg-blue-100 text-blue-800',
            DOCTOR: 'bg-emerald-100 text-emerald-800',
            SECRETARY: 'bg-amber-100 text-amber-800',
        }

        const roleLabels: Record<string, string> = {
            SUPER_ADMIN: 'Super Administrador',
            CLINIC_ADMIN: 'Administrador',
            DOCTOR: profLabel.singular,
            SECRETARY: 'Secretária',
        }

        return (
            <Badge className={roleColors[role] || 'bg-gray-100 text-gray-800'}>
                {roleLabels[role] || role}
            </Badge>
        )
    }

    return (
        <Card className="border-border/60 shadow-sm">
            <CardContent className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-6">
                {/* Avatar */}
                <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary/10 shadow-sm">
                    <AvatarImage src={user?.avatar_url} alt={displayName} />
                    <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                        {displayName ? getInitials(displayName) : <User className="h-8 w-8" />}
                    </AvatarFallback>
                </Avatar>

                {/* Informações Básicas */}
                <div className="flex-1 text-center sm:text-left space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                        {displayName}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        {user?.email}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center sm:justify-start mt-2">
                        {user?.role && getRoleBadge(user.role)}
                        {user?.clinic?.name && (
                            <Badge variant="outline" className="border-border">
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
