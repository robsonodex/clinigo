import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        const body = await req.json()
        const {
            clinic_id,
            clinic_name,
            user_name,
            user_email,
            user_phone,
            title,
            description
        } = body

        if (!title || !description || !user_name || !clinic_name) {
            return NextResponse.json(
                { error: 'Campos obrigatórios ausentes: título, descrição, nome ou clínica.' },
                { status: 400 }
            )
        }

        const { data, error } = await supabase
            .from('feature_suggestions')
            .insert({
                clinic_id: clinic_id || null,
                user_id: user?.id || null,
                clinic_name: clinic_name.trim(),
                user_name: user_name.trim(),
                user_email: user_email?.trim() || user?.email || null,
                user_phone: user_phone?.trim() || null,
                title: title.trim(),
                description: description.trim(),
                status: 'PENDING'
            })
            .select()
            .single()

        if (error) {
            console.error('[Feature Suggestions Insert Error]:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            message: 'Sugestão registrada com sucesso! Nossa equipe de produto irá analisar.',
            data
        })
    } catch (error: any) {
        console.error('[API Support Suggest Error]:', error)
        return NextResponse.json(
            { error: error?.message || 'Falha ao registrar sugestão' },
            { status: 500 }
        )
    }
}
