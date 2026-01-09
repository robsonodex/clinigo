'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Package, Plus, Search, AlertTriangle, TrendingDown,
    Loader2, ArrowUpCircle, ArrowDownCircle, Box
} from 'lucide-react'
import { toast } from 'sonner'

interface Product {
    id: string
    sku: string
    name: string
    unit: string
    min_stock: number
    reorder_point: number
    cost_price: number
    sale_price: number
    category: { id: string; name: string; color: string } | null
    stock: Array<{ quantity: number; available_quantity: number; average_cost: number }>
}

interface StockSummary {
    totalProducts: number
    lowStock: number
    outOfStock: number
    totalValue: number
}

export default function InventoryPage() {
    const [loading, setLoading] = useState(true)
    const [products, setProducts] = useState<Product[]>([])
    const [summary, setSummary] = useState<StockSummary | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [showNewProduct, setShowNewProduct] = useState(false)
    const [showMovement, setShowMovement] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [saving, setSaving] = useState(false)

    // Product form
    const [productForm, setProductForm] = useState({
        name: '',
        sku: '',
        product_type: 'supply',
        unit: 'un',
        cost_price: '',
        sale_price: '',
        min_stock: '5',
        reorder_point: '10'
    })

    // Movement form
    const [movementForm, setMovementForm] = useState({
        movement_type: 'PURCHASE',
        quantity: '',
        unit_cost: '',
        notes: ''
    })

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (searchQuery) params.set('search', searchQuery)

            const [productsRes, stockRes] = await Promise.all([
                fetch(`/api/inventory/products?${params}`),
                fetch('/api/inventory/stock')
            ])

            if (productsRes.ok) {
                const data = await productsRes.json()
                setProducts(data.products || [])
            }

            if (stockRes.ok) {
                const data = await stockRes.json()
                setSummary(data.summary)
            }
        } catch (error) {
            console.error('Error fetching inventory:', error)
        } finally {
            setLoading(false)
        }
    }, [searchQuery])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleCreateProduct = async () => {
        if (!productForm.name) {
            toast.error('Nome é obrigatório')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/inventory/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...productForm,
                    cost_price: parseFloat(productForm.cost_price) || 0,
                    sale_price: parseFloat(productForm.sale_price) || 0,
                    min_stock: parseInt(productForm.min_stock) || 0,
                    reorder_point: parseInt(productForm.reorder_point) || 0
                })
            })

            if (!res.ok) {
                toast.error('Erro ao criar produto')
                return
            }

            toast.success('Produto criado!')
            setShowNewProduct(false)
            setProductForm({
                name: '', sku: '', product_type: 'supply', unit: 'un',
                cost_price: '', sale_price: '', min_stock: '5', reorder_point: '10'
            })
            fetchData()
        } catch (error) {
            toast.error('Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    const handleMovement = async () => {
        if (!selectedProduct || !movementForm.quantity) {
            toast.error('Preencha a quantidade')
            return
        }

        setSaving(true)
        try {
            const res = await fetch('/api/inventory/stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: selectedProduct.id,
                    movement_type: movementForm.movement_type,
                    quantity: parseInt(movementForm.quantity),
                    unit_cost: parseFloat(movementForm.unit_cost) || undefined,
                    notes: movementForm.notes
                })
            })

            const data = await res.json()

            if (!res.ok) {
                toast.error(data.error || 'Erro ao registrar movimento')
                return
            }

            toast.success('Movimento registrado!')
            setShowMovement(false)
            setSelectedProduct(null)
            setMovementForm({ movement_type: 'PURCHASE', quantity: '', unit_cost: '', notes: '' })
            fetchData()
        } catch (error) {
            toast.error('Erro ao salvar')
        } finally {
            setSaving(false)
        }
    }

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
    }

    const getStockStatus = (product: Product) => {
        const qty = product.stock?.[0]?.quantity || 0
        if (qty <= 0) return { label: 'Sem Estoque', color: 'bg-red-500' }
        if (qty <= (product.min_stock || 0)) return { label: 'Crítico', color: 'bg-red-500' }
        if (qty <= (product.reorder_point || 0)) return { label: 'Baixo', color: 'bg-yellow-500' }
        return { label: 'OK', color: 'bg-green-500' }
    }

    return (
        <div className="container mx-auto py-8 px-4 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Estoque</h1>
                    <p className="text-muted-foreground">Gestão de produtos e materiais</p>
                </div>

                <Dialog open={showNewProduct} onOpenChange={setShowNewProduct}>
                    <DialogTrigger asChild>
                        <Button><Plus className="h-4 w-4 mr-2" />Novo Produto</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Novo Produto</DialogTitle>
                            <DialogDescription>Adicione um produto ao estoque</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome *</Label>
                                <Input
                                    value={productForm.name}
                                    onChange={(e) => setProductForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="Nome do produto"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>SKU</Label>
                                    <Input
                                        value={productForm.sku}
                                        onChange={(e) => setProductForm(f => ({ ...f, sku: e.target.value }))}
                                        placeholder="Código"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Unidade</Label>
                                    <Select value={productForm.unit} onValueChange={(v) => setProductForm(f => ({ ...f, unit: v }))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="un">Unidade</SelectItem>
                                            <SelectItem value="cx">Caixa</SelectItem>
                                            <SelectItem value="fr">Frasco</SelectItem>
                                            <SelectItem value="ml">mL</SelectItem>
                                            <SelectItem value="g">Gramas</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Custo</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={productForm.cost_price}
                                        onChange={(e) => setProductForm(f => ({ ...f, cost_price: e.target.value }))}
                                        placeholder="0,00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Preço Venda</Label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        value={productForm.sale_price}
                                        onChange={(e) => setProductForm(f => ({ ...f, sale_price: e.target.value }))}
                                        placeholder="0,00"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Estoque Mínimo</Label>
                                    <Input
                                        type="number"
                                        value={productForm.min_stock}
                                        onChange={(e) => setProductForm(f => ({ ...f, min_stock: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Ponto de Reposição</Label>
                                    <Input
                                        type="number"
                                        value={productForm.reorder_point}
                                        onChange={(e) => setProductForm(f => ({ ...f, reorder_point: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <Button onClick={handleCreateProduct} disabled={saving} className="w-full">
                                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Criar Produto
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Produtos</CardTitle>
                            <Package className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{summary.totalProducts}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-yellow-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
                            <TrendingDown className="h-4 w-4 text-yellow-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600">{summary.lowStock}</div>
                        </CardContent>
                    </Card>
                    <Card className="border-l-4 border-l-red-500">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Sem Estoque</CardTitle>
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{summary.outOfStock}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
                            <Box className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Buscar produtos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                />
            </div>

            {/* Products List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : products.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Package className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="font-medium">Nenhum produto cadastrado</h3>
                        <p className="text-muted-foreground text-sm">Adicione seu primeiro produto</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-2">
                    {products.map((product) => {
                        const status = getStockStatus(product)
                        const qty = product.stock?.[0]?.quantity || 0

                        return (
                            <Card key={product.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="flex items-center justify-between py-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-muted rounded-lg">
                                            <Package className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-medium">{product.name}</h3>
                                            <p className="text-sm text-muted-foreground">
                                                SKU: {product.sku} • {product.unit}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-bold text-lg">{qty}</p>
                                            <p className="text-xs text-muted-foreground">
                                                Mín: {product.min_stock}
                                            </p>
                                        </div>
                                        <Badge className={status.color}>{status.label}</Badge>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSelectedProduct(product)
                                                setShowMovement(true)
                                            }}
                                        >
                                            Movimento
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Movement Dialog */}
            <Dialog open={showMovement} onOpenChange={(v) => { setShowMovement(v); if (!v) setSelectedProduct(null) }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Movimento de Estoque</DialogTitle>
                        <DialogDescription>
                            {selectedProduct?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Tipo de Movimento</Label>
                            <Select
                                value={movementForm.movement_type}
                                onValueChange={(v) => setMovementForm(f => ({ ...f, movement_type: v }))}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="PURCHASE">Compra/Entrada</SelectItem>
                                    <SelectItem value="CONSUMPTION">Consumo/Uso</SelectItem>
                                    <SelectItem value="ADJUSTMENT_IN">Ajuste +</SelectItem>
                                    <SelectItem value="ADJUSTMENT_OUT">Ajuste -</SelectItem>
                                    <SelectItem value="EXPIRED">Vencido</SelectItem>
                                    <SelectItem value="DAMAGED">Avariado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Quantidade *</Label>
                                <Input
                                    type="number"
                                    value={movementForm.quantity}
                                    onChange={(e) => setMovementForm(f => ({ ...f, quantity: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Custo Unitário</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={movementForm.unit_cost}
                                    onChange={(e) => setMovementForm(f => ({ ...f, unit_cost: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Observação</Label>
                            <Input
                                value={movementForm.notes}
                                onChange={(e) => setMovementForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="Nota fiscal, motivo, etc."
                            />
                        </div>
                        <Button onClick={handleMovement} disabled={saving} className="w-full">
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Registrar Movimento
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

