/**
 * GET /api/medical-record-templates?specialty=xxx
 * POST /api/medical-record-templates
 * PUT /api/medical-record-templates
 * DELETE /api/medical-record-templates?id=xxx
 * 
 * Gerencia templates de prontuário por especialidade
 */
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { searchParams } = new URL(request.url)
        const specialty = searchParams.get('specialty')

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

        let query = (supabase as any)
            .from('medical_record_templates')
            .select('*')
            .eq('clinic_id', (profile as any).clinic_id)
            .eq('is_active', true)
            .order('is_default', { ascending: false })
            .order('name')

        if (specialty) {
            query = query.eq('specialty', specialty)
        }

        const { data, error } = await query
        if (error) throw error

        return NextResponse.json({ data: data || [] })
    } catch (error) {
        console.error('Medical record templates GET error:', error)
        return NextResponse.json({ error: 'Erro ao buscar templates' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role, is_coordinator')
            .eq('id', user.id)
            .single()

        if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })

        // Apenas CLINIC_ADMIN, SUPER_ADMIN, ou DOCTOR coordenador podem criar templates
        const role = (profile as any).role
        const isCoordinator = (profile as any).is_coordinator
        if (role === 'DOCTOR' && !isCoordinator) {
            return NextResponse.json({ error: 'Apenas administradores e coordenadores podem criar templates' }, { status: 403 })
        }

        const body = await request.json()
        const { name, specialty, fields, is_default } = body

        if (!name || !fields || !Array.isArray(fields)) {
            return NextResponse.json({ error: 'Nome e campos são obrigatórios' }, { status: 400 })
        }

        // Validate fields structure
        for (const field of fields) {
            if (!field.key || !field.label || !field.type) {
                return NextResponse.json({ 
                    error: 'Cada campo deve ter key, label e type',
                    details: `Campo inválido: ${JSON.stringify(field)}`
                }, { status: 400 })
            }
        }

        // If setting as default, unset other defaults for this specialty
        if (is_default && specialty) {
            await (supabase as any)
                .from('medical_record_templates')
                .update({ is_default: false })
                .eq('clinic_id', (profile as any).clinic_id)
                .eq('specialty', specialty)
                .eq('is_default', true)
        }

        const { data, error } = await (supabase as any)
            .from('medical_record_templates')
            .insert({
                clinic_id: (profile as any).clinic_id,
                name,
                specialty: specialty || null,
                fields,
                is_default: is_default || false,
                created_by: user.id,
            })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data, message: 'Template criado' })
    } catch (error) {
        console.error('Medical record templates POST error:', error)
        return NextResponse.json({ error: 'Erro ao criar template' }, { status: 500 })
    }
}

export async function PUT(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // Verificar permissão: apenas CLINIC_ADMIN, SUPER_ADMIN, ou DOCTOR coordenador
        const { data: profile } = await supabase
            .from('users')
            .select('role, is_coordinator')
            .eq('id', user.id)
            .single()

        const role = (profile as any)?.role
        const isCoordinator = (profile as any)?.is_coordinator
        if (role === 'DOCTOR' && !isCoordinator) {
            return NextResponse.json({ error: 'Apenas administradores e coordenadores podem editar templates' }, { status: 403 })
        }

        const body = await request.json()
        const { id, ...updateData } = body

        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        const { data, error } = await (supabase as any)
            .from('medical_record_templates')
            .update({ ...updateData, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ data, message: 'Template atualizado' })
    } catch (error) {
        console.error('Medical record templates PUT error:', error)
        return NextResponse.json({ error: 'Erro ao atualizar template' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

        // Verificar permissão: apenas CLINIC_ADMIN, SUPER_ADMIN, ou DOCTOR coordenador
        const { data: profile } = await supabase
            .from('users')
            .select('role, is_coordinator')
            .eq('id', user.id)
            .single()

        const role = (profile as any)?.role
        const isCoordinator = (profile as any)?.is_coordinator
        if (role === 'DOCTOR' && !isCoordinator) {
            return NextResponse.json({ error: 'Apenas administradores e coordenadores podem excluir templates' }, { status: 403 })
        }

        const { searchParams } = new URL(request.url)
        const id = searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

        // Soft delete
        const { error } = await (supabase as any)
            .from('medical_record_templates')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (error) throw error

        return NextResponse.json({ message: 'Template desativado' })
    } catch (error) {
        console.error('Medical record templates DELETE error:', error)
        return NextResponse.json({ error: 'Erro ao desativar template' }, { status: 500 })
    }
}
