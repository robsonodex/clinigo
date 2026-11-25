"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Loader2, AlertTriangle, ArrowRight, RefreshCw, Layers } from "lucide-react";

export default function GlosasPage() {
  const [guides, setGuides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/financial/glosas");
      const data = await res.json();
      if (res.ok && data.success) {
        setGuides(data.data || []);
      } else {
        setErrorMsg(data.error || "Não foi possível carregar as guias glosadas.");
      }
    } catch (error) {
      console.error("Erro buscar guias com glosa:", error);
      setErrorMsg("Erro de conexão ao consultar guias glosadas.");
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
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Status Atualizado",
        description:
          action === "MARK_APPROVED"
            ? "Recurso marcado como Acatado (aguardando liquidação bancária efetiva)."
            : "O recurso mudou de status com sucesso.",
      });
      fetchData();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-muted/60 border border-border flex items-center justify-center text-foreground/80 shrink-0 shadow-xs">
            <AlertTriangle className="w-4 h-4 text-foreground/80" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
              Gestão de Glosas e Recursos
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Visão consolidada de guias glosadas e acesso rápido à Workstation TISS em 3 níveis.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="min-h-[36px] gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          <Button asChild size="sm" className="min-h-[36px] gap-1.5 bg-[#155E4B] hover:bg-[#114B3C] text-white">
            <Link href="/dashboard/tiss/glosas">
              <Layers className="w-3.5 h-3.5" />
              Abrir Workstation 3 Níveis & Dossiê IA
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          Para conferência por item/grupo (Tabela 38 ANS), importação Dry-Run, Dossiê Probatório com Biometria + Evolução Assinada e XML de Recurso ANS, utilize a Workstation completa de Glosas TISS.
        </span>
        <Link
          href="/dashboard/tiss/glosas"
          className="font-semibold text-[#155E4B] hover:underline whitespace-nowrap shrink-0"
        >
          Ir para /dashboard/tiss/glosas
        </Link>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {errorMsg}
        </div>
      )}

      <div className="rounded-xl border border-border bg-card overflow-x-auto shadow-xs">
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
                  Nenhuma guia com glosa em aberto encontrada.
                </TableCell>
              </TableRow>
            ) : (
              guides.map((guide) => {
                const tissGlosa = guide.tiss_glosas?.[0];
                const hasAppeal = !!tissGlosa;
                const appealStatus = tissGlosa?.appeal_status || "NOT_APPEALED";

                return (
                  <TableRow key={guide.id}>
                    <TableCell className="text-muted-foreground text-sm">
                      Lote: {guide.tiss_batches?.batch_number || "-"} <br />
                      {guide.tiss_batches?.operator?.name || "Operadora"}
                    </TableCell>
                    <TableCell className="font-medium font-mono text-sm">
                      {guide.guide_number}
                    </TableCell>
                    <TableCell>{guide.patient_name}</TableCell>
                    <TableCell className="text-right font-mono">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(guide.total_amount ?? guide.total_value ?? 0))}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-rose-700">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(Number(guide.glosa_amount ?? guide.glosa_value ?? 0))}
                    </TableCell>
                    <TableCell>
                      {!hasAppeal ? (
                        <Badge variant="outline">Aguardando Ação</Badge>
                      ) : (
                        <Badge
                          variant={
                            appealStatus === "PENDING_APPEAL"
                              ? "secondary"
                              : appealStatus === "APPEAL_SENT"
                                ? "default"
                                : appealStatus === "APPEAL_APPROVED"
                                  ? "default"
                                  : "destructive"
                          }
                        >
                          {appealStatus === "PENDING_APPEAL"
                            ? "Pronto p/ Envio"
                            : appealStatus === "APPEAL_SENT"
                              ? "Enviado à Operadora"
                              : appealStatus === "APPEAL_APPROVED"
                                ? "Acatado (Aguard. Crédito)"
                                : "Indeferido"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {!hasAppeal ? (
                        <GlosaContestModal guide={guide} onSuccess={fetchData} />
                      ) : (
                        <div className="flex justify-end gap-2">
                          {appealStatus === "PENDING_APPEAL" && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(tissGlosa.id, "MARK_SENT")}
                            >
                              Marcar Enviado
                            </Button>
                          )}
                          {appealStatus === "APPEAL_SENT" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-emerald-700"
                                onClick={() => handleStatusUpdate(tissGlosa.id, "MARK_APPROVED")}
                              >
                                Acatado
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-rose-700"
                                onClick={() => handleStatusUpdate(tissGlosa.id, "MARK_DENIED")}
                              >
                                Negado
                              </Button>
                            </>
                          )}
                          {(appealStatus === "APPEAL_APPROVED" || appealStatus === "APPEAL_DENIED") && (
                            <span className="text-xs text-muted-foreground mr-2">Decidido</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
