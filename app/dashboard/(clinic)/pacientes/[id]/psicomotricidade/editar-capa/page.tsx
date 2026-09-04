'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function EditarCapaPsicomotricidadePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const patientId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [patient, setPatient] = useState<any>(null);

    // Form fields
    const [diagnosticoHipotese, setDiagnosticoHipotese] = useState('');
    const [responsavelLegal, setResponsavelLegal] = useState('');
    const [contatoResponsavel, setContatoResponsavel] = useState('');
    const [inicioAcompanhamento, setInicioAcompanhamento] = useState('');
    const [frequenciaSessoes, setFrequenciaSessoes] = useState('');
    const [duracaoPadrao, setDuracaoPadrao] = useState<number | ''>('');
    const [resumoClinico, setResumoClinico] = useState('');

    useEffect(() => {
        if (patientId && user?.clinic_id) {
            loadCapa();
        }
    }, [patientId, user?.clinic_id]);

    const loadCapa = async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();

            // Buscar dados do paciente
            const { data: patientData, error: pErr } = await supabase
                .from('patients')
                .select('id, full_name')
                .eq('id', patientId)
                .single();
            if (pErr) throw pErr;
            setPatient(patientData);

            // Buscar capa existente (se houver)
            const { data: capaData } = await supabase
                .from('ficha_capa_psicomotricidade')
                .select('*')
                .eq('paciente_id', patientId)
                .maybeSingle();

            if (capaData) {
                setDiagnosticoHipotese(capaData.diagnostico_hipotese || '');
                setResponsavelLegal(capaData.responsavel_legal || '');
                setContatoResponsavel(capaData.contato_responsavel || '');
                setInicioAcompanhamento(capaData.inicio_acompanhamento || '');
                setFrequenciaSessoes(capaData.frequencia_sessoes || '');
                setDuracaoPadrao(capaData.duracao_padrao_sessao || '');
                setResumoClinico(capaData.resumo_clinico_objetivos || '');
            } else {
                setInicioAcompanhamento(new Date().toISOString().split('T')[0]);
            }
        } catch (error: any) {
            console.error('Erro ao carregar dados da capa:', error);
            toast.error('Erro ao carregar dados: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.clinic_id) {
            toast.error('Clínica não identificada');
            return;
        }

        setIsSaving(true);
        try {
            const supabase = createClient();
            const payload = {
                paciente_id: patientId,
                clinica_id: user.clinic_id,
                diagnostico_hipotese: diagnosticoHipotese || null,
                responsavel_legal: responsavelLegal || null,
                contato_responsavel: contatoResponsavel || null,
                profissional_referencia: user.id,
                inicio_acompanhamento: inicioAcompanhamento || null,
                frequencia_sessoes: frequenciaSessoes || null,
                duracao_padrao_sessao: duracaoPadrao !== '' ? Number(duracaoPadrao) : null,
                resumo_clinico_objetivos: resumoClinico || null,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('ficha_capa_psicomotricidade')
                .upsert(payload, { onConflict: 'paciente_id' });

            if (error) throw error;

            toast.success('Ficha Capa salva com sucesso!');
            router.push(`/dashboard/pacientes/${patientId}/psicomotricidade`);
        } catch (error: any) {
            console.error('Erro ao salvar capa:', error);
            toast.error('Erro ao salvar Ficha Capa: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="container py-8 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="container py-8 space-y-6 max-w-3xl">
            <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/pacientes/${patientId}/psicomotricidade`)}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar para Psicomotricidade
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl">Ficha Capa de Psicomotricidade</CardTitle>
                    <CardDescription>
                        Informações cadastrais e acompanhamento clínico de {patient?.full_name}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSave} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="diagnostico">Diagnóstico / Hipótese Diagnóstica</Label>
                            <Input
                                id="diagnostico"
                                placeholder="Ex: TEA Nível 1 de suporte, Transtorno do Desenvolvimento da Coordenação"
                                value={diagnosticoHipotese}
                                onChange={e => setDiagnosticoHipotese(e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="responsavel">Responsável Legal</Label>
                                <Input
                                    id="responsavel"
                                    placeholder="Nome do pai / mãe / tutor"
                                    value={responsavelLegal}
                                    onChange={e => setResponsavelLegal(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contato">Contato do Responsável</Label>
                                <Input
                                    id="contato"
                                    placeholder="Telefone / WhatsApp"
                                    value={contatoResponsavel}
                                    onChange={e => setContatoResponsavel(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="inicio">Início do Acompanhamento</Label>
                                <Input
                                    id="inicio"
                                    type="date"
                                    value={inicioAcompanhamento}
                                    onChange={e => setInicioAcompanhamento(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="frequencia">Frequência das Sessões</Label>
                                <Input
                                    id="frequencia"
                                    placeholder="Ex: 2x por semana"
                                    value={frequenciaSessoes}
                                    onChange={e => setFrequenciaSessoes(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="duracao">Duração Padrão (minutos)</Label>
                                <Input
                                    id="duracao"
                                    type="number"
                                    placeholder="Ex: 50"
                                    value={duracaoPadrao}
                                    onChange={e => setDuracaoPadrao(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="resumo">Resumo Clínico e Objetivos Principais</Label>
                            <Textarea
                                id="resumo"
                                rows={4}
                                placeholder="Descreva brevemente o histórico, foco de intervenção psicomotora e necessidades sensório-motoras..."
                                value={resumoClinico}
                                onChange={e => setResumoClinico(e.target.value)}
                            />
                        </div>

                        <div className="pt-4 flex justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.push(`/dashboard/pacientes/${patientId}/psicomotricidade`)}
                            >
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                        Salvando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Salvar Ficha Capa
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
