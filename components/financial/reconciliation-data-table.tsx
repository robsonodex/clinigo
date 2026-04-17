"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface Guide {
  id: string;
  guide_number: string;
  patient_name: string;
  execution_date: string;
  total_amount: number;
  paid_amount: number;
  glosa_amount: number;
  glosa_reason: string;
  status: string;
}

export function ReconciliationDataTable({ batchId }: { batchId: string }) {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const [edits, setEdits] = useState<{ [key: string]: { paid_amount: number; glosa_amount: number } }>({});

  useEffect(() => {
    async function fetchConciliationData() {
      try {
        const res = await fetch(`/api/financial/conciliation/${batchId}`);
        const data = await res.json();
        if (data.success && data.data?.guides) {
          setGuides(data.data.guides);
          
          // Inicializar estado de edições com os dados atuais
          const initialEdits: any = {};
          data.data.guides.forEach((g: Guide) => {
             // By default, suggest paid_amount = total_amount if it's currently 0 and status is DRAFT/SUBMITTED
             const defaultPaid = (g.paid_amount === 0 && !["PAID", "DENIED"].includes(g.status)) ? g.total_amount : g.paid_amount;
             initialEdits[g.id] = {
               paid_amount: defaultPaid || 0,
               glosa_amount: g.glosa_amount || 0
             };
          });
          setEdits(initialEdits);
        }
      } catch (error) {
        console.error("Erro ao buscar dados de conciliação:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchConciliationData();
  }, [batchId]);

  const handleEditChange = (id: string, field: 'paid_amount' | 'glosa_amount', value: string) => {
    setEdits(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: Number(value) || 0
      }
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const reconciliations = Object.keys(edits).map(guide_id => ({
        guide_id,
        paid_amount: edits[guide_id].paid_amount,
        glosa_amount: edits[guide_id].glosa_amount
      }));

      const res = await fetch(`/api/financial/conciliation/${batchId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reconciliations })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Sucesso",
        description: "Conciliação do lote salva com sucesso.",
      });

      // Refetch data (mocking state update to re-sync)
      // fetchConciliationData() can be called or force reload
      window.location.reload();

    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Carregando guias para conciliação...</div>;
  }

  if (guides.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">Nenhuma guia encontrada neste lote.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center rounded-md border p-4 bg-muted/20">
        <div>
          <h4 className="font-medium text-lg">Total do Lote TISS:</h4>
          <span className="text-sm text-muted-foreground">
            {guides.length} guias aguardando análise
          </span>
        </div>
        <Button onClick={handleSaveAll} disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</> : "Confirmar Conciliação"}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número da Guia</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead className="text-right">Valor Informado (R$)</TableHead>
              <TableHead className="text-right">Ação: Valor Pago</TableHead>
              <TableHead className="text-right">Ação: Valor Glosado</TableHead>
              <TableHead>Status Atual</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guides.map((guide) => (
              <TableRow key={guide.id}>
                <TableCell className="font-medium font-mono text-sm">
                  {guide.guide_number}
                </TableCell>
                <TableCell>{guide.patient_name}</TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(guide.total_amount)}
                </TableCell>
                <TableCell className="text-right">
                  <Input 
                    type="number" 
                    step="0.01" 
                    className="w-24 ml-auto text-right text-green-600 font-medium"
                    min="0"
                    value={edits[guide.id]?.paid_amount ?? 0}
                    onChange={(e) => handleEditChange(guide.id, 'paid_amount', e.target.value)}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <Input 
                    type="number" 
                    step="0.01" 
                    className="w-24 ml-auto text-right text-red-600 font-medium"
                    min="0"
                    value={edits[guide.id]?.glosa_amount ?? 0}
                    onChange={(e) => handleEditChange(guide.id, 'glosa_amount', e.target.value)}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant={
                    guide.status === 'PAID' ? 'default' : 
                    guide.status === 'DENIED' ? 'destructive' : 
                    guide.status === 'PARTIALLY_APPROVED' ? 'secondary' : 'outline'
                  }>
                    {guide.status === 'PAID' ? 'Pago' : 
                     guide.status === 'DENIED' ? 'Glosado' : 
                     guide.status === 'PARTIALLY_APPROVED' ? 'Parcial' : 'Pendente'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
