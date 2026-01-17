'use client'

import { createContext, useContext, ReactNode } from 'react'
import { useAuth } from '@/lib/hooks/use-auth'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

interface DemoContextType {
    isDemo: boolean
    clinicSlug: string | null
    blockAction: (actionName: string) => boolean
}

const DemoContext = createContext<DemoContextType>({
    isDemo: false,
    clinicSlug: null,
    blockAction: () => false
})

export function DemoProvider({ children }: { children: ReactNode }) {
    const { profile } = useAuth()
    const supabase = createClient()

    const { data: clinic } = useQuery({
        queryKey: ['clinic-slug', profile?.clinic_id],
        queryFn: async () => {
            if (!profile?.clinic_id) return null
            const { data } = await supabase
                .from('clinics')
                .select('slug')
                .eq('id', profile.clinic_id)
                .single()
            return data
        },
        enabled: !!profile?.clinic_id,
        staleTime: Infinity, // Cache forever during session
    })

    const isDemo = clinic?.slug === 'demo'
    const clinicSlug = clinic?.slug || null

    // Block actions that shouldn't be performed in demo
    const blockAction = (actionName: string): boolean => {
        if (!isDemo) return false

        const blockedActions = [
            'create_subscription',
            'change_clinic_email',
            'delete_clinic',
            'export_patient_data',
            'change_password',
            'invite_team_member',
        ]

        return blockedActions.includes(actionName)
    }

    return (
        <DemoContext.Provider value={{ isDemo, clinicSlug, blockAction }}>
            {children}
        </DemoContext.Provider>
    )
}

export function useDemo() {
    return useContext(DemoContext)
}

// Helper hook for components to check if action is blocked
export function useDemoBlock(actionName: string) {
    const { isDemo, blockAction } = useDemo()
    return {
        isDemo,
        isBlocked: blockAction(actionName),
        message: 'Esta ação está desabilitada na conta demo. Crie uma conta real para usar.',
    }
}
