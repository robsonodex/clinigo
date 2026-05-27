import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const bulletinSchema = z.object({
    title: z.string().min(3).max(255),
    content: z.string().min(5),
    type: z.enum(['info', 'warning', 'alert', 'success']).default('info'),
    target: z.enum(['internal', 'patients', 'all']).default('internal'),
    is_pinned: z.boolean().default(false),
    expires_at: z.string().nullable().optional(),
})

// GET: Retorna os boletins ativos da clínica
export async function GET(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const supabase = await createClient()

        // Buscar dados do usuário logado
        const { data: currentUser, error: userError } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (userError || !currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada para o usuário' }, { status: 404 })
        }

        const { data: bulletins, error } = await supabase
            .from('clinic_bulletins')
            .select('*')
            .eq('clinic_id', currentUser.clinic_id)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false })

        if (error) {
            console.error('Erro ao buscar bulletins:', error)
            return NextResponse.json({ error: 'Erro ao buscar boletins' }, { status: 500 })
        }

        return NextResponse.json({ bulletins: bulletins || [] })

    } catch (error) {
        console.error('Erro interno na API de bulletins:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// POST: Cria um novo boletim
export async function POST(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const supabase = await createClient()

        // Buscar dados do usuário logado
        const { data: currentUser, error: userError } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (userError || !currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada para o usuário' }, { status: 404 })
        }

        const body = await request.json()
        const validatedData = bulletinSchema.parse(body)

        const { data: newBulletin, error } = await supabase
            .from('clinic_bulletins')
            .insert({
                ...validatedData,
                clinic_id: currentUser.clinic_id,
                sender_id: userId,
            })
            .select()
            .single()

        if (error) {
            console.error('Erro ao criar bulletin:', error)
            return NextResponse.json({ error: 'Erro ao criar boletim' }, { status: 500 })
        }

        return NextResponse.json({ success: true, bulletin: newBulletin }, { status: 201 })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
        }
        console.error('Erro interno ao criar bulletin:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// PUT: Atualiza um boletim existente
export async function PUT(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const supabase = await createClient()

        // Buscar dados do usuário logado
        const { data: currentUser, error: userError } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (userError || !currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) {
            return NextResponse.json({ error: 'ID do boletim é obrigatório' }, { status: 400 })
        }

        const validatedData = bulletinSchema.parse(updateData)

        const { data: updatedBulletin, error } = await supabase
            .from('clinic_bulletins')
            .update({
                ...validatedData,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id)
            .eq('clinic_id', currentUser.clinic_id) // Garantir que pertence à clínica
            .select()
            .single()

        if (error) {
            console.error('Erro ao atualizar bulletin:', error)
            return NextResponse.json({ error: 'Erro ao atualizar boletim' }, { status: 500 })
        }

        return NextResponse.json({ success: true, bulletin: updatedBulletin })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
        }
        console.error('Erro interno ao atualizar bulletin:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}

// DELETE: Exclui um boletim
export async function DELETE(request: NextRequest) {
    try {
        const userId = request.headers.get('x-user-id')
        if (!userId) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const supabase = await createClient()

        // Buscar dados do usuário logado
        const { data: currentUser, error: userError } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', userId)
            .single()

        if (userError || !currentUser?.clinic_id) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 404 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'ID do boletim é obrigatório' }, { status: 400 })
        }

        const { error } = await supabase
            .from('clinic_bulletins')
            .delete()
            .eq('id', id)
            .eq('clinic_id', currentUser.clinic_id) // Garantir que pertence à clínica

        if (error) {
            console.error('Erro ao excluir bulletin:', error)
            return NextResponse.json({ error: 'Erro ao excluir boletim' }, { status: 500 })
        }

        return NextResponse.json({ success: true, message: 'Boletim excluído com sucesso' })

    } catch (error) {
        console.error('Erro interno ao excluir bulletin:', error)
        return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
    }
}
