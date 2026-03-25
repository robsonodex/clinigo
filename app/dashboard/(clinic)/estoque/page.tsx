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
    Loader2, ArrowUpCircle, ArrowDownCircle, Box, Upload, History, Trash2
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

interface ImportBatch {
    batch_id: string
    date: string
    product_count: number
    total_value: number
    products: Array<{ name: string; quantity: number; cost: number }>
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
        reorder_point: '10',
        supplier: '',
        responsible: '',
    })

    // Import state
    const [showImport, setShowImport] = useState(false)
    const [importData, setImportData] = useState<any[]>([])
    const [importing, setImporting] = useState(false)

    // Import history state
    const [imports, setImports] = useState<ImportBatch[]>([])
    const [loadingImports, setLoadingImports] = useState(false)
    const [deletingBatch, setDeletingBatch] = useState<string | null>(null)

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
                cost_price: '', sale_price: '', min_stock: '5', reorder_point: '10',
                supplier: '', responsible: '',
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

    const fetchImports = async () => {
        setLoadingImports(true)
        try {
            const res = await fetch('/api/inventory/imports')
            if (res.ok) {
                const data = await res.json()
                setImports(data.imports || [])
            }
        } catch (error) {
            console.error('Error fetching imports:', error)
        } finally {
            setLoadingImports(false)
        }
    }

    const handleDeleteImport = async (batchId: string) => {
        if (!confirm('Tem certeza que deseja excluir toda esta importação? Todos os produtos serão removidos permanentemente.')) return
        setDeletingBatch(batchId)
        try {
            const res = await fetch(`/api/inventory/imports?batch_id=${encodeURIComponent(batchId)}`, {
                method: 'DELETE'
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error)
            toast.success(data.message)
            fetchImports()
            fetchData()
        } catch (err: any) {
            toast.error(err.message || 'Erro ao excluir importação')
        } finally {
            setDeletingBatch(null)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
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
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Fornecedor</Label>
                                    <Input
                                        value={productForm.supplier}
                                        onChange={(e) => setProductForm(f => ({ ...f, supplier: e.target.value }))}
                                        placeholder="Nome do fornecedor"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Responsável</Label>
                                    <Input
                                        value={productForm.responsible}
                                        onChange={(e) => setProductForm(f => ({ ...f, responsible: e.target.value }))}
                                        placeholder="Nome do responsável"
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

                {/* Botão importar */}
                <Button variant="outline" onClick={() => setShowImport(true)}>
                    <Upload className="h-4 w-4 mr-2" />Importar Planilha
                </Button>
                <Button variant="outline" onClick={() => { fetchImports() }}>
                    <History className="h-4 w-4 mr-2" />Importações
                </Button>
            </div>

            {/* Dialog de importação CSV */}
            <Dialog open={showImport} onOpenChange={setShowImport}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Importar Produtos via CSV</DialogTitle>
                        <DialogDescription>
                            Selecione um arquivo CSV com as colunas: Nome, Quantidade, Preço, Unidade, Fornecedor, Responsável
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <Input
                            type="file"
                            accept=".csv,.txt"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                const reader = new FileReader()
                                reader.onload = (ev) => {
                                    const text = ev.target?.result as string
                                    const lines = text.split('\n').filter(l => l.trim())
                                    if (lines.length < 2) {
                                        toast.error('Arquivo vazio ou sem dados')
                                        return
                                    }
                                    const headers = lines[0].split(/[;,\t]/).map(h => h.trim().replace(/"/g, ''))
                                    const rows = lines.slice(1).map(line => {
                                        const values = line.split(/[;,\t]/).map(v => v.trim().replace(/"/g, ''))
                                        const obj: any = {}
                                        headers.forEach((h, i) => { obj[h] = values[i] || '' })
                                        return obj
                                    }).filter(r => {
                                        const name = r.name || r.produto || r.Nome || r.Produto || r.PRODUTO
                                        return name && name.trim()
                                    })
                                    setImportData(rows)
                                    toast.success(`${rows.length} produto(s) encontrado(s)`)
                                }
                                reader.readAsText(file, 'UTF-8')
                            }}
                        />
                        {importData.length > 0 && (
                            <div className="border rounded p-3 max-h-48 overflow-y-auto text-sm">
                                <p className="font-semibold mb-2">{importData.length} produto(s) para importar:</p>
                                {importData.slice(0, 10).map((row, i) => (
                                    <p key={i} className="text-muted-foreground truncate">
                                        {row.name || row.produto || row.Nome || row.Produto || row.PRODUTO}
                                    </p>
                                ))}
                                {importData.length > 10 && <p className="text-muted-foreground">...e mais {importData.length - 10}</p>}
                            </div>
                        )}
                        <Button
                            className="w-full"
                            disabled={importData.length === 0 || importing}
                            onClick={async () => {
                                setImporting(true)
                                try {
                                    const res = await fetch('/api/inventory/import', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ csvData: importData })
                                    })
                                    const json = await res.json()
                                    if (json.error) throw new Error(json.error)
                                    toast.success(json.message)
                                    if (json.errors?.length > 0) {
                                        toast.warning(`${json.errors.length} erro(s) durante importação`)
                                    }
                                    setShowImport(false)
                                    setImportData([])
                                    fetchData()
                                } catch (err: any) {
                                    toast.error(err.message || 'Erro na importação')
                                } finally {
                                    setImporting(false)
                                }
                            }}
                        >
                            {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Importar {importData.length} Produto(s)
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

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

            {/* Import History Dialog */}
            <Dialog open={imports.length > 0} onOpenChange={(v) => { if (!v) setImports([]) }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5" />
                            Histórico de Importações
                        </DialogTitle>
                        <DialogDescription>
                            Visualize e exclua importações de planilha realizadas
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto py-2">
                        {loadingImports ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : imports.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <Upload className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>Nenhuma importação encontrada</p>
                            </div>
                        ) : (
                            imports.map((batch) => (
                                <Card key={batch.batch_id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="py-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">
                                                    {formatDate(batch.date)}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {batch.product_count} produto(s) • {formatCurrency(batch.total_value)}
                                                </p>
                                                <div className="mt-1 text-xs text-muted-foreground">
                                                    {batch.products.slice(0, 3).map((p, i) => (
                                                        <span key={i}>{p.name}{i < Math.min(batch.products.length, 3) - 1 ? ', ' : ''}</span>
                                                    ))}
                                                    {batch.products.length > 3 && <span> ...e mais {batch.products.length - 3}</span>}
                                                </div>
                                            </div>
                                            <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteImport(batch.batch_id)}
                                                disabled={deletingBatch === batch.batch_id}
                                            >
                                                {deletingBatch === batch.batch_id
                                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                                    : <Trash2 className="h-4 w-4" />}
                                                <span className="ml-1">Excluir</span>
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

