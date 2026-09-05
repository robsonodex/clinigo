'use client';

import React, { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRole } from '@/lib/hooks/use-auth';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Stethoscope,
  Mail,
  Phone,
  Calendar,
  Sparkles,
  FileText,
  DollarSign,
  ShieldCheck,
  Building,
  Loader2,
  PenTool,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PatientRatesTab } from '@/components/doctors/PatientRatesTab';
import { DoctorSignaturesTab } from '@/components/doctors/DoctorSignaturesTab';
import { api, type Doctor } from '@/lib/api-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DoctorProfilePage({ params }: PageProps) {
  const { id: doctorId } = use(params);
  const { clinicId } = useRole();
  const router = useRouter();

  // Consulta detalhes do médico
  const {
    data: doctorResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['doctor-detail', doctorId, clinicId],
    queryFn: async () => {
      const res = await api.get<any>(`/doctors/detail?id=${doctorId}`);
      return res?.data || res;
    },
    enabled: Boolean(doctorId),
  });

  const doctor = doctorResponse;
  const doctorName = doctor?.user?.full_name || doctor?.name || 'Profissional';
  const specialty = doctor?.specialty || 'Especialista';
  const crm = doctor?.crm ? `CRM ${doctor.crm}/${doctor.crm_state || ''}` : '';
  const email = doctor?.user?.email || '';
  const phone = doctor?.user?.phone || '';

  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'valores-paciente';

  return (
    <div className="space-y-5 p-3 sm:p-5 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* 1. NAVEGAÇÃO SUPERIOR (VOLTAR) */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/medicos')}
          className="gap-2 text-muted-foreground hover:text-foreground h-9 rounded-md px-2.5 text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Profissionais</span>
        </Button>
      </div>

      {/* 2. CARD DO PROFISSIONAL */}
      <Card className="rounded-md border border-border shadow-xs bg-card overflow-hidden">
        <CardContent className="p-5">
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-md" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center text-lg font-semibold shadow-xs">
                  {doctorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">{doctorName}</h1>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300/60 font-medium text-[11px] rounded-xs px-2 py-0.5"
                    >
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      {doctor?.is_accepting_appointments ? 'Ativo na Clínica' : 'Indisponível'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                    <span className="flex items-center gap-1 font-medium text-foreground/80">
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                      {specialty}
                    </span>
                    {crm && <span>• {crm}</span>}
                    {email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5" />
                        {email}
                      </span>
                    )}
                    {phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Ações Rápidas do Cabeçalho */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-9 rounded-md px-3 text-xs font-medium"
                >
                  <Link href={`/dashboard/horarios?doctor_id=${doctorId}`}>
                    <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                    <span>Ver Grade de Horários</span>
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. ABAS DO PERFIL */}
      <Tabs defaultValue={initialTab} className="w-full space-y-4">
        <TabsList className="bg-muted/40 p-1 rounded-md h-auto border border-border inline-flex flex-wrap gap-1">
          <TabsTrigger
            value="valores-paciente"
            className="rounded-sm px-3.5 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[36px] flex items-center gap-2"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Valores por Paciente</span>
          </TabsTrigger>

          <TabsTrigger
            value="dados-contrato"
            className="rounded-sm px-3.5 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[36px] flex items-center gap-2"
          >
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Contrato Geral</span>
          </TabsTrigger>

          <TabsTrigger
            value="contratos-termos"
            className="rounded-sm px-3.5 py-2 text-xs font-medium data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs min-h-[36px] flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Contratos & Termos</span>
          </TabsTrigger>
        </TabsList>

        {/* CONTEÚDO DA ABA: VALORES POR PACIENTE */}
        <TabsContent value="valores-paciente" className="m-0 focus-visible:outline-none">
          <PatientRatesTab doctorId={doctorId} doctorName={doctorName} />
        </TabsContent>

        {/* CONTEÚDO DA ABA: CONTRATO GERAL */}
        <TabsContent value="dados-contrato" className="m-0 focus-visible:outline-none">
          <Card className="rounded-md border border-border shadow-xs p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Regras do Contrato Padrão</h3>
            <p className="text-xs text-muted-foreground">
              Estas são as taxas aplicadas quando o paciente não possui um valor customizado
              definido na aba &quot;Valores por Paciente&quot;.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-md bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground block uppercase font-medium">
                  Repasse Padrão Particular
                </span>
                <span className="text-xl font-bold text-foreground mt-1 block">
                  {doctor?.percentage || 70}%
                </span>
              </div>
              <div className="p-3.5 rounded-md bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground block uppercase font-semibold">
                  Valor da Consulta Padrão
                </span>
                <span className="text-xl font-bold text-foreground mt-1 block">
                  R$ {Number(doctor?.consultation_price || 200).toFixed(2)}
                </span>
              </div>
              <div className="p-3.5 rounded-md bg-muted/40 border border-border">
                <span className="text-[11px] text-muted-foreground block uppercase font-semibold">
                  Modalidade de Contrato
                </span>
                <span className="text-sm font-semibold text-foreground mt-1.5 block">
                  Percentual sobre Produção
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* CONTEÚDO DA ABA: CONTRATOS & TERMOS */}
        <TabsContent value="contratos-termos" className="m-0 focus-visible:outline-none">
          <DoctorSignaturesTab doctorId={doctorId} doctorName={doctorName} doctor={doctor} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
