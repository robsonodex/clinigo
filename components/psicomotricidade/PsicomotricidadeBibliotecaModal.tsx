'use client'

import { useMemo, useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    BookOpen,
    Check,
    Copy,
    Printer,
    Search,
    X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
    CATEGORIAS_OBJETIVOS_ORDEM,
    OBJETIVOS_PSICOMOTRICIDADE_CATALOGO,
} from './catalogo-objetivos'

export interface BibliotecaObjetivoViewItem {
    id?: string
    codigo: string
    categoria: string
    categoriaLetra?: string
    descricao_template: string
    versao?: number
}

interface PsicomotricidadeBibliotecaModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    items?: BibliotecaObjetivoViewItem[]
    clinicName?: string
    linkedCodes?: string[]
    onSelectObjetivo?: (item: BibliotecaObjetivoViewItem) => void
}

function resolveCategoriaLetra(codigo: string, categoria: string): string {
    const match = OBJETIVOS_PSICOMOTRICIDADE_CATALOGO.find(
        (c) => c.codigo.toUpperCase() === codigo.toUpperCase()
    )
    if (match) return match.categoriaLetra

    const catLower = categoria.toLowerCase().trim()
    const byCat = CATEGORIAS_OBJETIVOS_ORDEM.find((c) =>
        c.toLowerCase().includes(catLower)
    )
    return byCat || categoria
}

