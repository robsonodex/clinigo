'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/use-user';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Plus, Target, CheckCircle2, XCircle, AlertCircle, PlayCircle, Loader2, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export default function PacienteObjetivosPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const patientId = params.id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [objetivos, setObjetivos] = useState<any[]>([]);
    const [biblioteca, setBiblioteca] = useState<any[]>([]);
    const [patient, setPatient] = useState<any>(null);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBibId, setSelectedBibId] = useState('');
    const [criterioTexto, setCriterioTexto] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (patientId && user?.clinic_id) {
            loadData();
        }
    }, [patientId, user?.clinic_id]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();
            
            // Patient Info
            const { data: patientData } = await supabase
                .from('patients')
                .select('full_name')
                .eq('id', patientId)
                .single();
            setPatient(patientData);

            // Fetch Paciente Objetivos
            const { data: pacObj } = await supabase
                .from('paciente_objetivos')
                .select('*, biblioteca:objetivos_biblioteca(*)')
                .eq('paciente_id', patientId)
                .order('created_at', { ascending: false });
                
            setObjetivos(pacObj || []);

            // Fetch Biblioteca for modal
            const { data: bibData } = await supabase
                .from('objetivos_biblioteca')
                .select('*')
                .eq('clinica_id', user?.clinic_id)
                .eq('ativo', true)
                .order('codigo');
            
            setBiblioteca(bibData || []);
        } catch (error: any) {
            console.error('Error loading data', error);
            toast.error('Erro ao carregar objetivos: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddObjetivo = async () => {
        if (!selectedBibId || !criterioTexto) {
            toast.error('Selecione um objetivo e defina o critério');
            return;
        }
        
        setIsSaving(true);
        try {
            const bibItem = biblioteca.find(b => b.id === selectedBibId);
            const supabase = createClient();
            const { error } = await supabase
                .from('paciente_objetivos')
                .insert({
                    clinica_id: user?.clinic_id,
                    paciente_id: patientId,
                    objetivo_id: selectedBibId,
                    objetivo_versao: bibItem.versao,
                    criterio_texto_gerado: criterioTexto,
                    parametros_definidos: [],
                    profissional_id: user?.id,
                    status: 'ativo'
                });

            if (error) throw error;
            
            toast.success('Objetivo adicionado com sucesso!');
            setIsModalOpen(false);
            setSelectedBibId('');
            setCriterioTexto('');
            loadData();
        } catch (error: any) {
            console.error('Error adding goal', error);
            toast.error('Erro ao adicionar objetivo: ' + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        try {
            const supabase = createClient();
            const { error } = await supabase
                .from('paciente_objetivos')
                .update({ status: newStatus, data_status: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
            toast.success(`Status atualizado para ${newStatus}`);
            loadData();
        } catch (error: any) {
            toast.error('Erro ao atualizar status: ' + error.message);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'ativo': return <Badge className="bg-emerald-500">Ativo</Badge>;
            case 'adquirido': return <Badge variant="secondary" className="bg-blue-500 text-white">Adquirido</Badge>;
            case 'suspenso': return <Badge variant="outline" className="text-amber-600 border-amber-600">Suspenso</Badge>;
            case 'descontinuado': return <Badge variant="destructive">Descontinuado</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    if (isLoading) {
        return (
            <div className="container py-8 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const selectedBib = biblioteca.find(b => b.id === selectedBibId);

    return (
        <div className="container py-8 space-y-6 max-w-5xl">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/pacientes/${patientId}/psicomotricidade`)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Voltar
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                            Objetivos do Paciente
                        </h1>
                        <p className="text-muted-foreground">
                            {patient?.full_name}
                        </p>
                    </div>
                </div>
                
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar Objetivo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Vincular Novo Objetivo</DialogTitle>
                            <DialogDescription>
                                Selecione um objetivo da biblioteca da clínica e defina os critérios para este paciente.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Objetivo da Biblioteca</Label>
                                <Select value={selectedBibId} onValueChange={setSelectedBibId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione um objetivo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {biblioteca.map(b => (
                                            <SelectItem key={b.id} value={b.id}>
                                                <span className="font-mono mr-2">{b.codigo}</span> - {b.categoria}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            {selectedBib && (
                                <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-md text-sm">
                                    <span className="font-semibold block mb-1">Template Base:</span>
                                    {selectedBib.descricao_template}
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label>Critério Definido para o Paciente</Label>
                                <Textarea 
                                    placeholder="Ex: Permanência em atividade motora dirigida (5 min, máx. 2 redirecionamentos)"
                                    value={criterioTexto}
                                    onChange={e => setCriterioTexto(e.target.value)}
                                    rows={3}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Preencha o critério exato que o profissional usará para avaliar o desempenho.
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                            <Button onClick={handleAddObjetivo} disabled={isSaving || !selectedBibId || !criterioTexto}>
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                Salvar Objetivo
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Lista de Objetivos */}
            <div className="space-y-4">
                {objetivos.length === 0 ? (
                    <Card>
                        <CardContent className="py-12 flex flex-col items-center justify-center text-center">
                            <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
                            <h3 className="text-lg font-medium text-slate-700">Nenhum objetivo definido</h3>
                            <p className="text-muted-foreground mb-4 max-w-sm">
                                Este paciente ainda não possui objetivos terapêuticos mapeados.
                            </p>
                            <Button onClick={() => setIsModalOpen(true)} variant="outline">
                                <Plus className="w-4 h-4 mr-2" /> Começar a adicionar
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    objetivos.map(obj => (
                        <Card key={obj.id} className="overflow-hidden">
                            <div className="border-l-4 border-l-primary flex flex-col md:flex-row md:items-center justify-between p-4 gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {obj.biblioteca?.codigo || 'N/A'}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider">
                                            {obj.biblioteca?.categoria || 'Categoria Indefinida'}
                                        </span>
                                        {getStatusBadge(obj.status)}
                                    </div>
                                    <p className="text-slate-800 dark:text-slate-100 font-medium">
                                        {obj.criterio_texto_gerado}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Definido em: {new Date(obj.data_definicao).toLocaleDateString('pt-BR')}
                                    </p>
                                </div>
                                
                                <div className="flex gap-2 shrink-0">
                                    {obj.status === 'ativo' ? (
                                        <>
                                            <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(obj.id, 'adquirido')} className="text-blue-600">
                                                <CheckCircle2 className="w-4 h-4 mr-1" /> Marcar Adquirido
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(obj.id, 'descontinuado')} className="text-red-600">
                                                <XCircle className="w-4 h-4 mr-1" /> Descontinuar
                                            </Button>
                                        </>
                                    ) : (
                                        <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(obj.id, 'ativo')}>
                                            <PlayCircle className="w-4 h-4 mr-1" /> Reativar
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
