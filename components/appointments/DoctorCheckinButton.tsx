'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Tablet,
  Send,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DoctorBiometricModal } from '@/components/appointments/DoctorBiometricModal';
import { StaffWebcamCheckinModal } from '@/components/checkin/StaffWebcamCheckinModal';
import { CheckinSurfacePicker, CheckinSurfaceType } from '@/components/checkin/CheckinSurfacePicker';
import { TherapistStartBiometricModal } from '@/components/appointments/TherapistStartBiometricModal';
import { createClient } from '@/lib/supabase/client';

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

interface ClinicDeviceItem {
  id: string;
  room_label: string;
  status: string;
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
  const [localCheckedIn, setLocalCheckedIn] = useState(Boolean(doctorCheckedInAt || status === 'IN_PROGRESS' || status === 'COMPLETED'));
  const [checkinMethodTag, setCheckinMethodTag] = useState<string | null>(null);

  // Tablets disponíveis
  const [devices, setDevices] = useState<ClinicDeviceItem[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isSendingToTablet, setIsSendingToTablet] = useState(false);
  const [isAwaitingTablet, setIsAwaitingTablet] = useState(false);
  const [awaitingRoomLabel, setAwaitingRoomLabel] = useState<string>('');

  // Fallback Manual com Motivo Obrigatório
  const [showManualReasonForm, setShowManualReasonForm] = useState(false);
  const [manualReason, setManualReason] = useState('');

  // V4: Modais de captura Multi-Superfície e Verificação da Terapeuta
  const [openStaffWebcamModal, setOpenStaffWebcamModal] = useState(false);
  const [openTherapistBioModal, setOpenTherapistBioModal] = useState(false);
  const [isSendingMobileLink, setIsSendingMobileLink] = useState(false);

  const router = useRouter();

  // Envio de link de check-in para o celular do paciente (WhatsApp/SMS)
  const handleSendPatientMobileLink = async () => {
    try {
      setIsSendingMobileLink(true);
      const res = await fetch('/api/checkin/patient-mobile/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment_id: appointmentId }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Falha ao disparar link para celular');
      }

      toast.success(json.message || 'Link de check-in enviado com sucesso via WhatsApp!');
      setOpenDialog(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar link para celular');
    } finally {
      setIsSendingMobileLink(false);
    }
  };

  useEffect(() => {
    if (patientId) setResolvedPatientId(patientId);
    if (clinicId) setResolvedClinicId(clinicId);
    if (doctorCheckedInAt || status === 'IN_PROGRESS' || status === 'COMPLETED') {
      setLocalCheckedIn(true);
    }
  }, [patientId, clinicId, doctorCheckedInAt, status]);

  // Carregar dados auxiliares se ausentes
  const ensurePatientAndClinicLoaded = useCallback(async () => {
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
  }, [appointmentId, resolvedPatientId, resolvedClinicId]);

  // Carregar dispositivos pareados da clínica
  const loadDevices = useCallback(async () => {
    try {
      const res = await fetch('/api/clinic-devices');
      if (res.ok) {
        const data = await res.json();
        const activeDevs = (data.devices || []).filter((d: any) => d.status === 'active');
        setDevices(activeDevs);
        if (activeDevs.length > 0 && !selectedDeviceId) {
          setSelectedDeviceId(activeDevs[0].id);
        }
      }
    } catch (err) {
      console.warn('[DoctorCheckinButton] Falha ao carregar dispositivos:', err);
    }
  }, [selectedDeviceId]);

