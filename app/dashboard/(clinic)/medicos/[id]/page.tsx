'use client';

import React, { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRole } from '@/lib/hooks/use-auth';
import { useRouter } from 'next/navigation';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PatientRatesTab } from '@/components/doctors/PatientRatesTab';
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

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* 1. NAVEGAÇÃO SUPERIOR (VOLTAR) */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/medicos')}
          className="gap-2 text-muted-foreground hover:text-foreground h-11 min-h-[44px] rounded-xl px-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Profissionais</span>
        </Button>
      </div>

      {/* 2. CARD DO PROFISSIONAL */}
      <Card className="rounded-2xl border border-border shadow-xs bg-card overflow-hidden">
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-2xl" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-72" />
              </div>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-emerald-500/20">
                  {doctorName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-2xl font-bold text-foreground">{doctorName}</h1>
                    <Badge
                      variant="outline"
                      className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-300 font-semibold text-xs"
                    >
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      {doctor?.is_accepting_appointments ? 'Ativo na Clínica' : 'Indisponível'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
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
                  className="h-11 min-h-[44px] rounded-xl px-3.5 text-xs font-semibold"
                >
                  <Link href={`/dashboard/horarios?doctor_id=${doctorId}`}>
                    <Calendar className="w-4 h-4 mr-1.5 text-primary" />
                    <span>Ver Grade de Horários</span>
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. ABAS DO PERFIL */}
      <Tabs defaultValue="valores-paciente" className="w-full space-y-6">
        <TabsList className="bg-muted/60 p-1.5 rounded-2xl h-auto border border-border inline-flex flex-wrap gap-1">
          <TabsTrigger
            value="valores-paciente"
            className="rounded-xl px-4 py-2.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs min-h-[44px] flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4 text-emerald-600" />
            <span>Valores por Paciente</span>
            <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 h-4">
              NOVO
            </Badge>
          </TabsTrigger>

          <TabsTrigger
            value="dados-contrato"
            className="rounded-xl px-4 py-2.5 text-xs font-semibold data-[state=active]:bg-background data-[state=active]:shadow-xs min-h-[44px] flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>Contrato Geral</span>
          </TabsTrigger>
        </TabsList>

        {/* CONTEÚDO DA ABA: VALORES POR PACIENTE */}
        <TabsContent value="valores-paciente" className="m-0 focus-visible:outline-none">
          <PatientRatesTab doctorId={doctorId} doctorName={doctorName} />
        </TabsContent>

        {/* CONTEÚDO DA ABA: CONTRATO GERAL */}
        <TabsContent value="dados-contrato" className="m-0 focus-visible:outline-none">
          <Card className="rounded-2xl border border-border shadow-xs p-6 space-y-4">
            <h3 className="text-base font-bold text-foreground">Regras do Contrato Padrão</h3>
            <p className="text-sm text-muted-foreground">
              Estas são as taxas aplicadas quando o paciente não possui um valor customizado
              definido na aba &quot;Valores por Paciente&quot;.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-muted/40 border border-border">
                <span className="text-xs text-muted-foreground block uppercase font-semibold">
                  Repasse Padrão Particular
                </span>
                <span className="text-2xl font-extrabold text-foreground mt-1 block">
                  {doctor?.percentage || 70}%
                </span>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border">
                <span className="text-xs text-muted-foreground block uppercase font-semibold">
                  Valor da Consulta Padrão
                </span>
                <span className="text-2xl font-extrabold text-foreground mt-1 block">
                  R$ {Number(doctor?.consultation_price || 200).toFixed(2)}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border">
                <span className="text-xs text-muted-foreground block uppercase font-semibold">
                  Modalidade de Contrato
                </span>
                <span className="text-base font-bold text-foreground mt-2 block">
                  Percentual sobre Produção
                </span>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
