'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, Printer, Copy, Check, Download, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

interface RoomQrModalProps {
  doctorName?: string;
  roomName?: string;
  clinicName?: string;
}

export function RoomQrModal({
  doctorName = 'Profissional',
  roomName = 'Sala de Atendimento',
  clinicName = 'CliniGo',
}: RoomQrModalProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // URL para a agenda rápida da sala
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://clinigo.app';
  const checkinUrl = `${currentOrigin}/dashboard/agenda`;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(checkinUrl)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(checkinUrl);
    setCopied(true);
    toast.success('Link copiado para a área de transferência!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 min-h-[44px] rounded-xl text-xs font-medium border-slate-200 dark:border-slate-800"
          title="QR Code da Sala de Atendimento"
        >
          <QrCode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>QR da Sala</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md w-[95vw] sm:w-full rounded-2xl p-6 text-center">
        <DialogHeader className="items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center mb-2 mx-auto">
            <QrCode className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          </div>
          <DialogTitle className="text-lg font-bold">
            QR Code da Sala de Atendimento
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Fixe este QR Code no consultório para check-in instantâneo via celular/tablet
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 p-6 bg-white dark:bg-slate-900 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800/60 flex flex-col items-center justify-center shadow-inner">
          <img
            src={qrImageUrl}
            alt="QR Code da Sala"
            className="w-52 h-52 object-contain rounded-lg shadow-sm"
          />
          <div className="mt-4 text-center">
            <p className="font-bold text-sm text-foreground">{roomName}</p>
            <p className="text-xs text-muted-foreground">{doctorName} • {clinicName}</p>
          </div>
          <div className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Validação Médica Presencial</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="min-h-[44px] rounded-xl text-xs gap-1.5"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copiado!' : 'Copiar Link'}</span>
          </Button>

          <Button
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] rounded-xl text-xs gap-1.5 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir QR</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