  // Assinatura do Supabase Realtime Broadcast no canal appointment:{appointmentId}
  useEffect(() => {
    if (!appointmentId || localCheckedIn) return;

    const supabase = createClient();
    const channelName = `appointment:${appointmentId}`;

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'checkin_confirmed' }, (payload: any) => {
        const data = payload.payload || payload;
        const method = data?.method || 'facial';

        setLocalCheckedIn(true);
        setIsAwaitingTablet(false);
        setOpenDialog(false);
        setCheckinMethodTag(method === 'facial' ? 'Biometria Tablet' : method === 'signature' ? 'Assinatura Touch' : 'Manual');

        toast.success('Presença confirmada no tablet!', {
          description: `Paciente ${patientName} validado com sucesso.`,
        });

        onSuccess?.(data);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [appointmentId, localCheckedIn, patientName, onSuccess]);

  const isAlreadyCheckedIn = localCheckedIn;
  const isDoubleVerified = verificationLevel === 'DOUBLE_VERIFIED' || (hasReceptionCheckin && isAlreadyCheckedIn);

  // Enviar push remoto para o tablet
  const handlePushToTablet = async () => {
    if (!selectedDeviceId) {
      toast.error('Selecione o tablet da sala de atendimento.');
      return;
    }

    try {
      setIsSendingToTablet(true);
      const res = await fetch(`/api/appointments/${appointmentId}/push-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_id: selectedDeviceId }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao acionar tablet da sala');
      }

      setIsAwaitingTablet(true);
      setAwaitingRoomLabel(json.room_label || 'Tablet');
      toast.info(`Check-in enviado para o tablet (${json.room_label}). Aguardando confirmação...`);
    } catch (err: any) {
      toast.error(err.message || 'Falha ao acionar tablet');
    } finally {
      setIsSendingToTablet(false);
    }
  };

  // Confirmação manual com justificativa obrigatória
  const handleConfirmManualWithReason = async () => {
    const trimmedReason = manualReason.trim();
    if (!trimmedReason || trimmedReason.length < 3) {
      toast.error('Informe a justificativa para confirmação sem biometria (mínimo 3 caracteres).');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/appointments/${appointmentId}/doctor-checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'MANUAL',
          reason: trimmedReason,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Erro ao confirmar presença');
      }

      toast.success('Atendimento iniciado com sucesso!', {
        description: `Presença de ${patientName} confirmada com justificativa.`,
      });

      setLocalCheckedIn(true);
      setOpenDialog(false);
      setShowManualReasonForm(false);
      onSuccess?.(json.data);

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
              <span>{checkinMethodTag ? `Em Atendimento (${checkinMethodTag})` : 'Em Atendimento'}</span>
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
          loadDevices();
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

              {/* Status de aguardo do dispositivo */}
              {isAwaitingTablet && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between gap-2 animate-pulse">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 shrink-0" />
                    <div>
                      <strong className="block font-semibold">Aguardando confirmação no dispositivo</strong>
                      <span>A tela de check-in foi aberta na {awaitingRoomLabel}.</span>
                    </div>
                  </div>
                </div>
              )}

              {/* V4: Seletor de Superfície de Captura Biometrica */}
              {!showManualReasonForm ? (
                <div className="space-y-3">
                  <CheckinSurfacePicker
                    enabledSurfaces={['staff_webcam', 'kiosk', 'patient_mobile']}
                    patientMobileEnabled={true}
                    disabled={loading || isSendingToTablet || isSendingMobileLink}
                    onSelectSurface={(surface: CheckinSurfaceType) => {
                      if (surface === 'staff_webcam') {
                        setOpenDialog(false);
                        setOpenStaffWebcamModal(true);
                      } else if (surface === 'kiosk') {
                        if (devices.length > 0) {
                          handlePushToTablet();
                        } else {
                          toast.info('Nenhum dispositivo pareado no momento. Utilize a câmera do computador.');
                        }
                      } else if (surface === 'patient_mobile') {
                        handleSendPatientMobileLink();
                      }
                    }}
                    onManualConfirm={() => setShowManualReasonForm(true)}
                  />

                  {/* Se houver mais de 1 dispositivo na clínica, permite selecionar a sala */}
                  {devices.length > 1 && (
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
                      <Tablet className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-[11px] text-muted-foreground">Dispositivo Alvo:</span>
                      <select
                        value={selectedDeviceId}
                        onChange={(e) => setSelectedDeviceId(e.target.value)}
                        className="flex-1 h-8 px-2 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg"
                      >
                        {devices.map((dev) => (
                          <option key={dev.id} value={dev.id}>
                            {dev.room_label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                  <Label className="text-xs font-semibold text-amber-900 dark:text-amber-200 block">
                    Motivo da Confirmação Manual (Obrigatório - LGPD)
                  </Label>
                  <Input
                    type="text"
                    placeholder="Ex: Criança com aversão sensorial / Falha de conexão"
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    className="h-10 text-xs rounded-xl bg-white dark:bg-slate-900"
                    autoFocus
                  />
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowManualReasonForm(false)}
                      className="text-xs min-h-[38px] rounded-lg"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleConfirmManualWithReason}
                      disabled={loading || !manualReason.trim()}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold min-h-[38px] rounded-lg flex-1"
                    >
                      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                      Confirmar Presença Manual
                    </Button>
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <AlertDialogCancel
              disabled={loading}
              onClick={() => {
                setShowManualReasonForm(false);
                setIsAwaitingTablet(false);
              }}
              className="min-h-[44px] rounded-xl font-medium w-full text-xs"
            >
              Fechar
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Validação Facial pelo Computador */}
      {resolvedPatientId && (
        <DoctorBiometricModal
          open={openBiometricModal}
          onOpenChange={setOpenBiometricModal}
          appointmentId={appointmentId}
          patientId={resolvedPatientId}
          patientName={patientName}
          clinicId={resolvedClinicId || ''}
          onSuccess={(data) => {
            setLocalCheckedIn(true);
            onSuccess?.(data);
            if (data?.prontuario_url) {
              router.push(data.prontuario_url);
            } else {
              router.push(`/dashboard/prontuarios/${appointmentId}`);
            }
          }}
          onConfirmManual={() => {
            setShowManualReasonForm(true);
            setOpenDialog(true);
          }}
        />
      )}

      {/* V4: Modal de Captura Facial na Webcam da Terapeuta */}
      <StaffWebcamCheckinModal
        open={openStaffWebcamModal}
        onOpenChange={setOpenStaffWebcamModal}
        appointmentId={appointmentId}
        patientName={patientName}
        onSuccess={(data) => {
          setLocalCheckedIn(true);
          setCheckinMethodTag('Biometria Webcam');
          onSuccess?.(data);
        }}
        onConfirmManual={() => {
          setShowManualReasonForm(true);
          setOpenDialog(true);
        }}
      />

      {/* V4: Modal de Verificação da Terapeuta antes de iniciar (Fluxo B) */}
      <TherapistStartBiometricModal
        open={openTherapistBioModal}
        onOpenChange={setOpenTherapistBioModal}
        appointmentId={appointmentId}
        onSuccess={(data) => {
          onSuccess?.(data);
          if (data?.prontuario_url) {
            router.push(data.prontuario_url);
          } else {
            router.push(`/dashboard/prontuarios/${appointmentId}`);
          }
        }}
      />
    </>
  );
}
