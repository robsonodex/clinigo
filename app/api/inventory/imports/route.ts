/**
 * GET /api/inventory/imports - Lista importações agrupadas por data
 * DELETE /api/inventory/imports?batch_id=xxx - Exclui uma importação inteira
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
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

        // Buscar movimentos de importação agrupados por batch_id ou data
        const { data: movements, error } = await (supabase as any)
            .from('stock_movements')
            .select(`
                id,
                product_id,
                quantity,
                unit_cost,
                total_cost,
                created_at,
                reference,
                notes,
                product:products(id, name, sku)
            `)
            .eq('clinic_id', clinicId)
            .or('notes.eq.Importado via planilha,notes.eq.Importação (atualização)')
            .order('created_at', { ascending: false })

        if (error) throw error

        // Agrupar por "lote" (mesmo minuto de importação = mesmo lote)
        const batches: Record<string, {
            batch_id: string
            date: string
            product_count: number
            total_value: number
            products: Array<{ name: string; quantity: number; cost: number }>
        }> = {}

        for (const movement of (movements || [])) {
            // batch_id = data truncada para o minuto (importações feitas juntas)
            const date = new Date(movement.created_at)
            const batchKey = date.toISOString().slice(0, 16) // YYYY-MM-DDTHH:MM
            
            if (!batches[batchKey]) {
                batches[batchKey] = {
                    batch_id: batchKey,
                    date: movement.created_at,
                    product_count: 0,
                    total_value: 0,
                    products: []
                }
            }
            
            batches[batchKey].product_count++
            batches[batchKey].total_value += movement.total_cost || 0
            batches[batchKey].products.push({
                name: movement.product?.name || 'Produto removido',
                quantity: movement.quantity,
                cost: movement.unit_cost || 0
            })
        }

        const importList = Object.values(batches).sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )

        return NextResponse.json({ imports: importList })
    } catch (error) {
        console.error('Imports list error:', error)
        return NextResponse.json({ error: 'Erro ao buscar importações' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .single()

        const clinicId = (userData as any)?.clinic_id
        if (!clinicId) {
            return NextResponse.json({ error: 'Clínica não encontrada' }, { status: 400 })
        }

        const { searchParams } = new URL(request.url)
        const batchId = searchParams.get('batch_id')
        if (!batchId) {
            return NextResponse.json({ error: 'batch_id é obrigatório' }, { status: 400 })
        }

        // Calcular range do batch (1 minuto) — usar string ISO para comparação
        // batchId formato: YYYY-MM-DDTHH:MM
        const batchStartISO = batchId + ':00'
        // Calcular próximo minuto
        const batchStartDate = new Date(batchId + ':00Z')
        const batchEndDate = new Date(batchStartDate.getTime() + 60000)
        const batchEndISO = batchEndDate.toISOString()

        // 1. Buscar product_ids dos movimentos de importação neste batch
        const { data: movements, error: movError } = await (supabase as any)
            .from('stock_movements')
            .select('product_id')
            .eq('clinic_id', clinicId)
            .eq('notes', 'Importado via planilha')
            .gte('created_at', batchStartISO)
            .lt('created_at', batchEndISO)

        if (movError) {
            console.error('Error finding batch movements:', movError)
            return NextResponse.json({ error: 'Erro ao buscar movimentos do batch' }, { status: 500 })
        }

        // Se não encontrou com UTC, tentar sem timezone (o DB pode estar armazenando sem TZ)
        let finalMovements = movements
        if (!finalMovements || finalMovements.length === 0) {
            // Tentar busca mais ampla — todos com notes 'Importado via planilha' no mesmo minuto
            const { data: altMovements } = await (supabase as any)
                .from('stock_movements')
                .select('product_id, created_at')
                .eq('clinic_id', clinicId)
                .or("notes.eq.Importado via planilha,notes.eq.Importação (atualização)")
            
            // Filtrar manualmente pelo batch minute
            finalMovements = (altMovements || []).filter((m: any) => {
                const mDate = new Date(m.created_at)
                const mKey = mDate.toISOString().slice(0, 16)
                return mKey === batchId
            })
        }

        if (!finalMovements || finalMovements.length === 0) {
            return NextResponse.json({ error: 'Importação não encontrada' }, { status: 404 })
        }

        const productIds = [...new Set(finalMovements.map((m: any) => m.product_id))]

        // 2. Deletar movimentos de estoque desses produtos
        const { error: delMovError } = await (supabase as any)
            .from('stock_movements')
            .delete()
            .eq('clinic_id', clinicId)
            .in('product_id', productIds)

        if (delMovError) {
            console.error('Error deleting movements:', delMovError)
            return NextResponse.json({ error: 'Erro ao excluir movimentos' }, { status: 500 })
        }

        // 3. Deletar registros de stock
        const { error: delStockError } = await (supabase as any)
            .from('stock')
            .delete()
            .eq('clinic_id', clinicId)
            .in('product_id', productIds)

        if (delStockError) {
            console.error('Error deleting stock:', delStockError)
        }

        // 4. Deletar produtos
        const { error: delProdError } = await (supabase as any)
            .from('products')
            .delete()
            .eq('clinic_id', clinicId)
            .in('id', productIds)

        if (delProdError) {
            console.error('Error deleting products:', delProdError)
        }

        return NextResponse.json({ 
            message: `${productIds.length} produto(s) da importação removidos com sucesso`,
            deleted: productIds.length
        })
    } catch (error) {
        console.error('Delete import error:', error)
        return NextResponse.json({ error: 'Erro ao excluir importação' }, { status: 500 })
    }
}
