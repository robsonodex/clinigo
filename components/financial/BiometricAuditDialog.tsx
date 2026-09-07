'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Search,
  Users,
  RefreshCw,
  Loader2,
  Calendar,
  Clock,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface BiometricAuditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedMonth: string
}

export function BiometricAuditDialog({
  open,
  onOpenChange,
  selectedMonth,
}: BiometricAuditDialogProps) {
  const { toast } = useToast()
  const [search, setSearch] = useState('')
  const [verdictFilter, setVerdictFilter] = useState<'ALL' | 'CONFORME' | 'NAO_CONFORME'>('ALL')
  const [isExportingExcel, setIsExportingExcel] = useState(false)

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['biometric-audit', selectedMonth],
    queryFn: async () => {
      const res = await fetch(`/api/financial/biometric-audit?month=${selectedMonth}`)
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao carregar auditoria de biometria')
      }
      return res.json()
    },
    enabled: open,
    staleTime: 60 * 1000,
  })

  const kpis = data?.kpis || {
    total_sessions: 0,
    sessions_with_biometric: 0,
    sessions_without_biometric: 0,
    compliance_rate: 0,
    unique_patients_total: 0,
    patients_with_biometric: 0,
    patients_without_biometric: 0,
  }

  const items: any[] = data?.items || []

  // Filtragem dos itens da auditoria
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const searchLower = search.trim().toLowerCase()
      const matchesSearch =
        !searchLower ||
        item.patient_name.toLowerCase().includes(searchLower) ||
        item.doctor_name.toLowerCase().includes(searchLower) ||
        item.specialty.toLowerCase().includes(searchLower)

      const matchesVerdict =
        verdictFilter === 'ALL' || item.audit_verdict === verdictFilter

      return matchesSearch && matchesVerdict
    })
  }, [items, search, verdictFilter])

  // Exportar para Excel via dynamic import
  const handleExportExcel = async () => {
    if (items.length === 0) {
      toast({
        title: 'Sem dados para exportar',
        description: 'Nao ha registros de atendimento no mes selecionado.',
        variant: 'destructive',
      })
      return
    }

    setIsExportingExcel(true)
    try {
      const ExcelJS = (await import('exceljs')).default
      const wb = new ExcelJS.Workbook()
      wb.creator = 'CliniGo'
      wb.created = new Date()

      const ws = wb.addWorksheet('Auditoria de Biometria')

      // Cabecalho Principal
      ws.mergeCells('A1:H1')
      const titleCell = ws.getCell('A1')
      titleCell.value = `RELATORIO DE AUDITORIA DE BIOMETRIA FACIAL — COMPETENCIA ${selectedMonth}`
      titleCell.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } }
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
      ws.getRow(1).height = 28

      // Resumo Executivo / KPIs
      ws.getCell('A3').value = 'Total de Atendimentos Realizados:'
      ws.getCell('B3').value = kpis.total_sessions
      ws.getCell('A3').font = { bold: true }

      ws.getCell('D3').value = 'Indice de Conformidade Biometrica:'
      ws.getCell('E3').value = `${kpis.compliance_rate}%`
      ws.getCell('D3').font = { bold: true }

      ws.getCell('A4').value = 'Com Biometria Facial Cadastrada:'
      ws.getCell('B4').value = kpis.sessions_with_biometric
      ws.getCell('A4').font = { bold: true }

      ws.getCell('D4').value = 'Sem Biometria (Inconformes):'
      ws.getCell('E4').value = kpis.sessions_without_biometric
      ws.getCell('D4').font = { bold: true }

      // Cabecalhos da Tabela
      const startRow = 6
      const headers = [
        'Data',
        'Horario',
        'Paciente',
        'Telefone',
        'Profissional / Especialidade',
        'Status Presenca',
        'Biometria Facial',
        'Pessoas Cadastradas',
      ]

      const headerRow = ws.getRow(startRow)
      headers.forEach((h, idx) => {
        const cell = headerRow.getCell(idx + 1)
        cell.value = h
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      })
      headerRow.height = 24

      // Insercao das Linhas
      items.forEach((item, index) => {
        const row = ws.getRow(startRow + 1 + index)
        const [y, m, d] = (item.date || '').split('-')
        const formattedDate = d && m && y ? `${d}/${m}/${y}` : item.date

        row.getCell(1).value = formattedDate
        row.getCell(2).value = item.time
        row.getCell(3).value = item.patient_name
        row.getCell(4).value = item.patient_phone
        row.getCell(5).value = `${item.doctor_name} (${item.specialty || 'Geral'})`
        row.getCell(6).value = item.session_status || item.appointment_status
        row.getCell(7).value = item.has_biometric ? 'CONFORME (Cadastrada)' : 'INCONFORME (Nao Cadastrada)'
        row.getCell(8).value = item.biometric_types.join(', ') || 'Nenhum'

        // Estilo condicional para status biometrico
        if (item.has_biometric) {
          row.getCell(7).font = { bold: true, color: { argb: 'FF15803D' } }
        } else {
          row.getCell(7).font = { bold: true, color: { argb: 'FFB91C1C' } }
          row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } }
        }

        if (index % 2 === 1) {
          for (let c = 1; c <= 8; c++) {
            if (c !== 7 || item.has_biometric) {
              row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
            }
          }
        }
      })

      ws.getColumn(1).width = 14
      ws.getColumn(2).width = 10
      ws.getColumn(3).width = 30
      ws.getColumn(4).width = 18
      ws.getColumn(5).width = 32
      ws.getColumn(6).width = 18
      ws.getColumn(7).width = 28
      ws.getColumn(8).width = 25

      const buffer = await wb.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Auditoria_Biometria_${selectedMonth}.xlsx`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: 'Relatorio exportado com sucesso',
        description: `Planilha gerada com ${items.length} registros auditados.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao exportar planilha',
        description: err.message || 'Falha ao gerar arquivo Excel.',
        variant: 'destructive',
      })
    } finally {
      setIsExportingExcel(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Cabecalho do Modal */}
        <DialogHeader className="p-4 sm:p-6 pb-4 border-b border-border bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-300/40">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
                  Auditoria de Biometria Facial
                  <Badge variant="outline" className="text-xs bg-background font-semibold">
                    {selectedMonth}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Conferencia de presencas e registros biometricos para liberacao segura de repasses e auditoria de convenios
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-10 px-3 text-xs gap-1.5 min-h-[44px]"
                onClick={() => refetch()}
                disabled={isLoading || isRefetching}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', (isLoading || isRefetching) && 'animate-spin')} />
                <span>Atualizar</span>
              </Button>
              <Button
                size="sm"
                className="h-10 px-3.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px]"
                onClick={handleExportExcel}
                disabled={isExportingExcel || items.length === 0}
              >
                {isExportingExcel ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                <span>Exportar Excel</span>
              </Button>
            </div>
          </div>

          {/* Cards de KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-border shadow-xs">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Atendimentos Auditados
              </span>
              <span className="text-xl font-bold text-foreground mt-0.5 block">
                {kpis.total_sessions}
              </span>
            </div>

            <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/80 dark:border-emerald-800/40 shadow-xs">
              <span className="text-[11px] text-emerald-800 dark:text-emerald-300 block font-medium">
                Com Biometria (Conforme)
              </span>
              <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 block">
                {kpis.sessions_with_biometric}
              </span>
            </div>

            <div className="p-3 bg-rose-50/60 dark:bg-rose-950/20 rounded-xl border border-rose-200/80 dark:border-rose-800/40 shadow-xs">
              <span className="text-[11px] text-rose-800 dark:text-rose-300 block font-medium">
                Sem Biometria (Pendente)
              </span>
              <span className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-0.5 block">
                {kpis.sessions_without_biometric}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-border shadow-xs">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Taxa de Conformidade
              </span>
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                {kpis.compliance_rate}%
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Barra de Filtros e Busca */}
        <div className="p-4 border-b border-border bg-background flex flex-col sm:flex-row items-center gap-2.5">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Buscar por paciente, profissional ou especialidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs rounded-xl"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <Select
              value={verdictFilter}
              onValueChange={(val: any) => setVerdictFilter(val)}
            >
              <SelectTrigger className="h-10 text-xs rounded-xl w-full sm:w-[220px]">
                <SelectValue placeholder="Status da Biometria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Registros</SelectItem>
                <SelectItem value="CONFORME">Apenas Conformes (Com Biometria)</SelectItem>
                <SelectItem value="NAO_CONFORME">Apenas Inconformes (Sem Biometria)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabela com Scroll Suave */}
        <div className="flex-1 overflow-y-auto p-4 max-h-[50vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs">Auditando presencas e registros biometricos...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-xl p-8 bg-slate-50/40 dark:bg-slate-900/20">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold text-foreground">Nenhum registro encontrado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tente ajustar os filtros ou a busca acima.
              </p>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden shadow-xs">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900/60">
                  <TableRow>
                    <TableHead className="text-xs font-semibold">Data / Horario</TableHead>
                    <TableHead className="text-xs font-semibold">Paciente</TableHead>
                    <TableHead className="text-xs font-semibold">Profissional</TableHead>
                    <TableHead className="text-xs font-semibold">Status Sessao</TableHead>
                    <TableHead className="text-xs font-semibold">Auditoria Biometrica</TableHead>
                    <TableHead className="text-xs font-semibold">Vinculos Cadastrados</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => {
                    const [y, m, d] = (item.date || '').split('-')
                    const formattedDate = d && m && y ? `${d}/${m}/${y}` : item.date

                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40">
                        <TableCell className="text-xs font-medium">
                          <div>{formattedDate}</div>
                          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {item.time}
                          </div>
                        </TableCell>

                        <TableCell className="text-xs">
                          <div className="font-semibold text-foreground">{item.patient_name}</div>
                          {item.patient_phone && (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              {item.patient_phone}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-xs">
                          <div className="font-medium text-foreground">{item.doctor_name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {item.specialty || 'Geral'}
                          </div>
                        </TableCell>

                        <TableCell className="text-xs">
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] font-semibold px-2 py-0.5',
                              item.session_status === 'Presente'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            )}
                          >
                            {item.session_status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs">
                          {item.has_biometric ? (
                            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Conforme ({item.biometrics_count} face{item.biometrics_count > 1 ? 's' : ''})</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 font-semibold text-[11px]">
                              <XCircle className="w-4 h-4 text-rose-600" />
                              <span>Sem Biometria Facial</span>
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-xs">
                          <div className="flex flex-wrap gap-1">
                            {item.biometric_types.length > 0 ? (
                              item.biometric_types.map((type: string, idx: number) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-[10px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                                >
                                  {type}
                                </Badge>
                              ))
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">
                                Nenhum
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
