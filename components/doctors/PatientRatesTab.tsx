'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  Users,
  TrendingUp,
  Search,
  Download,
  Upload,
  Save,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Check,
  Plus,
  ArrowRight,
  ShieldAlert,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import ExcelJS from 'exceljs';

export interface PatientRateItem {
  patient_id: string;
  patient_name: string;
  has_override: boolean;
  override_id: string | null;
  rate_type: 'FIXED' | 'PERCENTAGE';
  rate_value: number;
  fixed_value: number | null;
  percentage: number | null;
  source: 'PATIENT_OVERRIDE' | 'CONTRACT_DEFAULT';
  notes: string | null;
  updated_at: string | null;
  total_appointments: number;
  last_appointment_date: string | null;
}

export interface PatientRatesResponse {
  success: boolean;
  data: PatientRateItem[];
  statistics: {
    total_patients: number;
    custom_count: number;
    default_count: number;
    average_rate: number;
    max_rate: { patient_name: string; value: number; rate_type: string } | null;
    min_rate: { patient_name: string; value: number; rate_type: string } | null;
    contract_default: {
      percentage_private: number;
      percentage_insurance: number;
      contract_type: string;
    };
  };
}

interface PatientRatesTabProps {
  doctorId: string;
  doctorName?: string;
}

export function PatientRatesTab({ doctorId, doctorName = 'Profissional' }: PatientRatesTabProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de filtro e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'CUSTOM' | 'DEFAULT'>('ALL');
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(false);

  // Estado de edições inline: { [patient_id]: { rate_type, value, dirty: boolean } }
  const [pendingEdits, setPendingEdits] = useState<
    Record<string, { rate_type: 'FIXED' | 'PERCENTAGE'; value: number }>
  >({});

  // Seleção múltipla
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRateType, setBulkRateType] = useState<'FIXED' | 'PERCENTAGE'>('PERCENTAGE');
  const [bulkValue, setBulkValue] = useState<number>(70);

  // Drawer de histórico
  const [historyPatient, setHistoryPatient] = useState<PatientRateItem | null>(null);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Modal de confirmação para restaurar padrão
  const [restoreConfirmPatient, setRestoreConfirmPatient] = useState<PatientRateItem | null>(null);

  // Importação Excel
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importDiff, setImportDiff] = useState<any[]>([]);
  const [isImporting, setIsImporting] = useState(false);

  // Modal de adicionar novo paciente
  const [addPatientModalOpen, setAddPatientModalOpen] = useState(false);
  const [newPatientSearch, setNewPatientSearch] = useState('');
  const [selectedNewPatient, setSelectedNewPatient] = useState<any>(null);
  const [newPatientRateType, setNewPatientRateType] = useState<'FIXED' | 'PERCENTAGE'>('PERCENTAGE');
  const [newPatientValue, setNewPatientValue] = useState<number>(70);

  // 1. Consulta principal de dados
  const { data: responseData, isLoading, refetch } = useQuery<PatientRatesResponse>({
    queryKey: ['doctor-patient-rates', doctorId],
    queryFn: async () => {
      const res = await fetch(`/api/doctor-patient-rates?doctorId=${doctorId}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao carregar taxas');
      }
      return res.json();
    },
  });

  const patientRates = responseData?.data || [];
  const stats = responseData?.statistics;

  // Pacientes filtrados
  const filteredRates = useMemo(() => {
    return patientRates.filter((item) => {
      const matchesSearch = item.patient_name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (filterType === 'CUSTOM') return item.has_override;
      if (filterType === 'DEFAULT') return !item.has_override;
      return true;
    });
  }, [patientRates, searchTerm, filterType]);

  // Contagem de linhas pendentes de salvamento
  const pendingCount = Object.keys(pendingEdits).length;

  // Manipulador de edição inline
  const handleInlineChange = (
    patientId: string,
    field: 'rate_type' | 'value',
    val: any,
    currentOriginal: PatientRateItem
  ) => {
    setPendingEdits((prev) => {
      const existing = prev[patientId] || {
        rate_type: currentOriginal.rate_type,
        value: currentOriginal.rate_value,
      };

      const next = {
        ...existing,
        [field]: field === 'value' ? (isNaN(Number(val)) ? 0 : Number(val)) : val,
      };

      // Se voltou ao valor original exatamente, remove da pendência
      if (
        next.rate_type === currentOriginal.rate_type &&
        next.value === currentOriginal.rate_value
      ) {
        const copy = { ...prev };
        delete copy[patientId];
        return copy;
      }

      return {
        ...prev,
        [patientId]: next,
      };
    });
  };

  // 2. Mutações para salvar
  const saveMutation = useMutation({
    mutationFn: async (payload: {
      patient_id: string;
      rate_type: 'FIXED' | 'PERCENTAGE';
      value: number;
    }) => {
      const res = await fetch('/api/doctor-patient-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctorId,
          patient_id: payload.patient_id,
          rate_type: payload.rate_type,
          fixed_value: payload.rate_type === 'FIXED' ? payload.value : null,
          percentage: payload.rate_type === 'PERCENTAGE' ? payload.value : null,
          notify_whatsapp: notifyWhatsApp,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar valor do paciente');
      }
      return res.json();
    },
    onSuccess: (_, vars) => {
      toast.success('Valor atualizado com sucesso!');
      setPendingEdits((prev) => {
        const copy = { ...prev };
        delete copy[vars.patient_id];
        return copy;
      });
      queryClient.invalidateQueries({ queryKey: ['doctor-patient-rates', doctorId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao salvar');
    },
  });

  // Salvar em lote todas as alterações inline pendentes
  const saveBatchMutation = useMutation({
    mutationFn: async () => {
      const rates = Object.entries(pendingEdits).map(([patient_id, edit]) => ({
        patient_id,
        rate_type: edit.rate_type,
        value: edit.value,
      }));

      const res = await fetch('/api/doctor-patient-rates/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctorId,
          rates,
          notify_whatsapp: notifyWhatsApp,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar em lote');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`${data.processed} valores atualizados com sucesso!`);
      setPendingEdits({});
      queryClient.invalidateQueries({ queryKey: ['doctor-patient-rates', doctorId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao salvar em lote');
    },
  });

  // Soft delete (restaurar padrão do contrato)
  const deleteMutation = useMutation({
    mutationFn: async (overrideId: string) => {
      const res = await fetch(`/api/doctor-patient-rates/${overrideId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao restaurar padrão');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Valor personalizado removido. O paciente voltou a seguir o contrato padrão.');
      setRestoreConfirmPatient(null);
      queryClient.invalidateQueries({ queryKey: ['doctor-patient-rates', doctorId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Falha ao restaurar');
    },
  });

  // 3. Consulta de Histórico para o Drawer
  const openHistoryDrawer = async (item: PatientRateItem) => {
    setHistoryPatient(item);
    setLoadingHistory(true);
    try {
      const targetId = item.override_id || item.patient_id;
      const res = await fetch(`/api/doctor-patient-rates/${targetId}/history`);
      const json = await res.json();
      if (json.success) {
        setHistoryList(json.data || []);
      }
    } catch {
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoadingHistory(false);
    }
  };

  // 4. Exportação de Planilha Excel via ExcelJS
  const handleExportExcel = async () => {
    try {
      toast.info('Gerando planilha Excel...');
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CliniGo Gestão Clínica';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('Valores por Paciente');

      worksheet.columns = [
        { header: 'ID do Paciente (Obrigatório)', key: 'patient_id', width: 38 },
        { header: 'Nome do Paciente', key: 'patient_name', width: 35 },
        { header: 'Tipo (PERCENTAGE ou FIXED)', key: 'rate_type', width: 25 },
        { header: 'Valor (Ex: 70 para 70% ou 150.00 para R$)', key: 'value', width: 28 },
        { header: 'Origem Atual', key: 'source', width: 20 },
      ];

      // Estilizar cabeçalho
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F766E' }, // Teal 700 elegante
      };

      patientRates.forEach((item) => {
        worksheet.addRow({
          patient_id: item.patient_id,
          patient_name: item.patient_name,
          rate_type: item.rate_type,
          value: item.rate_value,
          source: item.has_override ? 'Personalizado' : 'Contrato Padrão',
        });
      });

      // Gerar buffer e download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `repasse_pacientes_${doctorName.toLowerCase().replace(/\s+/g, '_')}.xlsx`;
      anchor.click();
      window.URL.revokeObjectURL(url);
      toast.success('Planilha baixada com sucesso!');
    } catch (err: any) {
      console.error('Erro ao exportar Excel:', err);
      toast.error('Falha ao gerar planilha Excel');
    }
  };

  // 5. Importação e Prévia com Diff
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('Nenhuma aba encontrada na planilha');
      }

      const rows: Array<{
        patient_id: string;
        patient_name: string;
        rate_type: 'FIXED' | 'PERCENTAGE';
        value: number;
      }> = [];

      // Mapear cabeçalhos da linha 1
      const headerRow = worksheet.getRow(1);
      let idColIdx = 1;
      let nameColIdx = 2;
      let typeColIdx = 3;
      let valColIdx = 4;

      headerRow.eachCell((cell, colNum) => {
        const val = String(cell.value || '').toLowerCase();
        if (val.includes('id') && val.includes('paciente')) idColIdx = colNum;
        if (val.includes('nome')) nameColIdx = colNum;
        if (val.includes('tipo')) typeColIdx = colNum;
        if (val.includes('valor')) valColIdx = colNum;
      });

      worksheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return; // Ignora cabeçalho
        const patId = String(row.getCell(idColIdx).value || '').trim();
        const patName = String(row.getCell(nameColIdx).value || '').trim();
        const rawType = String(row.getCell(typeColIdx).value || '').trim().toUpperCase();
        const rawVal = row.getCell(valColIdx).value;

        if (!patId) return;

        let rateType: 'FIXED' | 'PERCENTAGE' =
          rawType.includes('FIXED') || rawType.includes('FIXO') ? 'FIXED' : 'PERCENTAGE';

        let numVal = 0;
        if (typeof rawVal === 'number') {
          numVal = rawVal;
        } else if (rawVal) {
          const str = String(rawVal)
            .replace('R$', '')
            .replace('%', '')
            .replace(',', '.')
            .trim();
          numVal = parseFloat(str) || 0;
        }

        rows.push({
          patient_id: patId,
          patient_name: patName || 'Paciente',
          rate_type: rateType,
          value: numVal,
        });
      });

      if (rows.length === 0) {
        throw new Error('Nenhuma linha de paciente válida foi encontrada na planilha');
      }

      // Montar diff comparando com patientRates atual
      const currentMap = new Map<string, PatientRateItem>();
      patientRates.forEach((p) => currentMap.set(p.patient_id, p));

      const diffList = rows.map((r) => {
        const current = currentMap.get(r.patient_id);
        const isNew = !current;
        const isChanged =
          !current ||
          current.rate_type !== r.rate_type ||
          current.rate_value !== r.value;

        return {
          ...r,
          patient_name: current?.patient_name || r.patient_name,
          current_rate_type: current?.rate_type || null,
          current_value: current?.rate_value ?? null,
          isNew,
          isChanged,
        };
      });

      setImportDiff(diffList);
      setImportModalOpen(true);
    } catch (err: any) {
      console.error('Erro ao ler planilha:', err);
      toast.error(err.message || 'Falha ao processar arquivo Excel');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirmar importação em lote
  const handleConfirmImport = async () => {
    try {
      setIsImporting(true);
      const ratesToApply = importDiff
        .filter((item) => item.isChanged)
        .map((item) => ({
          patient_id: item.patient_id,
          rate_type: item.rate_type,
          value: item.value,
        }));

      if (ratesToApply.length === 0) {
        toast.info('Nenhuma alteração detectada para importar');
        setImportModalOpen(false);
        return;
      }

      const res = await fetch('/api/doctor-patient-rates/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctorId,
          rates: ratesToApply,
          notify_whatsapp: notifyWhatsApp,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro na importação em lote');
      }

      toast.success(`${json.processed} pacientes importados com sucesso!`);
      setImportModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['doctor-patient-rates', doctorId] });
    } catch (err: any) {
      toast.error(err.message || 'Falha ao aplicar importação');
    } finally {
      setIsImporting(false);
    }
  };

  // Aplicação de valor em lote para selecionados
  const handleApplyBulkValue = () => {
    if (selectedPatientIds.length === 0) return;

    setPendingEdits((prev) => {
      const next = { ...prev };
      selectedPatientIds.forEach((id) => {
        next[id] = {
          rate_type: bulkRateType,
          value: bulkValue,
        };
      });
      return next;
    });

    setBulkModalOpen(false);
    setSelectedPatientIds([]);
    toast.info(
      `${selectedPatientIds.length} pacientes atualizados localmente. Clique em "Salvar alterações" para confirmar.`
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 1. TOPO: TÍTULO, BADGE NOVO E RESUMO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent p-5 rounded-2xl border border-emerald-500/20">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-foreground">
              Valores por Paciente (Overrides de Repasse)
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Defina repasses específicos para cada paciente deste profissional. Valores
            customizados prevalecem sobre o contrato geral.
          </p>
        </div>

        {/* Toggle WhatsApp e Botão Salvar Geral */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-background/80 px-3 py-2 rounded-xl border border-border shadow-2xs">
            <Switch
              id="notify-whatsapp-toggle"
              checked={notifyWhatsApp}
              onCheckedChange={setNotifyWhatsApp}
            />
            <Label htmlFor="notify-whatsapp-toggle" className="text-xs font-medium cursor-pointer">
              Avisar profissional no WhatsApp
            </Label>
          </div>

          {pendingCount > 0 && (
            <Button
              onClick={() => saveBatchMutation.mutate()}
              disabled={saveBatchMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-md min-h-[44px] px-4"
            >
              {saveBatchMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>Salvar alterações ({pendingCount})</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. OS 3 CARDS DE INSIGHT COM EFEITO UAU */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Valor Médio de Repasse */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Média de Repasse
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-foreground">
              {stats?.average_rate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <span>Contrato padrão geral:</span>
              <strong className="text-foreground">
                {stats?.contract_default?.percentage_private || 70}%
              </strong>
            </p>
          </div>
        </div>

        {/* Card 2: Customizados vs Padrão */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Personalizados vs Padrão
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-extrabold text-foreground">
              {stats?.custom_count || 0}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                de {stats?.total_patients || 0} pacientes
              </span>
            </div>
            {/* Barra de progresso visual */}
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full mt-2.5 overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${
                    stats?.total_patients
                      ? ((stats.custom_count || 0) / stats.total_patients) * 100
                      : 0
                  }%`,
                }}
              />
              <div
                className="bg-slate-300 dark:bg-slate-700 h-full transition-all duration-500"
                style={{
                  width: `${
                    stats?.total_patients
                      ? ((stats.default_count || 0) / stats.total_patients) * 100
                      : 100
                  }%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground mt-1.5 font-medium">
              <span className="text-emerald-600 dark:text-emerald-400">
                ● {stats?.custom_count || 0} personalizados
              </span>
              <span>● {stats?.default_count || 0} contrato padrão</span>
            </div>
          </div>
        </div>

        {/* Card 3: Extremos (Maior & Menor) */}
        <div className="bg-card p-5 rounded-2xl border border-border shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Extremos de Repasse
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 space-y-1.5 text-xs">
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg">
              <span className="text-muted-foreground truncate max-w-[130px]" title={stats?.max_rate?.patient_name}>
                Maior: <strong>{stats?.max_rate?.patient_name || 'Nenhum'}</strong>
              </span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                {stats?.max_rate
                  ? stats.max_rate.rate_type === 'FIXED'
                    ? `R$ ${stats.max_rate.value.toFixed(2)}`
                    : `${stats.max_rate.value}%`
                  : '-'}
              </strong>
            </div>
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg">
              <span className="text-muted-foreground truncate max-w-[130px]" title={stats?.min_rate?.patient_name}>
                Menor: <strong>{stats?.min_rate?.patient_name || 'Nenhum'}</strong>
              </span>
              <strong className="text-blue-600 dark:text-blue-400 font-bold">
                {stats?.min_rate
                  ? stats.min_rate.rate_type === 'FIXED'
                    ? `R$ ${stats.min_rate.value.toFixed(2)}`
                    : `${stats.min_rate.value}%`
                  : '-'}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BARRA DE FERRAMENTAS: BUSCA, FILTROS E IMPORT/EXPORT */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-2xs">
        {/* Busca e Filtros Rápidos */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar paciente por nome..."
              className="pl-9 h-11 text-base rounded-xl"
            />
          </div>

          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl">
            <Button
              size="sm"
              variant={filterType === 'ALL' ? 'default' : 'ghost'}
              onClick={() => setFilterType('ALL')}
              className="text-xs h-9 px-3 rounded-lg min-h-[36px]"
            >
              Todos ({patientRates.length})
            </Button>
            <Button
              size="sm"
              variant={filterType === 'CUSTOM' ? 'default' : 'ghost'}
              onClick={() => setFilterType('CUSTOM')}
              className="text-xs h-9 px-3 rounded-lg min-h-[36px] text-emerald-600 dark:text-emerald-400"
            >
              Personalizados ({stats?.custom_count || 0})
            </Button>
            <Button
              size="sm"
              variant={filterType === 'DEFAULT' ? 'default' : 'ghost'}
              onClick={() => setFilterType('DEFAULT')}
              className="text-xs h-9 px-3 rounded-lg min-h-[36px]"
            >
              Padrão ({stats?.default_count || 0})
            </Button>
          </div>
        </div>

        {/* Ações: Exportar Excel, Importar Excel e Seleção */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            className="gap-1.5 h-11 min-h-[44px] rounded-xl px-3 text-xs font-semibold"
            title="Baixar planilha com pacientes e repasses vigentes"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Baixar Modelo (.xlsx)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="gap-1.5 h-11 min-h-[44px] rounded-xl px-3 text-xs font-semibold"
            title="Importar planilha de repasses com pré-visualização de diff"
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-blue-600" />
            )}
            <span>Importar Planilha</span>
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".xlsx, .xls"
            className="hidden"
          />

          {selectedPatientIds.length > 0 && (
            <Button
              size="sm"
              onClick={() => setBulkModalOpen(true)}
              className="bg-primary text-primary-foreground font-semibold gap-1.5 h-11 min-h-[44px] rounded-xl px-3 text-xs"
            >
              <span>Editar em Lote ({selectedPatientIds.length})</span>
            </Button>
          )}
        </div>
      </div>

      {/* 4. TABELA ESTILO PLANILHA COM EDIÇÃO INLINE */}
      <div className="bg-card rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th className="py-3.5 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    checked={
                      filteredRates.length > 0 &&
                      selectedPatientIds.length === filteredRates.length
                    }
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPatientIds(filteredRates.map((p) => p.patient_id));
                      } else {
                        setSelectedPatientIds([]);
                      }
                    }}
                  />
                </th>
                <th className="py-3.5 px-4 min-w-[200px]">Paciente</th>
                <th className="py-3.5 px-4 min-w-[130px]">Tipo de Repasse</th>
                <th className="py-3.5 px-4 min-w-[140px]">Valor Aplicado</th>
                <th className="py-3.5 px-4 min-w-[150px]">Origem da Regra</th>
                <th className="py-3.5 px-4 text-right min-w-[140px]">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Carregando pacientes e repasses...</span>
                  </td>
                </tr>
              ) : filteredRates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold text-foreground">Nenhum paciente encontrado</p>
                    <p className="text-xs mt-1">
                      {searchTerm
                        ? 'Tente alterar os termos de busca'
                        : 'Este profissional ainda não tem pacientes atendidos nesta clínica.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRates.map((item) => {
                  const isSelected = selectedPatientIds.includes(item.patient_id);
                  const pending = pendingEdits[item.patient_id];
                  const isDirty = Boolean(pending);

                  const displayType = pending ? pending.rate_type : item.rate_type;
                  const displayValue = pending ? pending.value : item.rate_value;

                  return (
                    <tr
                      key={item.patient_id}
                      className={`transition-colors hover:bg-muted/20 ${
                        isDirty
                          ? 'bg-amber-500/5 dark:bg-amber-500/10'
                          : isSelected
                          ? 'bg-primary/5'
                          : ''
                      }`}
                    >
                      {/* Checkbox de Seleção */}
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPatientIds((prev) => [...prev, item.patient_id]);
                            } else {
                              setSelectedPatientIds((prev) =>
                                prev.filter((id) => id !== item.patient_id)
                              );
                            }
                          }}
                        />
                      </td>

                      {/* Nome do Paciente e Consultas */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-foreground">
                          {item.patient_name}
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span>
                            {item.total_appointments}{' '}
                            {item.total_appointments === 1 ? 'consulta' : 'consultas'}
                          </span>
                          {item.last_appointment_date && (
                            <>
                              <span>•</span>
                              <span>Último: {item.last_appointment_date}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Tipo de Repasse: FIXED ou PERCENTAGE */}
                      <td className="py-3 px-4">
                        <Select
                          value={displayType}
                          onValueChange={(val: 'FIXED' | 'PERCENTAGE') =>
                            handleInlineChange(item.patient_id, 'rate_type', val, item)
                          }
                        >
                          <SelectTrigger className="h-10 text-xs rounded-xl font-medium w-[130px] min-h-[44px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="PERCENTAGE">Percentual (%)</SelectItem>
                            <SelectItem value="FIXED">Fixo (R$)</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Valor do Repasse (Input Inline Estilo Planilha) */}
                      <td className="py-3 px-4">
                        <div className="relative max-w-[130px]">
                          <Input
                            type="number"
                            step={displayType === 'FIXED' ? '1.00' : '0.5'}
                            min={0}
                            max={displayType === 'PERCENTAGE' ? 100 : 99999}
                            value={displayValue}
                            onChange={(e) =>
                              handleInlineChange(item.patient_id, 'value', e.target.value, item)
                            }
                            className={`h-10 text-base font-bold pr-7 rounded-xl min-h-[44px] ${
                              isDirty
                                ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 ring-1 ring-amber-500'
                                : 'border-border'
                            }`}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                            {displayType === 'FIXED' ? 'R$' : '%'}
                          </span>
                        </div>
                      </td>

                      {/* Status e Origem da Regra */}
                      <td className="py-3 px-4">
                        {isDirty ? (
                          <Badge
                            variant="outline"
                            className="bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 gap-1 text-[11px] font-semibold"
                          >
                            <span>● Alteração pendente</span>
                          </Badge>
                        ) : item.has_override ? (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 gap-1 text-[11px] font-semibold"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Personalizado</span>
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 gap-1 text-[11px] font-medium"
                          >
                            <span>Padrão do contrato</span>
                          </Badge>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Salvar Linha Individual */}
                          {isDirty && (
                            <Button
                              size="sm"
                              onClick={() =>
                                saveMutation.mutate({
                                  patient_id: item.patient_id,
                                  rate_type: displayType,
                                  value: displayValue,
                                })
                              }
                              disabled={saveMutation.isPending}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-2.5 rounded-lg text-xs min-h-[44px]"
                              title="Salvar alteração desta linha"
                            >
                              <Save className="w-3.5 h-3.5 mr-1" />
                              <span>Salvar</span>
                            </Button>
                          )}

                          {/* Ver Histórico */}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openHistoryDrawer(item)}
                            className="h-9 w-9 p-0 rounded-lg hover:bg-muted text-muted-foreground min-h-[44px] min-w-[44px]"
                            title="Ver histórico de alterações"
                          >
                            <Clock className="w-4 h-4" />
                          </Button>

                          {/* Restaurar Padrão do Contrato (se tiver override) */}
                          {item.has_override && !isDirty && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRestoreConfirmPatient(item)}
                              className="h-9 w-9 p-0 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-muted-foreground hover:text-red-600 min-h-[44px] min-w-[44px]"
                              title="Remover personalização e voltar ao contrato geral"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODAL DE CONFIRMAÇÃO PARA RESTAURAR PADRÃO (REGRA DOS BOTÕES COM ALERTA) */}
      <AlertDialog
        open={Boolean(restoreConfirmPatient)}
        onOpenChange={(open) => !open && setRestoreConfirmPatient(null)}
      >
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mb-2">
              <AlertCircle className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold">
              Restaurar Contrato Geral?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-muted-foreground">
              Tem certeza que deseja remover o valor customizado de{' '}
              <strong className="text-foreground">
                {restoreConfirmPatient?.patient_name}
              </strong>
              ? O repasse deste paciente voltará a seguir automaticamente o contrato geral do
              profissional ({stats?.contract_default?.percentage_private || 70}%).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="min-h-[44px] rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restoreConfirmPatient?.override_id) {
                  deleteMutation.mutate(restoreConfirmPatient.override_id);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold min-h-[44px] rounded-xl"
            >
              {deleteMutation.isPending ? 'Restaurando...' : 'Sim, Restaurar Padrão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 6. MODAL DE EDIÇÃO EM LOTE PARA SELECIONADOS */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">
              Editar em Lote ({selectedPatientIds.length} pacientes)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Defina a mesma regra de repasse para todos os pacientes selecionados.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <Label className="text-xs font-semibold">Tipo de Repasse</Label>
              <Select
                value={bulkRateType}
                onValueChange={(val: 'FIXED' | 'PERCENTAGE') => setBulkRateType(val)}
              >
                <SelectTrigger className="mt-1 h-11 min-h-[44px] rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERCENTAGE">Percentual (%)</SelectItem>
                  <SelectItem value="FIXED">Valor Fixo (R$)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">
                {bulkRateType === 'PERCENTAGE' ? 'Percentual (%)' : 'Valor Fixo (R$)'}
              </Label>
              <div className="relative mt-1">
                <Input
                  type="number"
                  step={bulkRateType === 'PERCENTAGE' ? '0.5' : '1.00'}
                  min={0}
                  max={bulkRateType === 'PERCENTAGE' ? 100 : 99999}
                  value={bulkValue}
                  onChange={(e) => setBulkValue(Number(e.target.value))}
                  className="h-11 text-base font-bold pr-8 rounded-xl"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  {bulkRateType === 'PERCENTAGE' ? '%' : 'R$'}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBulkModalOpen(false)}
              className="min-h-[44px] rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApplyBulkValue}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[44px] rounded-xl"
            >
              Aplicar a todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. DRAWER LATERAL DE HISTÓRICO / AUDITORIA */}
      <Sheet open={Boolean(historyPatient)} onOpenChange={(open) => !open && setHistoryPatient(null)}>
        <SheetContent className="w-[95vw] sm:w-[500px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span>Histórico de Alterações</span>
            </SheetTitle>
            <SheetDescription className="text-xs">
              Trilha de auditoria das mudanças de valor para{' '}
              <strong className="text-foreground">{historyPatient?.patient_name}</strong>
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {loadingHistory ? (
              <div className="py-12 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                <span>Buscando registros de auditoria...</span>
              </div>
            ) : historyList.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p className="font-semibold text-foreground">Nenhuma alteração registrada</p>
                <p className="text-xs mt-1">Este paciente ainda está com o valor inicial padrão.</p>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                {historyList.map((hist, idx) => (
                  <div key={hist.id || idx} className="flex items-start gap-4 relative pl-8">
                    <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950 border border-emerald-300 dark:border-emerald-700 text-emerald-600 flex items-center justify-center absolute left-0 top-0.5 text-xs font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1 bg-muted/30 p-3.5 rounded-xl border border-border">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {hist.changed_by_name}
                        </span>
                        <span>
                          {new Date(hist.changed_at).toLocaleString('pt-BR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold">
                        <span className="text-muted-foreground line-through">
                          {hist.previous_value != null
                            ? hist.previous_rate_type === 'FIXED'
                              ? `R$ ${hist.previous_value.toFixed(2)}`
                              : `${hist.previous_value}%`
                            : 'Padrão'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {hist.new_rate_type === 'CONTRACT_DEFAULT'
                            ? 'Contrato Padrão'
                            : hist.new_rate_type === 'FIXED'
                            ? `R$ ${hist.new_value.toFixed(2)}`
                            : `${hist.new_value}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* 8. MODAL DE PRÉ-VISUALIZAÇÃO DE DIFF NA IMPORTAÇÃO EXCEL */}
      <Dialog open={importModalOpen} onOpenChange={setImportModalOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
              <span>Prévia da Importação (.xlsx)</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Revise as alterações antes de salvar no sistema. Itens destacados em verde serão
              atualizados.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-2.5 px-3">Paciente</th>
                  <th className="py-2.5 px-3">Valor Atual</th>
                  <th className="py-2.5 px-3">Novo Valor</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {importDiff.map((d, i) => (
                  <tr
                    key={i}
                    className={d.isChanged ? 'bg-emerald-50/50 dark:bg-emerald-950/20' : ''}
                  >
                    <td className="py-2.5 px-3 font-medium text-foreground">
                      {d.patient_name}
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground">
                      {d.current_value != null
                        ? d.current_rate_type === 'FIXED'
                          ? `R$ ${d.current_value.toFixed(2)}`
                          : `${d.current_value}%`
                        : 'Padrão'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-foreground">
                      {d.rate_type === 'FIXED' ? `R$ ${d.value.toFixed(2)}` : `${d.value}%`}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {d.isChanged ? (
                        <Badge className="bg-emerald-600 text-white text-[10px]">
                          Atualizar
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Sem alteração</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter className="pt-3 border-t border-border flex items-center justify-between sm:justify-between">
            <span className="text-xs text-muted-foreground font-medium">
              {importDiff.filter((d) => d.isChanged).length} de {importDiff.length} itens serão
              modificados.
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setImportModalOpen(false)}
                className="min-h-[44px] rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-h-[44px] rounded-xl"
              >
                {isImporting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <Check className="w-4 h-4 mr-1" />
                )}
                <span>Confirmar Importação</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
