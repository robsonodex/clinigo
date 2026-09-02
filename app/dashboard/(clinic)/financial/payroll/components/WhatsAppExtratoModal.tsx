'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  MessageSquare,
  Send,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  Sparkles,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface WhatsAppExtratoModalProps {
  doctors?: Array<{
    id: string;
    name?: string;
    specialty?: string;
    user?: {
      full_name?: string;
      phone?: string;
    };
  }>;
}

export function WhatsAppExtratoModal({ doctors = [] }: WhatsAppExtratoModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [customPhone, setCustomPhone] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Seleciona primeiro médico se não selecionado
  const activeDoctorId = selectedDoctorId || doctors[0]?.id || '';
  const currentDoc = doctors.find((d) => d.id === activeDoctorId);
  const currentPhone = customPhone || currentDoc?.user?.phone || '';

  // Query para buscar preview do extrato
  const { data: previewData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['whatsapp-repasse-preview', activeDoctorId],
    queryFn: async () => {
      if (!activeDoctorId) return null;
      const res = await fetch(`/api/whatsapp/repasse-extract?doctor_id=${activeDoctorId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json;
    },
    enabled: open && Boolean(activeDoctorId),
  });

  const handleCopy = () => {
    if (previewData?.formatted_message) {
      navigator.clipboard.writeText(previewData.formatted_message);
      setCopied(true);
      toast.success('Mensagem do extrato copiada para a área de transferência!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleTestSend = async () => {
    if (!currentPhone) {
      toast.error('Informe um número de telefone com WhatsApp para testar o envio.');
      return;
    }

    try {
      setIsSending(true);
      const res = await fetch('/api/whatsapp/repasse-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: currentPhone,
          doctor_id: activeDoctorId,
          command_text: 'extrato',
          send_whatsapp: true,
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || 'Erro ao disparar mensagem WhatsApp');
      }

      toast.success('Extrato enviado com sucesso via WhatsApp!');
    } catch (err: any) {
      toast.error(err.message || 'Falha ao enviar extrato via WhatsApp');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30">
          <MessageSquare className="w-4 h-4 text-emerald-600" />
          Extrato via WhatsApp
          <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-[10px] ml-1">
            Novo
          </Badge>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-lg text-emerald-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Extrato de Repasse via WhatsApp</DialogTitle>
              <DialogDescription>
                Comando automático interativo para os profissionais da clínica
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card explicativo */}
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-800/50 text-sm space-y-2">
            <div className="flex items-center gap-2 font-medium text-emerald-900 dark:text-emerald-200">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Como funciona o comando do profissional?
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Basta o profissional cadastrado enviar uma mensagem com <strong className="text-emerald-700 dark:text-emerald-300">"extrato"</strong>, <strong className="text-emerald-700 dark:text-emerald-300">"repasse"</strong> ou <strong className="text-emerald-700 dark:text-emerald-300">"quanto já ganhei"</strong> para o WhatsApp conectado da clínica. O CliniGo autentica o número do celular com o cadastro e responde imediatamente com a produção e o valor a receber.
            </p>
            <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Protegido por autenticação de número de celular cadastrado (LGPD e sigilo financeiro).</span>
            </div>
          </div>

          {/* Seleção de profissional para teste */}
          {doctors.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="docSelect" className="text-xs font-semibold">
                  Profissional para Simulação
                </Label>
                <select
                  id="docSelect"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={activeDoctorId}
                  onChange={(e) => {
                    setSelectedDoctorId(e.target.value);
                    setCustomPhone('');
                  }}
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.user?.full_name || d.name || 'Profissional'} ({d.specialty || 'Clínico'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phoneInput" className="text-xs font-semibold">
                  Telefone WhatsApp
                </Label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                  <Input
                    id="phoneInput"
                    placeholder="Ex: 21999998888"
                    value={customPhone || currentDoc?.user?.phone || ''}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Preview da Mensagem formatada */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                Prévia da Resposta no WhatsApp
              </Label>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  className="h-7 text-xs px-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isFetching ? 'animate-spin' : ''}`} />
                  Recalcular
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  disabled={isLoading || !previewData?.formatted_message}
                  className="h-7 text-xs px-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-green-600" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copiar
                    </>
                  )}
                </Button>
              </div>
            </div>

            {isLoading ? (
              <div className="h-48 flex items-center justify-center rounded-xl bg-slate-900 text-slate-400 border">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Calculando extrato em tempo real...</span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#0b141a] text-[#e9edef] font-mono text-xs whitespace-pre-wrap leading-relaxed border border-slate-800 shadow-inner max-h-72 overflow-y-auto selection:bg-emerald-800">
                {previewData?.formatted_message || 'Nenhum dado encontrado para o período.'}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 border-t pt-4">
          <Button variant="ghost" onClick={() => setOpen(false)} className="w-full sm:w-auto">
            Fechar
          </Button>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleCopy}
              disabled={isLoading || !previewData?.formatted_message}
              className="w-full sm:w-auto"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copiar Texto
            </Button>
            <Button
              onClick={handleTestSend}
              disabled={isSending || isLoading}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Testar Envio no WhatsApp
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