function escapeHtml(raw: string): string {
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

export function PsicomotricidadeBibliotecaModal({
    open,
    onOpenChange,
    items,
    clinicName,
    linkedCodes = [],
    onSelectObjetivo,
}: PsicomotricidadeBibliotecaModalProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategoria, setSelectedCategoria] = useState<string>('todas')
    const [copiedCode, setCopiedCode] = useState<string | null>(null)

    const normalizedItems = useMemo<BibliotecaObjetivoViewItem[]>(() => {
        if (items && items.length > 0) {
            return items.map((item) => ({
                ...item,
                categoriaLetra:
                    item.categoriaLetra ||
                    resolveCategoriaLetra(item.codigo, item.categoria),
            }))
        }

        return OBJETIVOS_PSICOMOTRICIDADE_CATALOGO.map((c) => ({
            codigo: c.codigo,
            categoria: c.categoria,
            categoriaLetra: c.categoriaLetra,
            descricao_template: c.descricao,
            versao: 1,
        }))
    }, [items])

    const linkedSet = useMemo(
        () => new Set(linkedCodes.map((c) => c.toUpperCase())),
        [linkedCodes]
    )

    const filteredItems = useMemo(() => {
        const query = searchQuery.toLowerCase().trim()
        return normalizedItems.filter((item) => {
            const matchCat =
                selectedCategoria === 'todas' ||
                item.categoriaLetra === selectedCategoria
            const matchQuery =
                !query ||
                item.codigo.toLowerCase().includes(query) ||
                item.categoria.toLowerCase().includes(query) ||
                item.descricao_template.toLowerCase().includes(query)
            return matchCat && matchQuery
        })
    }, [normalizedItems, searchQuery, selectedCategoria])

    const groupedByCategory = useMemo(() => {
        const groups = new Map<string, BibliotecaObjetivoViewItem[]>()
        for (const cat of CATEGORIAS_OBJETIVOS_ORDEM) {
            groups.set(cat, [])
        }
        for (const item of filteredItems) {
            const key = item.categoriaLetra || item.categoria || 'Outros'
            if (!groups.has(key)) groups.set(key, [])
            groups.get(key)!.push(item)
        }
        return Array.from(groups.entries()).filter(([, list]) => list.length > 0)
    }, [filteredItems])

    const handleCopy = async (item: BibliotecaObjetivoViewItem) => {
        const text = `${item.codigo} — ${item.categoria}: ${item.descricao_template}`
        try {
            await navigator.clipboard.writeText(text)
            setCopiedCode(item.codigo)
            toast.success(`Objetivo ${item.codigo} copiado`)
            setTimeout(() => {
                setCopiedCode((prev) => (prev === item.codigo ? null : prev))
            }, 1800)
        } catch {
            toast.error('Não foi possível copiar para a área de transferência')
        }
    }

    const handlePrintCatalog = () => {
        if (typeof window === 'undefined') return
        const printWindow = window.open('', '_blank', 'width=960,height=760')
        if (!printWindow) {
            toast.error('Permita pop-ups no navegador para imprimir ou salvar em PDF')
            return
        }

        const safeClinic = escapeHtml(clinicName?.trim() || 'Clínica')
        const dateStr = new Date().toLocaleDateString('pt-BR')

        const sectionsHtml = groupedByCategory
            .map(([categoryTitle, list]) => {
                const rowsHtml = list
                    .map(
                        (item) => `
                        <tr>
                            <td class="code">${escapeHtml(item.codigo)}</td>
                            <td class="desc">${escapeHtml(item.descricao_template)}</td>
                        </tr>`
                    )
                    .join('')

                return `
                    <section class="cat-section">
                        <h2>${escapeHtml(categoryTitle)} (${list.length})</h2>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 96px;">Código</th>
                                    <th>Descrição / Modelo de Critério</th>
                                </tr>
                            </thead>
                            <tbody>${rowsHtml}</tbody>
                        </table>
                    </section>`
            })
            .join('')

        printWindow.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Biblioteca de Objetivos de Psicomotricidade — ${safeClinic}</title>
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 28px; line-height: 1.45; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #155e4b; padding-bottom: 12px; margin-bottom: 20px; }
    header h1 { font-size: 18px; margin: 0 0 4px 0; color: #0f172a; }
    header p { font-size: 12px; margin: 0; color: #475569; }
    .meta { text-align: right; font-size: 11px; color: #64748b; }
    .cat-section { margin-bottom: 18px; page-break-inside: avoid; }
    .cat-section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.04em; color: #155e4b; margin: 0 0 6px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f8fafc; font-weight: 600; color: #334155; }
    td.code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; color: #155e4b; white-space: nowrap; }
    footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; display: flex; justify-content: space-between; }
    @media print { body { margin: 14mm; } }
</style>
</head>
<body>
    <header>
        <div>
            <h1>Biblioteca de Objetivos de Psicomotricidade</h1>
            <p>${safeClinic} · ${filteredItems.length} objetivo(s) exibido(s)</p>
        </div>
        <div class="meta">Emitido em ${dateStr}</div>
    </header>
    ${sectionsHtml}
    <footer>
        <span>${safeClinic}</span>
        <span>Catálogo Estruturado A–K</span>
    </footer>
</body>
</html>`)
        printWindow.document.close()
        printWindow.focus()
        setTimeout(() => {
            printWindow.print()
        }, 200)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl w-[95vw] max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden">
                <DialogHeader className="px-5 pt-5 pb-4 border-b border-slate-200 bg-slate-50/70">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pr-6">
                        <div className="space-y-1">
                            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold text-slate-900">
                                <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                                    <BookOpen className="w-4 h-4" />
                                </span>
                                Biblioteca de Objetivos de Psicomotricidade ({normalizedItems.length})
                            </DialogTitle>
                            <DialogDescription className="text-xs sm:text-sm text-slate-600">
                                Consulte o código, a categoria e a descrição completa de cada objetivo antes de vincular ao paciente.
                            </DialogDescription>
                        </div>

                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handlePrintCatalog}
                            className="min-h-[40px] px-3.5 text-xs font-medium border-slate-300 bg-white hover:bg-slate-50 shrink-0 self-start sm:self-center"
                        >
                            <Printer className="w-4 h-4 mr-1.5 text-slate-600" />
                            Imprimir / Salvar PDF
                        </Button>
                    </div>
                </DialogHeader>

                {/* Filtros de busca e categoria */}
                <div className="px-5 py-3.5 border-b border-slate-200 bg-white space-y-3">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <Input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar por código (ex.: ATR01, CMG02), categoria ou palavra-chave..."
                            className="pl-9 pr-9 h-11 text-base sm:text-sm border-slate-300"
                            style={{ fontSize: '16px' }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery('')}
                                aria-label="Limpar busca"
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <Button
                            type="button"
                            size="sm"
                            variant={selectedCategoria === 'todas' ? 'default' : 'outline'}
                            onClick={() => setSelectedCategoria('todas')}
                            className={`h-8 px-3 text-xs shrink-0 ${
                                selectedCategoria === 'todas'
                                    ? 'bg-[#155E4B] hover:bg-[#0F4C3A] text-white'
                                    : 'border-slate-200 text-slate-700'
                            }`}
                        >
                            Todas ({normalizedItems.length})
                        </Button>
                        {CATEGORIAS_OBJETIVOS_ORDEM.map((cat) => {
                            const letter = cat.split(' · ')[0]
                            const count = normalizedItems.filter(
                                (i) => i.categoriaLetra === cat
                            ).length
                            const isActive = selectedCategoria === cat
                            return (
                                <Button
                                    key={cat}
                                    type="button"
                                    size="sm"
                                    variant={isActive ? 'default' : 'outline'}
                                    title={cat}
                                    onClick={() => setSelectedCategoria(cat)}
                                    className={`h-8 px-2.5 text-xs shrink-0 ${
                                        isActive
                                            ? 'bg-[#155E4B] hover:bg-[#0F4C3A] text-white'
                                            : 'border-slate-200 text-slate-700'
                                    }`}
                                >
                                    {letter} ({count})
                                </Button>
                            )
                        })}
                    </div>

                    {selectedCategoria !== 'todas' && (
                        <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-md bg-emerald-50/70 border border-emerald-200/80 text-xs text-emerald-900">
                            <span className="font-medium truncate">
                                Categoria selecionada: {selectedCategoria}
                            </span>
                            <button
                                type="button"
                                onClick={() => setSelectedCategoria('todas')}
                                className="text-emerald-800 hover:underline font-medium shrink-0"
                            >
                                Ver todas
                            </button>
                        </div>
                    )}
                </div>

                {/* Lista agrupada de objetivos */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-slate-50/40">
                    {groupedByCategory.length === 0 ? (
                        <div className="py-12 text-center space-y-2">
                            <p className="text-sm font-medium text-slate-700">
                                Nenhum objetivo encontrado para &ldquo;{searchQuery}&rdquo;.
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('')
                                    setSelectedCategoria('todas')
                                }}
                            >
                                Limpar filtros
                            </Button>
                        </div>
                    ) : (
                        groupedByCategory.map(([categoryTitle, list]) => (
                            <div key={categoryTitle} className="space-y-2">
                                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-[#155E4B]">
                                        {categoryTitle}
                                    </h3>
                                    <span className="text-xs text-slate-500 tabular-nums">
                                        {list.length} {list.length === 1 ? 'objetivo' : 'objetivos'}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {list.map((item) => {
                                        const isLinked = linkedSet.has(item.codigo.toUpperCase())
                                        const isCopied = copiedCode === item.codigo
                                        return (
                                            <div
                                                key={item.id || item.codigo}
                                                className="rounded-lg border border-slate-200 bg-white p-3.5 flex flex-col sm:flex-row sm:items-start justify-between gap-3 hover:border-emerald-300 transition-colors"
                                            >
                                                <div className="space-y-1.5 min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <Badge
                                                            variant="outline"
                                                            className="font-mono text-xs font-semibold bg-emerald-50 text-[#155E4B] border-emerald-200"
                                                        >
                                                            {item.codigo}
                                                        </Badge>
                                                        <span className="text-xs font-medium text-slate-500">
                                                            {item.categoria}
                                                        </span>
                                                        {isLinked && (
                                                            <Badge
                                                                variant="secondary"
                                                                className="text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                                                            >
                                                                Já vinculado ao paciente
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-800 leading-relaxed">
                                                        {item.descricao_template}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleCopy(item)}
                                                        className="min-h-[38px] px-2.5 text-xs border-slate-200"
                                                        title="Copiar código e descrição"
                                                    >
                                                        {isCopied ? (
                                                            <>
                                                                <Check className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                                                                Copiado
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3.5 h-3.5 mr-1 text-slate-500" />
                                                                Copiar
                                                            </>
                                                        )}
                                                    </Button>

                                                    {onSelectObjetivo && (
                                                        <Button
                                                            type="button"
                                                            size="sm"
                                                            onClick={() => {
                                                                onSelectObjetivo(item)
                                                                onOpenChange(false)
                                                            }}
                                                            className="min-h-[38px] px-3 text-xs bg-[#155E4B] hover:bg-[#0F4C3A] text-white"
                                                        >
                                                            Usar este objetivo
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter className="px-5 py-3 border-t border-slate-200 bg-white flex flex-row items-center justify-between gap-2">
                    <span className="text-xs text-slate-500 tabular-nums">
                        Exibindo {filteredItems.length} de {normalizedItems.length} objetivos
                    </span>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="min-h-[40px]"
                    >
                        Fechar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
