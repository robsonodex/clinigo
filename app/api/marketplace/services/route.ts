import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List clinic services
export async function GET(request: NextRequest) {
    try {
        const supabase = await createClient()

        const searchParams = request.nextUrl.searchParams
        const clinicId = searchParams.get('clinic_id')
        const categoryId = searchParams.get('category_id')
        const publicOnly = searchParams.get('public_only') === 'true'
        const featured = searchParams.get('featured') === 'true'
        const search = searchParams.get('search')

        let query = supabase
            .from('clinic_services')
            .select(`
        *,
        category:service_categories(id, name, slug, icon),
        doctors:service_doctors(doctor_id, custom_price, doctors(id, specialty, users(full_name))),
        clinic:clinics(id, name)
      `)
            .eq('is_active', true)
            .order('created_at', { ascending: false })

        if (clinicId) {
            query = query.eq('clinic_id', clinicId)
        }

        if (publicOnly) {
            query = query.in('visibility', ['PUBLIC', 'FEATURED'])
        }

        if (featured) {
            query = query.eq('visibility', 'FEATURED')
        }

        if (categoryId) {
            query = query.eq('category_id', categoryId)
        }

        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
        }

        const { data: services, error } = await query.limit(50)

        if (error) {
            console.error('Services error:', error)
            return NextResponse.json({ error: 'Erro ao buscar serviços' }, { status: 500 })
        }

        return NextResponse.json({ services })
    } catch (error) {
        console.error('Services error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create service
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

        // 🔥 FEATURE GATE: Marketplace is PRO+ exclusive
        const { data: clinic } = await supabase
            .from('clinics')
            .select('plan_type')
            .eq('id', clinicId)
            .single()

        if (clinic?.plan_type === 'BASIC') {
            return NextResponse.json({
                error: 'Marketplace disponível apenas nos planos Profissional e Enterprise',
                current_plan: 'BASIC',
                upgrade_to: 'PRO'
            }, { status: 403 })
        }

        const body = await request.json()
        const {
            name,
            description,
            short_description,
            category_id,
            price,
            promotional_price,
            promotion_end_date,
            duration_minutes = 30,
            visibility = 'PRIVATE',
            online_booking_enabled = false,
            booking_advance_days = 30,
            booking_notice_hours = 2,
            cancellation_policy,
            free_cancellation_hours = 24,
            doctor_ids = []
        } = body

        if (!name || !price) {
            return NextResponse.json({ error: 'Nome e preço são obrigatórios' }, { status: 400 })
        }

        // Generate slug
        const slug = name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')

        const { data: service, error } = await supabase
            .from('clinic_services')
            .insert({
                clinic_id: clinicId,
                name,
                description,
                short_description,
                category_id,
                price,
                promotional_price,
                promotion_end_date,
                duration_minutes,
                visibility,
                online_booking_enabled,
                booking_advance_days,
                booking_notice_hours,
                cancellation_policy,
                free_cancellation_hours,
                slug: `${slug}-${Date.now().toString(36)}`
            })
            .select()
            .single()

        if (error) {
            console.error('Create service error:', error)
            return NextResponse.json({ error: 'Erro ao criar serviço' }, { status: 500 })
        }

        // Link doctors
        if (doctor_ids.length > 0) {
            const doctorLinks = doctor_ids.map((doctorId: string) => ({
                service_id: service.id,
                doctor_id: doctorId
            }))
            await supabase.from('service_doctors').insert(doctorLinks)
        }

        return NextResponse.json({ service })
    } catch (error) {
        console.error('Create service error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

