/**
 * GET /api/inventory/categories - List categories
 * POST /api/inventory/categories - Create category
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const { data: categories, error } = await (supabase as any)
            .from('product_categories')
            .select('*')
            .eq('clinic_id', clinicId)
            .eq('is_active', true)
            .order('name')

        if (error) throw error

        return NextResponse.json({ categories: categories || [] })
    } catch (error) {
        console.error('Categories GET error:', error)
        return NextResponse.json({ error: 'Erro ao buscar categorias' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const body = await request.json()

        // Seed default categories
        if (body.seed) {
            const defaults = [
                { name: 'Limpeza', color: '#3B82F6', clinic_id: clinicId },
                { name: 'Consumo', color: '#10B981', clinic_id: clinicId },
                { name: 'Descartáveis', color: '#F59E0B', clinic_id: clinicId },
                { name: 'Escritório', color: '#8B5CF6', clinic_id: clinicId },
                { name: 'Medicamentos', color: '#EF4444', clinic_id: clinicId },
                { name: 'Alimentos', color: '#EC4899', clinic_id: clinicId },
            ]

            const { data, error } = await (supabase as any)
                .from('product_categories')
                .upsert(defaults, { onConflict: 'clinic_id,name', ignoreDuplicates: true })
                .select()

            if (error) throw error
            return NextResponse.json({ categories: data, message: 'Categorias padrão criadas' })
        }

        const { name, color, description } = body
        if (!name) {
            return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
        }

        const { data: category, error } = await (supabase as any)
            .from('product_categories')
            .insert({ clinic_id: clinicId, name, color: color || '#6B7280', description })
            .select()
            .single()

        if (error) throw error

        return NextResponse.json({ category })
    } catch (error) {
        console.error('Categories POST error:', error)
        return NextResponse.json({ error: 'Erro ao criar categoria' }, { status: 500 })
    }
}
