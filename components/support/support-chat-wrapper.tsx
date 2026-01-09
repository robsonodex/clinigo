'use client'

import { useEffect, useState } from 'react'
import { ChatWidget } from '@/components/support/chat-widget'
import { createClient } from '@/lib/supabase/client'

interface UserData {
    id: string
    name: string
    role: string
    clinic: {
        id: string
        name: string
        plan_type: string
    }
}

export function SupportChatWrapper() {
    const [user, setUser] = useState<UserData | null>(null)

    useEffect(() => {
        async function loadUser() {
            const supabase = createClient()

            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (!authUser) return

            // Get user details with clinic info
            const { data } = await supabase
                .from('users')
                .select(`
                    id,
                    full_name,
                    role,
                    clinic:clinics(id, name, plan_type)
                `)
                .eq('id', authUser.id)
                .single()

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const userData = data as any
            if (userData && userData.clinic) {
                const clinic = Array.isArray(userData.clinic) ? userData.clinic[0] : userData.clinic
                setUser({
                    id: userData.id,
                    name: userData.full_name || 'Usuário',
                    role: userData.role,
                    clinic: {
                        id: clinic?.id || '',
                        name: clinic?.name || 'Clínica',
                        plan_type: clinic?.plan_type || 'BASIC',
                    },
                })
            }
        }

        loadUser()
    }, [])

    // Don't show if no user or is SUPER_ADMIN (they use the admin panel)
    if (!user || user.role === 'SUPER_ADMIN') return null

    return <ChatWidget user={user} />
}
