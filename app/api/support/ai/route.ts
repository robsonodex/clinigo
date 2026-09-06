import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { askGeminiSupport } from '@/lib/services/gemini-support'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const body = await req.json()
        const { question } = body

        if (!question || typeof question !== 'string' || !question.trim()) {
            return NextResponse.json({ error: 'Pergunta inválida' }, { status: 400 })
        }

        // Buscar dados do perfil do usuário e clínica
        const { data: profile } = await supabase
            .from('users')
            .select(`
                id,
                full_name,
                email,
                phone,
                clinic:clinics(id, name)
            `)
            .eq('id', user.id)
            .single()

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const profileData = profile as any
        const clinic = Array.isArray(profileData?.clinic) ? profileData.clinic[0] : profileData?.clinic

        const response = await askGeminiSupport(question.trim(), {
            userName: profileData?.full_name || user.email?.split('@')[0] || 'Usuário',
            clinicName: clinic?.name || 'Clínica'
        })

        return NextResponse.json({
            success: true,
            userContext: {
                userName: profileData?.full_name || '',
                userEmail: user.email || profileData?.email || '',
                userPhone: profileData?.phone || '',
                clinicName: clinic?.name || '',
                clinicId: clinic?.id || null
            },
            ...response
        })
    } catch (error: any) {
        console.error('[API Support AI Error]:', error)
        return NextResponse.json(
            { error: error?.message || 'Falha ao processar solicitação com a IA' },
            { status: 500 }
        )
    }
}
