"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { PageHeader } from "@/components/page-header";
import { GlosaContestModal } from "@/components/financial/glosa-contest-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

export default function GlosasPage() {
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/financial/glosas");
      const data = await res.json();
      if (data.success) {
        setGuides(data.data || []);
      }
    } catch (error) {
      console.error("Erro buscar guias com glosa:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusUpdate = async (glosaId: string, action: string) => {
    try {
      const res = await fetch(`/api/financial/glosas/${glosaId}/appeal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Status Atualizado",
        description: "O recurso mudou de status com sucesso."
      });
      fetchData(); // reload
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header Premium Internacional */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center text-foreground/80 shrink-0 shadow-xs">
                        <AlertTriangle className="w-4 h-4 text-foreground/80" />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">Gestão de Glosas e Recursos</h1>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Acompanhe as guias glosadas, cadastre justificativas e valide o retorno das operadoras.</p>
                    </div>
                </div>
      </div>

      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Lote / Operadora</TableHead>
              <TableHead>Guia</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead className="text-right">V. Informado</TableHead>
              <TableHead className="text-right">V. Glosado</TableHead>
              <TableHead>Status da Glosa</TableHead>
              <TableHead className="text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                 <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                 </TableCell>
              </TableRow>
            ) : guides.length === 0 ? (
              <TableRow>
                 <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhuma guia com glosa encontrada.
                 </TableCell>
              </TableRow>
            ) : (
              guides.map((guide) => {
                const tissGlosa = guide.tiss_glosas?.[0]; // Assume 1 active resource
                const hasAppeal = !!tissGlosa;
                const appealStatus = tissGlosa?.appeal_status || 'NOT_APPEALED';

                return (
                  <TableRow key={guide.id}>
                    <TableCell className="text-muted-foreground text-sm">
                       Lote: {guide.tiss_batches?.batch_number} <br/>
                       {guide.tiss_batches?.operator?.name}
                    </TableCell>
                    <TableCell className="font-medium font-mono text-sm">
                      {guide.guide_number}
                    </TableCell>
                    <TableCell>{guide.patient_name}</TableCell>
                    <TableCell className="text-right">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(guide.total_amount)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-red-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(guide.glosa_amount)}
                    </TableCell>
                    <TableCell>
                       {!hasAppeal ? (
                         <Badge variant="outline">Aguardando Ação</Badge>
                       ) : (
                         <Badge variant={
                           appealStatus === 'PENDING_APPEAL' ? 'secondary' :
                           appealStatus === 'APPEAL_SENT' ? 'default' :
                           appealStatus === 'APPEAL_APPROVED' ? 'default' : 'destructive'
                         }>
                            {appealStatus === 'PENDING_APPEAL' ? 'Pronto p/ Envio' :
                             appealStatus === 'APPEAL_SENT' ? 'Enviado à Operadora' :
                             appealStatus === 'APPEAL_APPROVED' ? 'Acatado' : 'Recusado'}
                         </Badge>
                       )}
                    </TableCell>
                    <TableCell className="text-right">
                       {!hasAppeal ? (
                          <GlosaContestModal guide={guide} onSuccess={fetchData} />
                       ) : (
                         <div className="flex justify-end gap-2">
                            {appealStatus === 'PENDING_APPEAL' && (
                               <Button size="sm" onClick={() => handleStatusUpdate(tissGlosa.id, 'MARK_SENT')}>
                                 Marcar Enviado
                               </Button>
                            )}
                            {appealStatus === 'APPEAL_SENT' && (
                               <>
                                 <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleStatusUpdate(tissGlosa.id, 'MARK_APPROVED')}>
                                   Acatado
                                 </Button>
                                 <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleStatusUpdate(tissGlosa.id, 'MARK_DENIED')}>
                                   Negado
                                 </Button>
                               </>
                            )}
                            {(appealStatus === 'APPEAL_APPROVED' || appealStatus === 'APPEAL_DENIED') && (
                               <span className="text-sm text-muted-foreground mr-2">Decidido</span>
                            )}
                         </div>
                       )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
