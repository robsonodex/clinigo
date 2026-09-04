'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Plus, Target, Calendar, User, FileText, AlertCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { EvolucaoGrafico } from '@/components/psicomotricidade/EvolucaoGrafico';

export default function PsicomotricidadeCapaPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const patientId = params.id as string;

    const [patient, setPatient] = useState<any>(null);
    const [capa, setCapa] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [objetivos, setObjetivos] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreatingSession, setIsCreatingSession] = useState(false);

    useEffect(() => {
        if (patientId && user?.clinic_id) {
            loadData();
        }
    }, [patientId, user?.clinic_id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();
            
            // Fetch Patient
            const { data: patientData, error: patientError } = await supabase
                .from('patients')
                .select('*')
                .eq('id', patientId)
                .single();
                
            if (patientError) throw patientError;
            setPatient(patientData);

            // Fetch Capa
            const { data: capaData } = await supabase
                .from('ficha_capa_psicomotricidade')
                .select('*, users:profissional_referencia(full_name)')
                .eq('paciente_id', patientId)
                .maybeSingle();
                
            setCapa(capaData);

            // Fetch Sessions with Objetivos
            const { data: sessionData } = await supabase
                .from('sessoes_psicomotricidade')
                .select('*, users:profissional_id(full_name), sessao_objetivos(*)')
                .eq('paciente_id', patientId)
                .order('created_at', { ascending: false });
                
            setSessions(sessionData || []);

            // Fetch Paciente Objetivos
            const { data: pacObj } = await supabase
                .from('paciente_objetivos')
                .select('*, biblioteca:objetivos_biblioteca(*)')
                .eq('paciente_id', patientId);
                
            setObjetivos(pacObj || []);
        } catch (error: any) {
            console.error('Error loading psicomotricidade data', error);
            toast.error('Erro ao carregar dados: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCapa = async () => {
        if (!user?.clinic_id) return;
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('ficha_capa_psicomotricidade')
                .insert({
                    paciente_id: patientId,
                    clinica_id: user.clinic_id,
                    profissional_referencia: user.id,
                    inicio_acompanhamento: new Date().toISOString().split('T')[0],
                });

            if (error) throw error;
            toast.success('Ficha Capa criada com sucesso!');
            loadData();
        } catch (error: any) {
            console.error('Error creating capa', error);
            toast.error('Erro ao criar ficha: ' + error.message);
        }
    };

    const handleCreateSession = async () => {
        if (!user?.clinic_id) return;
        setIsCreatingSession(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('sessoes_psicomotricidade')
                .insert({
                    clinica_id: user.clinic_id,
                    paciente_id: patientId,
                    profissional_id: user.id,
                    status_sessao: 'rascunho'
                })
                .select()
                .single();

            if (error) throw error;
            
            toast.success('Sessão iniciada (rascunho)');
            router.push(`/dashboard/pacientes/${patientId}/psicomotricidade/sessao/${data.id}`);
        } catch (error: any) {
            console.error('Error creating session', error);
            toast.error('Erro ao iniciar sessão: ' + error.message);
        } finally {
            setIsCreatingSession(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container py-8 flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="container py-8 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-bold">Paciente não encontrado</h2>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>Voltar</Button>
            </div>
        );
    }

    return (
        <div className="container py-8 space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/pacientes/${patientId}`)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar ao Paciente
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            Acompanhamento de Psicomotricidade
                        </h1>
                        <p className="text-muted-foreground">
                            {patient.full_name}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push(`/dashboard/pacientes/${patientId}/psicomotricidade/objetivos`)}>
                        <Target className="w-4 h-4 mr-2" />
                        Gerenciar Objetivos
                    </Button>
                    <Button onClick={handleCreateSession} disabled={isCreatingSession}>
                        {isCreatingSession ? (
                            <span className="animate-pulse">Iniciando...</span>
                        ) : (
                            <>
                                <Plus className="w-4 h-4 mr-2" />
                                Iniciar Nova Sessão
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
                {/* Informações da Capa */}
                <div className="md:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Dados Clínicos
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!capa ? (
                                <div className="text-center py-4 space-y-3">
                                    <p className="text-sm text-muted-foreground">Ficha de acompanhamento não inicializada.</p>
                                    <div className="flex flex-col gap-2">
                                        <Button variant="default" size="sm" onClick={() => router.push(`/dashboard/pacientes/${patientId}/psicomotricidade/editar-capa`)}>
                                            <FileText className="w-4 h-4 mr-2" />
                                            Criar Ficha Capa
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div>
                                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                                            Diagnóstico/Hipótese
                                        </span>
                                        <p className="font-medium">{capa.diagnostico_hipotese || 'Não informado'}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                                            Responsável Legal
                                        </span>
                                        <p className="font-medium">{capa.responsavel_legal || 'Não informado'}</p>
                                        <p className="text-sm text-muted-foreground">{capa.contato_responsavel}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                                            Profissional Referência
                                        </span>
                                        <p className="font-medium">{capa.users?.full_name || 'Não atribuído'}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                                            Início do Acompanhamento
                                        </span>
                                        <p className="font-medium">
                                            {capa.inicio_acompanhamento 
                                                ? new Date(capa.inicio_acompanhamento).toLocaleDateString('pt-BR') 
                                                : 'Não informado'}
                                        </p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider block mb-1">
                                            Frequência
                                        </span>
                                        <p className="font-medium">{capa.frequencia_sessoes || 'Não informada'}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="w-full mt-2" onClick={() => router.push(`/dashboard/pacientes/${patientId}/psicomotricidade/editar-capa`)}>
                                        Editar Capa
                                    </Button>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Histórico de Sessões */}
                <div className="md:col-span-2">
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Histórico de Sessões
                            </CardTitle>
                            <CardDescription>
                                {sessions.length} sessão(ões) registrada(s) para este paciente.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {sessions.length === 0 ? (
                                <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                                    <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Nenhuma sessão registrada</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Clique em "Iniciar Nova Sessão" para começar o acompanhamento.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sessions.map((sessao) => (
                                        <div 
                                            key={sessao.id} 
                                            className="flex items-center justify-between p-4 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/dashboard/pacientes/${patientId}/psicomotricidade/sessao/${sessao.id}`)}
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                                        {new Date(sessao.created_at).toLocaleDateString('pt-BR')}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground flex items-center">
                                                        <Clock className="w-3 h-3 mr-1" />
                                                        {new Date(sessao.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                    <span>{sessao.users?.full_name || 'Profissional não identificado'}</span>
                                                    <span>•</span>
                                                    <span className="capitalize">{sessao.tipo_sessao || 'Não definido'}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <Badge variant={sessao.status_sessao === 'encerrada' ? 'default' : 'secondary'} className="capitalize">
                                                    {sessao.status_sessao}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Evolução */}
            <EvolucaoGrafico sessoes={sessions} objetivos={objetivos} />
        </div>
    );
}
