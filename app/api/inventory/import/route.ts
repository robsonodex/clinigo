/**
 * POST /api/inventory/import - Import products from CSV
 * Accepts CSV text in body and creates products + stock records
 */
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

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
        const { csvData, categoryMap } = body

        if (!csvData || !Array.isArray(csvData) || csvData.length === 0) {
            return NextResponse.json({ error: 'Dados CSV vazios' }, { status: 400 })
        }

        const results = { created: 0, updated: 0, errors: [] as string[] }

        for (const row of csvData) {
            try {
                const name = row.name || row.produto || row.Nome || row.Produto
                if (!name || !name.trim()) {
                    results.errors.push(`Linha ignorada: sem nome do produto`)
                    continue
                }

                // Try to map category
                let categoryId = null
                const catName = row.category || row.categoria || row.Categoria || row.Tipo
                if (catName && categoryMap && categoryMap[catName]) {
                    categoryId = categoryMap[catName]
                }

                const quantity = parseInt(row.quantity || row.quantidade || row.Quantidade || row.Qtd || '0') || 0
                const costPrice = parseFloat(row.cost_price || row.preco || row.Preço || row['Preço Unitário'] || row.valor || '0') || 0
                const unit = row.unit || row.unidade || row.Unidade || row.Un || 'un'
                const supplier = row.supplier || row.fornecedor || row.Fornecedor || ''
                const responsible = row.responsible || row.responsavel || row.Responsável || ''
                const minStock = parseInt(row.min_stock || row.estoque_minimo || row['Estoque Mínimo'] || '0') || 0

                // Verificar se produto com mesmo nome já existe na clínica
                const { data: existingProduct } = await (supabase as any)
                    .from('products')
                    .select('id')
                    .eq('clinic_id', clinicId)
                    .ilike('name', name.trim())
                    .eq('is_active', true)
                    .maybeSingle()

                let productId: string

                if (existingProduct) {
                    // Produto já existe — atualizar estoque
                    productId = existingProduct.id

                    if (quantity > 0) {
                        // Buscar estoque atual
                        const { data: currentStock } = await (supabase as any)
                            .from('stock')
                            .select('quantity, available_quantity')
                            .eq('product_id', productId)
                            .eq('clinic_id', clinicId)
                            .maybeSingle()

                        const currentQty = currentStock?.quantity || 0
                        const currentAvail = currentStock?.available_quantity || 0

                        if (currentStock) {
                            await (supabase as any)
                                .from('stock')
                                .update({
                                    quantity: currentQty + quantity,
                                    available_quantity: currentAvail + quantity,
                                    average_cost: costPrice || undefined,
                                })
                                .eq('product_id', productId)
                                .eq('clinic_id', clinicId)
                        } else {
                            await (supabase as any)
                                .from('stock')
                                .insert({
                                    clinic_id: clinicId,
                                    product_id: productId,
                                    quantity,
                                    available_quantity: quantity,
                                    average_cost: costPrice,
                                })
                        }

                        // Registrar movimento
                        await (supabase as any)
                            .from('stock_movements')
                            .insert({
                                clinic_id: clinicId,
                                product_id: productId,
                                movement_type: 'purchase',
                                quantity,
                                unit_cost: costPrice,
                                total_cost: costPrice * quantity,
                                reference: 'Importação (atualização)',
                                notes: 'Importado via planilha',
                                moved_by: user.id,
                            })
                    }

                    results.updated++
                } else {
                    // Produto novo — criar
                    const { data: product, error: prodError } = await (supabase as any)
                        .from('products')
                        .insert({
                            clinic_id: clinicId,
                            name: name.trim(),
                            category_id: categoryId,
                            cost_price: costPrice,
                            unit,
                            min_stock: minStock,
                            reorder_point: minStock,
                            supplier,
                            responsible,
                            sku: `PRD${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(-3)}`,
                        })
                        .select()
                        .single()

                    if (prodError) {
                        results.errors.push(`Erro ao criar "${name}": ${prodError.message}`)
                        continue
                    }

                    productId = product.id

                    // Create stock record
                    await (supabase as any)
                        .from('stock')
                        .insert({
                            clinic_id: clinicId,
                            product_id: productId,
                            quantity,
                            available_quantity: quantity,
                            average_cost: costPrice,
                        })

                    // Create initial movement if quantity > 0
                    if (quantity > 0) {
                        await (supabase as any)
                            .from('stock_movements')
                            .insert({
                                clinic_id: clinicId,
                                product_id: productId,
                                movement_type: 'purchase',
                                quantity,
                                unit_cost: costPrice,
                                total_cost: costPrice * quantity,
                                reference: 'Importação inicial',
                                notes: 'Importado via planilha',
                                moved_by: user.id,
                            })
                    }

                    results.created++
                }
            } catch (rowError: any) {
                results.errors.push(`Erro: ${rowError.message}`)
            }
        }

        return NextResponse.json({
            message: `${results.created} produto(s) criado(s), ${results.updated} atualizado(s)`,
            created: results.created,
            updated: results.updated,
            errors: results.errors,
            total: csvData.length,
        })
    } catch (error) {
        console.error('Import error:', error)
        return NextResponse.json({ error: 'Erro na importação' }, { status: 500 })
    }
}
