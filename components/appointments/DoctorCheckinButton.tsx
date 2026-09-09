'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Badge } from '@/components/ui/badge';
import {
  UserCheck,
  Stethoscope,
  Loader2,
  ShieldCheck,
  FileText,
  Clock,
  Camera,
  AlertCircle,
  ExternalLink,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DoctorBiometricModal } from '@/components/appointments/DoctorBiometricModal';

export interface DoctorCheckinButtonProps {
  appointmentId: string;
  patientId?: string;
  clinicId?: string;
  patientName?: string;
  scheduledTime?: string;
  status?: string;
  hasReceptionCheckin?: boolean;
  doctorCheckedInAt?: string | null;
  verificationLevel?: 'UNVERIFIED' | 'FACIAL_ONLY' | 'DOCTOR_ONLY' | 'DOUBLE_VERIFIED' | string;
  repasseAmount?: number;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  className?: string;
  onSuccess?: (data: any) => void;
}

export function DoctorCheckinButton({
  appointmentId,
  patientId,
  clinicId,
  patientName = 'Paciente',
  scheduledTime,
  status,
  hasReceptionCheckin = false,
  doctorCheckedInAt,
  verificationLevel = 'UNVERIFIED',
  repasseAmount,
  size = 'sm',
  variant = 'default',
  className = '',
  onSuccess,
}: DoctorCheckinButtonProps) {
  const [openDialog, setOpenDialog] = useState(false);
  const [openBiometricModal, setOpenBiometricModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resolvedPatientId, setResolvedPatientId] = useState<string | undefined>(patientId);
  const [resolvedClinicId, setResolvedClinicId] = useState<string | undefined>(clinicId);
  const router = useRouter();

  useEffect(() => {
    if (patientId) setResolvedPatientId(patientId);
    if (clinicId) setResolvedClinicId(clinicId);
  }, [patientId, clinicId]);

  const ensurePatientAndClinicLoaded = async () => {
    if (resolvedPatientId && resolvedClinicId) {
      return { patientId: resolvedPatientId, clinicId: resolvedClinicId };
    }
    try {
      const res = await fetch(`/api/appointments/${appointmentId}`);
      if (res.ok) {
        const apt = await res.json();
        const pId = apt.patient_id || apt.patient?.id;
        const cId = apt.clinic_id;
        if (pId) setResolvedPatientId(pId);
        if (cId) setResolvedClinicId(cId);
        return { patientId: pId, clinicId: cId };
      }
    } catch (e) {
      console.warn('Falha ao resolver paciente/clínica:', e);
    }
    return { patientId: resolvedPatientId, clinicId: resolvedClinicId };
  };

  const isAlreadyCheckedIn = Boolean(doctorCheckedInAt || status === 'IN_PROGRESS' || status === 'COMPLETED');
  const isDoubleVerified = verificationLevel === 'DOUBLE_VERIFIED' || (hasReceptionCheckin && isAlreadyCheckedIn);

  const handleConfirmCheckin = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/appointments/${appointmentId}/doctor-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'APP' }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao confirmar presença');
      }

      toast.success('Atendimento iniciado com sucesso!', {
        description: `Prontuário de ${patientName} pronto. Redirecionando...`,
      });

      setOpenDialog(false);
      onSuccess?.(json.data);

      // Redireciona imediatamente para o prontuário do paciente
      if (json.data?.prontuario_url) {
        router.push(json.data.prontuario_url);
      } else {
        router.push(`/dashboard/prontuarios/${appointmentId}`);
      }
    } catch (err: any) {
      toast.error('Falha no check-in', {
        description: err.message || 'Ocorreu um erro ao processar o atendimento.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProntuario = () => {
    router.push(`/dashboard/prontuarios/${appointmentId}`);
  };

  // Se já foi iniciado o atendimento pelo médico
  if (isAlreadyCheckedIn) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={`gap-1.5 py-1 px-2.5 text-xs font-semibold ${
            isDoubleVerified
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 shadow-xs'
              : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700'
          }`}
        >
          {isDoubleVerified ? (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Dupla Comprovação</span>
            </>
          ) : (
            <>
              <Stethoscope className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Em Atendimento</span>
            </>
          )}
        </Badge>

        <Button
          size="sm"
          variant="outline"
          onClick={handleOpenProntuario}
          className="h-8 min-h-[44px] px-3 gap-1.5 text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Abrir Prontuário do Paciente"
        >
          <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
          <span>Prontuário</span>
          <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        size={size}
        variant={variant}
        onClick={(e) => {
          e.stopPropagation();
          ensurePatientAndClinicLoaded();
          setOpenDialog(true);
        }}
        className={`bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 min-h-[44px] shadow-sm transition-all font-medium ${className}`}
      >
        <UserCheck className="w-4 h-4" />
        <span>Paciente Compareceu</span>
      </Button>

      <AlertDialog open={openDialog} onOpenChange={setOpenDialog}>
        <AlertDialogContent className="max-w-md w-[95vw] sm:w-full rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center">
                <Stethoscope className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-bold text-foreground">
                  Confirmar Presença & Iniciar
                </AlertDialogTitle>
                <p className="text-xs text-muted-foreground">Validação de atendimento clínico</p>
              </div>
            </div>

            <AlertDialogDescription className="space-y-3 pt-3 text-sm text-foreground/90 text-left">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <p className="font-semibold text-foreground text-sm">
                  {patientName}
                </p>
                {scheduledTime && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Horário previsto: <strong>{scheduledTime}</strong></span>
                  </div>
                )}
              </div>

              {hasReceptionCheckin ? (
                <div className="p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Check-in na Recepção Realizado</strong>
                    <span>O paciente já passou pela recepção/totem. Você pode validar via biometria facial na sala ou confirmar diretamente.</span>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-semibold">Check-in Direto no Consultório</strong>
                    <span>O paciente ainda não passou pela recepção. A validação será realizada pelo terapeuta responsável.</span>
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <Button
                  type="button"
                  onClick={async () => {
                    await ensurePatientAndClinicLoaded();
                    setOpenDialog(false);
                    setOpenBiometricModal(true);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] rounded-xl font-semibold gap-2 shadow-xs text-xs sm:text-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Validar com Biometria Facial</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={(e) => {
                    e.preventDefault();
                    handleConfirmCheckin();
                  }}
                  disabled={loading}
                  className="w-full min-h-[44px] rounded-xl font-medium gap-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  )}
                  <span>Confirmar Sem Biometria (Manual)</span>
                </Button>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <AlertDialogCancel
              disabled={loading}
              className="min-h-[44px] rounded-xl font-medium w-full text-xs"
            >
              Cancelar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Validação Facial pelo Profissional */}
      {resolvedPatientId && (
        <DoctorBiometricModal
          open={openBiometricModal}
          onOpenChange={setOpenBiometricModal}
          appointmentId={appointmentId}
          patientId={resolvedPatientId}
          patientName={patientName}
          clinicId={resolvedClinicId || ''}
          onSuccess={(data) => {
            onSuccess?.(data);
            if (data?.prontuario_url) {
              router.push(data.prontuario_url);
            } else {
              router.push(`/dashboard/prontuarios/${appointmentId}`);
            }
          }}
          onConfirmManual={handleConfirmCheckin}
        />
      )}
    </>
  );
}

