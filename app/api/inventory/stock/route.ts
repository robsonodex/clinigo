import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Get stock levels and alerts
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
        const productId = searchParams.get('product_id')
        const alertsOnly = searchParams.get('alerts_only') === 'true'

        if (productId) {
            // Get specific product stock with movements
            const { data: stock } = await supabase
                .from('stock')
                .select(`
          *,
          product:products(id, name, sku, unit, min_stock, reorder_point)
        `)
                .eq('product_id', productId)
                .single()

            const { data: movements } = await supabase
                .from('stock_movements')
                .select('*')
                .eq('product_id', productId)
                .order('created_at', { ascending: false })
                .limit(20)

            return NextResponse.json({ stock, movements })
        }

        // Get all stock with product info
        let query = supabase
            .from('stock')
            .select(`
        *,
        product:products(id, name, sku, unit, min_stock, reorder_point, category_id)
      `)
            .eq('clinic_id', clinicId)

        const { data: stock, error } = await query

        if (error) {
            console.error('Stock error:', error)
            return NextResponse.json({ error: 'Erro ao buscar estoque' }, { status: 500 })
        }

        // Filter alerts if requested
        let result = stock
        if (alertsOnly) {
            result = stock?.filter((s: any) => {
                const p = s.product
                return s.quantity <= (p?.reorder_point || p?.min_stock || 0)
            })
        }

        // Get summary
        const summary = {
            totalProducts: stock?.length || 0,
            lowStock: stock?.filter((s: any) => {
                const p = s.product
                return s.quantity <= (p?.reorder_point || p?.min_stock || 0)
            }).length || 0,
            outOfStock: stock?.filter((s: any) => s.quantity <= 0).length || 0,
            totalValue: stock?.reduce((acc: number, s: any) => acc + (s.total_cost || 0), 0) || 0
        }

        return NextResponse.json({ stock: result, summary })
    } catch (error) {
        console.error('Stock error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

// POST: Create stock movement
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
            product_id,
            movement_type,
            quantity,
            unit_cost,
            lot_id,
            patient_id,
            appointment_id,
            notes
        } = body

        if (!product_id || !movement_type || quantity === undefined) {
            return NextResponse.json({
                error: 'Campos obrigatórios: product_id, movement_type, quantity'
            }, { status: 400 })
        }

        // Determine if quantity should be negative
        const outMovements = ['SALE', 'CONSUMPTION', 'ADJUSTMENT_OUT', 'TRANSFER_OUT', 'EXPIRED', 'DAMAGED']
        const finalQuantity = outMovements.includes(movement_type) ? -Math.abs(quantity) : Math.abs(quantity)

        // Check if we have enough stock for outgoing movements
        if (finalQuantity < 0) {
            const { data: currentStock } = await supabase
                .from('stock')
                .select('quantity')
                .eq('product_id', product_id)
                .single()

            if ((currentStock as any)?.quantity + finalQuantity < 0) {
                return NextResponse.json({ error: 'Estoque insuficiente' }, { status: 400 })
            }
        }

        const { data: movement, error } = await supabase
            .from('stock_movements')
            .insert({
                clinic_id: clinicId,
                product_id,
                lot_id,
                movement_type,
                quantity: finalQuantity,
                unit_cost,
                total_cost: unit_cost ? unit_cost * Math.abs(finalQuantity) : null,
                patient_id,
                appointment_id,
                notes,
                created_by: user.id
            })
            .select()
            .single()

        if (error) {
            console.error('Movement error:', error)
            return NextResponse.json({ error: 'Erro ao registrar movimento' }, { status: 500 })
        }

        // Get updated stock
        const { data: updatedStock } = await supabase
            .from('stock')
            .select('*')
            .eq('product_id', product_id)
            .single()

        return NextResponse.json({ movement, stock: updatedStock })
    } catch (error) {
        console.error('Movement error:', error)
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
    }
}

