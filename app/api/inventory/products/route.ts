import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: List products
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

        const searchParams = request.nextUrl.searchParams
        const categoryId = searchParams.get('category_id')
        const type = searchParams.get('type')
        const search = searchParams.get('search')
        const lowStock = searchParams.get('low_stock') === 'true'
        const page = parseInt(searchParams.get('page') || '1')
        const limit = parseInt(searchParams.get('limit') || '50')
        const offset = (page - 1) * limit

        let query = supabase
            .from('products')
            .select(`
        *,
        category:product_categories(id, name, color),
        stock(quantity, available_quantity, average_cost)
      `, { count: 'exact' })
            .eq('clinic_id', clinicId)
            .eq('is_active', true)
            .order('name')
            .range(offset, offset + limit - 1)

        if (categoryId) query = query.eq('category_id', categoryId)
        if (type) query = query.eq('product_type', type)
        if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,barcode.ilike.%${search}%`)

        const { data: products, error, count } = await query

        if (error) {
            console.error('Products error:', error)
            return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 })
        }

        // Filter low stock if requested
        let result = products
        if (lowStock) {
            result = products?.filter((p: any) => {
                const qty = p.stock?.[0]?.quantity || 0
                return qty <= (p.reorder_point || p.min_stock || 0)
            })
        }

        return NextResponse.json({
            products: result,
            total: count || 0,
            page,
            limit
        })
    } catch (error) {
        console.error('Products error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create product
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
        const {
            sku,
            barcode,
            name,
            description,
            category_id,
            product_type = 'supply',
            active_ingredient,
            concentration,
            pharmaceutical_form,
            manufacturer,
            anvisa_registry,
            cost_price = 0,
            sale_price = 0,
            unit = 'un',
            min_stock = 0,
            max_stock,
            reorder_point,
            storage_location,
            requires_refrigeration = false,
            track_lots = false,
            track_expiration = false
        } = body

        if (!name) {
            return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
        }

        // Generate SKU if not provided
        const finalSku = sku || `PRD${Date.now().toString().slice(-8)}`

        const { data: product, error } = await supabase
            .from('products')
            .insert({
                clinic_id: clinicId,
                sku: finalSku,
                barcode,
                name,
                description,
                category_id,
                product_type,
                active_ingredient,
                concentration,
                pharmaceutical_form,
                manufacturer,
                anvisa_registry,
                cost_price,
                sale_price,
                unit,
                min_stock,
                max_stock,
                reorder_point: reorder_point || min_stock,
                storage_location,
                requires_refrigeration,
                track_lots,
                track_expiration
            })
            .select(`
        *,
        category:product_categories(id, name)
      `)
            .single()

        if (error) {
            console.error('Create product error:', error)
            return NextResponse.json({ error: 'Erro ao criar produto' }, { status: 500 })
        }

        // Initialize stock record
        await supabase.from('stock').insert({
            clinic_id: clinicId,
            product_id: product.id,
            quantity: 0
        })

        return NextResponse.json({ product })
    } catch (error) {
        console.error('Create product error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}
