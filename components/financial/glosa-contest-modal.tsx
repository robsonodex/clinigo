"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface GlosaModalProps {
  guide: any;
  onSuccess: () => void;
}

export function GlosaContestModal({ guide, onSuccess }: GlosaModalProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [ansCode, setAnsCode] = useState("");
  const { toast } = useToast();

  const isTotal = guide.paid_amount === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/financial/glosas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guide_id: guide.id,
          glosa_type: isTotal ? "TOTAL" : "PARTIAL",
          glosa_code: ansCode,
          glosa_description: description,
          glosa_value: guide.glosa_amount,
          original_value: guide.total_amount,
          approved_value: guide.paid_amount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({
        title: "Recurso Iniciado",
        description: "Contestação registrada com sucesso.",
      });
      setOpen(false);
      onSuccess();

    } catch (err: any) {
      toast({
        title: "Erro ao registrar.",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Gerar Recurso
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mover para Recurso de Glosa</DialogTitle>
          <DialogDescription>
            Guia {guide.guide_number} - Paciente: {guide.patient_name}
            <br/>
            Valor Glosado: R$ {guide.glosa_amount?.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Código ANS da Glosa</label>
            <Input 
              placeholder="Ex: 1001 (opcional)" 
              value={ansCode}
              onChange={(e) => setAnsCode(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Justificativa da Contestação</label>
            <Textarea 
              placeholder="Descreva o motivo pelo qual a clínica contesta esta glosa..." 
              required
              minLength={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex justify-end pt-4 gap-2">
             <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancelar</Button>
             <Button type="submit" disabled={loading}>
               {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Salvar"}
             </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
