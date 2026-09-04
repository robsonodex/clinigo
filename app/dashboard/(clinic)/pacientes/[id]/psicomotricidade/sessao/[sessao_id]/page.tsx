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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, CheckCircle2, AlertCircle, Plus, Trash2, Calculator, Loader2, BookOpen, Search, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { OBJETIVOS_WORLD_SENSORY_CATALOGO, CATEGORIAS_OBJETIVOS_ORDEM, ObjetivoCatalogoItem } from '@/components/psicomotricidade/catalogo-objetivos';

// 1. Opções da Condição Inicial
const CONDICOES_INICIAIS_OPCOES = [
    { id: 'regulado', label: 'Regulado e disponível' },
    { id: 'agitado', label: 'Agitado' },
    { id: 'baixa_ativacao', label: 'Baixa ativação/sonolência' },
    { id: 'irritado', label: 'Irritado' },
    { id: 'choroso', label: 'Choroso' },
    { id: 'esquiva', label: 'Comportamento de esquiva' },
    { id: 'dificuldade_transicao', label: 'Dificuldade de transição' },
    { id: 'busca_movimento', label: 'Busca intensa por movimento' },
];

// 4. Estratégias de Intervenção
const ESTRATEGIAS_ORGANIZACAO = [
    'Rotina visual',
    'Primeiro/depois',
    'Antecipação de mudanças',
    'Escolha entre atividades',
    'Timer',
    'Delimitação visual do ambiente',
    'Redução de distratores',
    'Alternância fácil/difícil',
    'Intercalar preferida/não preferida',
    'Pausas programadas',
    'Adaptação ambiental'
];

const ESTRATEGIAS_ENSINO = [
    'Instrução verbal',
    'Modelagem',
    'Imitação',
    'Pista visual',
    'Pista gestual',
    'Ajuda física parcial',
    'Ajuda física total',
    'Encadeamento',
    'Análise de tarefa',
    'Prática repetida',
    'Ensino em ambiente natural',
    'Treino em circuito',
    'Redução sistemática de prompts',
    'Aumento gradual da dificuldade',
    'Repetição com variação de contexto'
];

const ESTRATEGIAS_MOTIVACIONAIS = [
    'Reforçamento positivo',
    'Reforçamento diferencial',
    'Reforço social',
    'Sistema de fichas',
    'Acesso a atividade preferida',
    'Oferta de escolhas',
    'Princípio de Premack',
    'Redução temporária da exigência',
    'Intercalar adquiridas/em aquisição',
    'Treino de comunicação funcional',
    'Redirecionamento',
    'Reforço por permanência/engajamento',
    'Reforço por cooperação'
];

// 7. Intercorrências
const INTERCORRENCIAS_OPCOES = [
    'Sem intercorrências relevantes',
    'Cansaço',
    'Sono',
    'Fome',
    'Dor/desconforto',
    'Agitação',
    'Choro',
    'Recusa',
    'Fuga/esquiva',
    'Agressividade',
    'Autoagressão',
    'Alteração de rotina',
    'Dificuldade de transição',
    'Motivação reduzida'
];

// 9. Decisão para Próxima Sessão
const DECISAO_PROXIMA_OPCOES = [
    'Manter objetivo e critério',
    'Manter objetivo e reduzir prompts',
    'Aumentar critério de desempenho',
    'Aumentar complexidade',
    'Aumentar distância',
    'Aumentar duração',
    'Aumentar nº de repetições',
    'Aumentar nº de etapas',
    'Introduzir variação/generalização',
    'Reduzir temporariamente a dificuldade',
    'Modificar estratégia de ensino',
    'Modificar reforçadores',
    'Suspender temporariamente o objetivo',
    'Discutir em supervisão',
    'Inserir novo objetivo'
];

export default function SessaoPsicomotricidadePage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    
    const patientId = params.id as string;
    const sessaoId = params.sessao_id as string;

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [sessao, setSessao] = useState<any>(null);
    const [patient, setPatient] = useState<any>(null);

    // Header da Sessão
    const [tipoSessao, setTipoSessao] = useState('individual');
    const [ambiente, setAmbiente] = useState('interno');
    const [tempoSessao, setTempoSessao] = useState<number | ''>('');
    const [dataSessao, setDataSessao] = useState('');

    // 1. Condição Inicial
    const [condicaoInicial, setCondicaoInicial] = useState<string[]>([]);
    const [condicaoInicialOutro, setCondicaoInicialOutro] = useState('');
    const [observacoesIniciais, setObservacoesIniciais] = useState('');

    // 4. Estratégias de Intervenção (Checkboxes)
    const [estrategiasOrg, setEstrategiasOrg] = useState<string[]>([]);
    const [estrategiasEns, setEstrategiasEns] = useState<string[]>([]);
    const [estrategiasMot, setEstrategiasMot] = useState<string[]>([]);
    const [estrategiasMotOutra, setEstrategiasMotOutra] = useState('');

    // 5. Planejamento da Sessão (5 Etapas)
    const [etapas, setEtapas] = useState<any[]>([
        { etapa: '1 · Acolhimento e organização', tempo: '', atividade: '', objetivoCodigo: '', observacoes: '' },
        { etapa: '2 · Preparação motora / aquecimento', tempo: '', atividade: '', objetivoCodigo: '', observacoes: '' },
        { etapa: '3 · Atividade principal', tempo: '', atividade: '', objetivoCodigo: '', observacoes: '' },
        { etapa: '4 · Atividade principal / generalização', tempo: '', atividade: '', objetivoCodigo: '', observacoes: '' },
        { etapa: '5 · Encerramento e transição', tempo: '', atividade: '', objetivoCodigo: '', observacoes: '' }
    ]);
    const [transicaoChecks, setTransicaoChecks] = useState<string[]>([]);
    const [transicaoOutro, setTransicaoOutro] = useState('');

    // 3 & 6. Objetivos da Sessão (Até 4 prioritários)
    const [pacienteObjetivos, setPacienteObjetivos] = useState<any[]>([]);
    const [sessaoObjetivos, setSessaoObjetivos] = useState<any[]>([]);
    const [isCatalogoOpen, setIsCatalogoOpen] = useState(false);
    const [catalogoBusca, setCatalogoBusca] = useState('');
    const [catalogoCategoriaFiltro, setCatalogoCategoriaFiltro] = useState('todas');
    const [isCustomObjOpen, setIsCustomObjOpen] = useState(false);
    const [customCodigo, setCustomCodigo] = useState('');
    const [customCategoria, setCustomCategoria] = useState('');
    const [customCriterio, setCustomCriterio] = useState('');

    // 7. Intercorrências
    const [intercorrencias, setIntercorrencias] = useState<string[]>([]);
    const [intercorrenciaOutro, setIntercorrenciaOutro] = useState('');
    const [descricaoIntercorrencia, setDescricaoIntercorrencia] = useState('');

    // 8. Análise Clínica
    const [favoreceuDesempenho, setFavoreceuDesempenho] = useState('');
    const [dificuldadesObservadas, setDificuldadesObservadas] = useState('');
    const [alterouPlanejamento, setAlterouPlanejamento] = useState(false);
    const [qualAlteracao, setQualAlteracao] = useState('');
    const [estrategiaMelhorResposta, setEstrategiaMelhorResposta] = useState('');
    const [estrategiaBaixaEfetividade, setEstrategiaBaixaEfetividade] = useState('');

    // 9. Decisão para Próxima Sessão
    const [decisaoProxima, setDecisaoProxima] = useState<string[]>([]);
    const [observacoesProxima, setObservacoesProxima] = useState('');

    useEffect(() => {
        if (sessaoId && patientId) {
            loadAll();
        }
    }, [sessaoId, patientId]);

    const loadAll = async () => {
        setIsLoading(true);
        try {
            const supabase = createClient();

            // Paciente
            const { data: pData } = await supabase
                .from('patients')
                .select('id, full_name')
                .eq('id', patientId)
                .single();
            setPatient(pData);

            // Sessão
            const { data, error } = await supabase
                .from('sessoes_psicomotricidade')
                .select('*')
                .eq('id', sessaoId)
                .single();

            if (error) throw error;
            setSessao(data);

            if (data.tipo_sessao) setTipoSessao(data.tipo_sessao);
            if (data.ambiente) setAmbiente(data.ambiente);
            if (data.tempo_sessao_min) setTempoSessao(data.tempo_sessao_min);
            if (data.created_at) setDataSessao(data.created_at.split('T')[0]);

            // Condição inicial
            if (Array.isArray(data.condicao_inicial)) {
                const arr = data.condicao_inicial;
                const outroItem = arr.find((i: string) => i.startsWith('outro:'));
                if (outroItem) {
                    setCondicaoInicialOutro(outroItem.replace('outro:', ''));
                    setCondicaoInicial(arr.filter((i: string) => !i.startsWith('outro:')));
                } else {
                    setCondicaoInicial(arr);
                }
            }
            if (data.observacoes_iniciais) setObservacoesIniciais(data.observacoes_iniciais);

            // Etapas de Planejamento
            if (Array.isArray(data.planejamento_etapas) && data.planejamento_etapas.length > 0) {
                setEtapas(data.planejamento_etapas);
            }

            // Intercorrências
            if (Array.isArray(data.intercorrencias)) {
                const arr = data.intercorrencias;
                const outItem = arr.find((i: string) => i.startsWith('outro:'));
                if (outItem) {
                    setIntercorrenciaOutro(outItem.replace('outro:', ''));
                    setIntercorrencias(arr.filter((i: string) => !i.startsWith('outro:')));
                } else {
                    setIntercorrencias(arr);
                }
            }
            if (data.descricao_intercorrencia) setDescricaoIntercorrencia(data.descricao_intercorrencia);

            // Análise Clínica
            if (data.favoreceu_desempenho) setFavoreceuDesempenho(data.favoreceu_desempenho);
            if (data.dificuldades_observadas) setDificuldadesObservadas(data.dificuldades_observadas);
            if (data.alterou_planejamento !== null && data.alterou_planejamento !== undefined) setAlterouPlanejamento(data.alterou_planejamento);
            if (data.qual_alteracao) setQualAlteracao(data.qual_alteracao);
            if (data.estrategia_melhor_resposta) setEstrategiaMelhorResposta(data.estrategia_melhor_resposta);
            if (data.estrategia_baixa_efetividade) setEstrategiaBaixaEfetividade(data.estrategia_baixa_efetividade);

            // Decisão próxima
            if (Array.isArray(data.decisao_proxima_sessao)) {
                setDecisaoProxima(data.decisao_proxima_sessao);
            }
            if (data.observacoes_proxima_sessao) setObservacoesProxima(data.observacoes_proxima_sessao);

            // Estratégias salvas na tabela associativa
            const { data: estData } = await supabase
                .from('sessao_estrategias')
                .select('categoria, estrategia')
                .eq('sessao_id', sessaoId);

            if (estData) {
                const org = estData.filter(e => e.categoria === 'organizacao_antecedente').map(e => e.estrategia);
                const ens = estData.filter(e => e.categoria === 'estrategias_ensino').map(e => e.estrategia);
                const mot = estData.filter(e => e.categoria === 'estrategias_motivacionais').map(e => e.estrategia);
                setEstrategiasOrg(org);
                setEstrategiasEns(ens);
                setEstrategiasMot(mot);
            }

            // Paciente Objetivos Ativos
            const { data: pacObj } = await supabase
                .from('paciente_objetivos')
                .select('*, biblioteca:objetivos_biblioteca(*)')
                .eq('paciente_id', patientId)
                .eq('status', 'ativo');
            setPacienteObjetivos(pacObj || []);

            // Sessão Objetivos
            const { data: sessObj } = await supabase
                .from('sessao_objetivos')
                .select('*')
                .eq('sessao_id', sessaoId)
                .order('ordem', { ascending: true });

            if (sessObj && sessObj.length > 0) {
                setSessaoObjetivos(sessObj.map(so => {
                    const pac = (pacObj || []).find(p => p.id === so.paciente_objetivo_id);
                    return {
                        id: so.id,
                        paciente_objetivo_id: so.paciente_objetivo_id || `temp-${so.id}`,
                        codigo: pac?.biblioteca?.codigo || so.criterio_desempenho_esperado?.substring(0, 5) || 'OBJ',
                        categoria: pac?.biblioteca?.categoria || 'Geral',
                        criterio_texto: so.criterio_desempenho_esperado || pac?.criterio_texto_gerado || '',
                        oportunidades: so.oportunidades_apresentadas || 0,
                        respostas: so.respostas_adequadas || 0,
                        nivel_ajuda: so.nivel_ajuda || 'independente',
                        criterio_alcancado: so.criterio_alcancado || 'nao'
                    };
                }));
            } else if (pacObj && pacObj.length > 0) {
                // Sugere automaticamente os primeiros até 4
                const defaultSess = pacObj.slice(0, 4).map(po => ({
                    paciente_objetivo_id: po.id,
                    codigo: po.biblioteca?.codigo || 'OBJ',
                    categoria: po.biblioteca?.categoria || 'Geral',
                    criterio_texto: po.criterio_texto_gerado || '',
                    oportunidades: 0,
                    respostas: 0,
                    nivel_ajuda: 'independente',
                    criterio_alcancado: 'nao'
                }));
                setSessaoObjetivos(defaultSess);
            }

        } catch (error: any) {
            console.error('Erro ao carregar dados da sessão:', error);
            toast.error('Erro ao carregar sessão: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const toggleCondicao = (id: string) => {
        setCondicaoInicial(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleEstrategiaOrg = (item: string) => {
        setEstrategiasOrg(prev => 
            prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
        );
    };

    const toggleEstrategiaEns = (item: string) => {
        setEstrategiasEns(prev => 
            prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
        );
    };

    const toggleEstrategiaMot = (item: string) => {
        setEstrategiasMot(prev => 
            prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
        );
    };

    const toggleIntercorrencia = (item: string) => {
        setIntercorrencias(prev => 
            prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
        );
    };

    const toggleDecisao = (item: string) => {
        setDecisaoProxima(prev => 
            prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
        );
    };

    const toggleTransicaoCheck = (item: string) => {
        setTransicaoChecks(prev => 
            prev.includes(item) ? prev.filter(x => x !== item) : [...prev, item]
        );
    };

    const updateEtapa = (index: number, field: string, value: string) => {
        setEtapas(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    // Adiciona objetivo que já existe na ficha do paciente
    const handleAddObjetivoFromPaciente = (pacObjId: string) => {
        if (sessaoObjetivos.length >= 4) {
            toast.error('Máximo de 4 objetivos prioritários por sessão.');
            return;
        }
        if (sessaoObjetivos.find(so => so.paciente_objetivo_id === pacObjId)) return;
        const pacObj = pacienteObjetivos.find(p => p.id === pacObjId);
        setSessaoObjetivos([...sessaoObjetivos, {
            paciente_objetivo_id: pacObjId,
            codigo: pacObj?.biblioteca?.codigo || 'OBJ',
            categoria: pacObj?.biblioteca?.categoria || 'Geral',
            criterio_texto: pacObj?.criterio_texto_gerado || '',
            oportunidades: 0,
            respostas: 0,
            nivel_ajuda: 'independente',
            criterio_alcancado: 'nao'
        }]);
    };

    // Adiciona objetivo direto do catálogo oficial World Sensory (55 objetivos)
    const handleAddObjetivoFromCatalogo = (item: ObjetivoCatalogoItem) => {
        if (sessaoObjetivos.length >= 4) {
            toast.error('Máximo de 4 objetivos prioritários por sessão.');
            return;
        }
        if (sessaoObjetivos.find(so => so.codigo === item.codigo)) {
            toast.info(`O objetivo ${item.codigo} já está adicionado.`);
            return;
        }
        const tempId = `catalogo-${item.codigo}-${Date.now()}`;
        setSessaoObjetivos(prev => [...prev, {
            paciente_objetivo_id: tempId,
            codigo: item.codigo,
            categoria: item.categoria,
            criterio_texto: item.descricao,
            oportunidades: 0,
            respostas: 0,
            nivel_ajuda: 'independente',
            criterio_alcancado: 'nao'
        }]);
        toast.success(`Objetivo ${item.codigo} adicionado à sessão!`);
    };

    // Adiciona objetivo personalizado
    const handleAddCustomObjetivo = () => {
        if (!customCodigo.trim() || !customCriterio.trim()) {
            toast.error('Preencha ao menos o código e o critério do objetivo.');
            return;
        }
        if (sessaoObjetivos.length >= 4) {
            toast.error('Máximo de 4 objetivos prioritários por sessão.');
            return;
        }
        const tempId = `custom-${Date.now()}`;
        setSessaoObjetivos(prev => [...prev, {
            paciente_objetivo_id: tempId,
            codigo: customCodigo.trim().toUpperCase(),
            categoria: customCategoria.trim() || 'Personalizado',
            criterio_texto: customCriterio.trim(),
            oportunidades: 0,
            respostas: 0,
            nivel_ajuda: 'independente',
            criterio_alcancado: 'nao'
        }]);
        setCustomCodigo('');
        setCustomCategoria('');
        setCustomCriterio('');
        setIsCustomObjOpen(false);
        toast.success('Objetivo personalizado adicionado!');
    };

    const handleRemoveObjetivo = (pacObjId: string) => {
        setSessaoObjetivos(sessaoObjetivos.filter(so => so.paciente_objetivo_id !== pacObjId));
    };

    const updateObjetivoCriterio = (pacObjId: string, novoCriterio: string) => {
        setSessaoObjetivos(prev => prev.map(so => {
            if (so.paciente_objetivo_id === pacObjId) {
                return { ...so, criterio_texto: novoCriterio };
            }
            return so;
        }));
    };

    const updateObjetivo = (pacObjId: string, field: string, value: any) => {
        setSessaoObjetivos(prev => prev.map(so => {
            if (so.paciente_objetivo_id === pacObjId) {
                const updated = { ...so, [field]: value };
                if (field === 'oportunidades' || field === 'respostas') {
                    if (updated.respostas > updated.oportunidades) {
                        updated.respostas = updated.oportunidades;
                    }
                    const perc = updated.oportunidades > 0 ? (updated.respostas / updated.oportunidades) * 100 : 0;
                    if (perc >= 80) {
                        updated.criterio_alcancado = 'sim';
                    } else if (perc >= 50) {
                        updated.criterio_alcancado = 'parcial';
                    } else {
                        updated.criterio_alcancado = 'nao';
                    }
                }
                return updated;
            }
            return so;
        }));
    };

    const handleSave = async (encerrar = false) => {
        setIsSaving(true);
        try {
            const supabase = createClient();

            // Monta lista de condições com campo 'outro'
            const condFinal = [...condicaoInicial];
            if (condicaoInicialOutro.trim()) {
                condFinal.push(`outro:${condicaoInicialOutro.trim()}`);
            }

            // Intercorrências com outro
            const interFinal = [...intercorrencias];
            if (intercorrenciaOutro.trim()) {
                interFinal.push(`outro:${intercorrenciaOutro.trim()}`);
            }

            // Payload da sessão
            const sessionPayload: any = {
                tipo_sessao: tipoSessao,
                ambiente: ambiente,
                tempo_sessao_min: tempoSessao === '' ? null : Number(tempoSessao),
                condicao_inicial: condFinal,
                observacoes_iniciais: observacoesIniciais || null,
                planejamento_etapas: etapas,
                intercorrencias: interFinal,
                descricao_intercorrencia: descricaoIntercorrencia || null,
                favoreceu_desempenho: favoreceuDesempenho || null,
                dificuldades_observadas: dificuldadesObservadas || null,
                alterou_planejamento: alterouPlanejamento,
                qual_alteracao: alterouPlanejamento ? qualAlteracao : null,
                estrategia_melhor_resposta: estrategiaMelhorResposta || null,
                estrategia_baixa_efetividade: estrategiaBaixaEfetividade || null,
                decisao_proxima_sessao: decisaoProxima,
                observacoes_proxima_sessao: observacoesProxima || null,
                status_sessao: encerrar ? 'encerrada' : 'rascunho',
                updated_at: new Date().toISOString(),
                ...(encerrar ? { encerrada_em: new Date().toISOString() } : {})
            };

            const { error: sessErr } = await supabase
                .from('sessoes_psicomotricidade')
                .update(sessionPayload)
                .eq('id', sessaoId);

            if (sessErr) throw sessErr;

            // Salvar Estratégias
            await supabase.from('sessao_estrategias').delete().eq('sessao_id', sessaoId);
            const estInserts: any[] = [];
            estrategiasOrg.forEach(e => estInserts.push({ sessao_id: sessaoId, clinica_id: user?.clinic_id, categoria: 'organizacao_antecedente', estrategia: e }));
            estrategiasEns.forEach(e => estInserts.push({ sessao_id: sessaoId, clinica_id: user?.clinic_id, categoria: 'estrategias_ensino', estrategia: e }));
            estrategiasMot.forEach(e => estInserts.push({ sessao_id: sessaoId, clinica_id: user?.clinic_id, categoria: 'estrategias_motivacionais', estrategia: e }));
            if (estrategiasMotOutra.trim()) {
                estInserts.push({ sessao_id: sessaoId, clinica_id: user?.clinic_id, categoria: 'estrategias_motivacionais', estrategia: `Outra: ${estrategiasMotOutra.trim()}` });
            }

            if (estInserts.length > 0) {
                await supabase.from('sessao_estrategias').insert(estInserts);
            }

            // Salvar Objetivos
            await supabase.from('sessao_objetivos').delete().eq('sessao_id', sessaoId);
            if (sessaoObjetivos.length > 0) {
                const objInserts: any[] = [];
                for (let idx = 0; idx < sessaoObjetivos.length; idx++) {
                    const so = sessaoObjetivos[idx];
                    let pacObjId = so.paciente_objetivo_id;
                    let objId = null;
                    let objVersao = 1;

                    // Se for um objetivo temporário (adicionado direto do catálogo ou personalizado)
                    if (String(pacObjId).startsWith('catalogo-') || String(pacObjId).startsWith('custom-') || String(pacObjId).startsWith('temp-')) {
                        // Busca se já existe um objetivo na biblioteca correspondente
                        const { data: bibItem } = await supabase
                            .from('objetivos_biblioteca')
                            .select('id, versao')
                            .eq('codigo', so.codigo)
                            .maybeSingle();

                        objId = bibItem?.id || null;
                        objVersao = bibItem?.versao || 1;

                        // Cria o registro correspondente em paciente_objetivos para manter a integridade
                        const { data: newPacObj, error: newPacErr } = await supabase
                            .from('paciente_objetivos')
                            .insert({
                                clinica_id: user?.clinic_id,
                                paciente_id: patientId,
                                objetivo_id: objId,
                                objetivo_versao: objVersao,
                                criterio_texto_gerado: so.criterio_texto || `${so.codigo} - ${so.categoria}`,
                                parametros_definidos: [],
                                profissional_id: user?.id,
                                status: 'ativo'
                            })
                            .select('id')
                            .single();

                        if (!newPacErr && newPacObj) {
                            pacObjId = newPacObj.id;
                        }
                    } else {
                        const pacObj = pacienteObjetivos.find(p => p.id === pacObjId);
                        objId = pacObj?.objetivo_id || null;
                        objVersao = pacObj?.objetivo_versao || 1;
                    }

                    const perc = so.oportunidades > 0 ? (so.respostas / so.oportunidades) * 100 : 0;
                    objInserts.push({
                        sessao_id: sessaoId,
                        clinica_id: user?.clinic_id,
                        paciente_objetivo_id: pacObjId,
                        objetivo_id: objId,
                        objetivo_versao: objVersao,
                        ordem: idx + 1,
                        criterio_desempenho_esperado: so.criterio_texto || '',
                        oportunidades_apresentadas: so.oportunidades || 0,
                        respostas_adequadas: so.respostas || 0,
                        percentual_acerto: perc,
                        nivel_ajuda: so.nivel_ajuda || 'independente',
                        criterio_alcancado: so.criterio_alcancado || 'nao'
                    });
                }

                if (objInserts.length > 0) {
                    await supabase.from('sessao_objetivos').insert(objInserts);
                }
            }

            toast.success(encerrar ? 'Sessão encerrada com sucesso!' : 'Plano de sessão salvo com sucesso!');
            if (encerrar) {
                router.push(`/dashboard/pacientes/${patientId}/psicomotricidade`);
            } else {
                loadAll();
            }
        } catch (error: any) {
            console.error('Erro ao salvar sessão:', error);
            toast.error('Erro ao salvar sessão: ' + error.message);
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

    if (!sessao) {
        return (
            <div className="container py-8 text-center">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-bold">Sessão não encontrada</h2>
                <Button variant="outline" className="mt-4" onClick={() => router.back()}>Voltar</Button>
            </div>
        );
    }

    const isEncerrada = sessao.status_sessao === 'encerrada';
    const unaddedObjetivos = pacienteObjetivos.filter(p => !sessaoObjetivos.find(so => so.paciente_objetivo_id === p.id));

    return (
        <div className="container py-6 space-y-6 max-w-6xl pb-32">
            {/* Header Fixo com Ações */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 bg-background/95 backdrop-blur z-20 py-3 border-b">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/pacientes/${patientId}/psicomotricidade`)}>
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Voltar
                    </Button>
                    <div className="min-w-0">
                        <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap overflow-hidden text-ellipsis">
                            PLANO DE SESSÃO — EDUCAÇÃO FÍSICA ESPECIAL / PSICOMOTRICIDADE
                        </h1>
                        <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {patient?.full_name} • {dataSessao} • {isEncerrada ? 'Sessão Encerrada' : 'Rascunho / Em Preenchimento'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => handleSave(false)} disabled={isSaving || isEncerrada}>
                        <Save className="w-4 h-4 mr-2" />
                        Salvar Rascunho
                    </Button>
                    <Button onClick={() => handleSave(true)} disabled={isSaving || isEncerrada} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Encerrar Sessão
                    </Button>
                </div>
            </div>

            {/* CABEÇALHO DO DOCUMENTO — UMA LINHA HORIZONTAL (LADO A LADO) SEM NENHUM CORTE */}
            <Card className="border-t-4 border-t-primary shadow-sm overflow-x-auto">
                <CardContent className="py-3 px-6 min-w-[860px]">
                    <div className="flex items-center justify-between gap-6">
                        {/* Paciente */}
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                PACIENTE:
                            </span>
                            <span className="font-bold text-sm text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                {patient?.full_name || 'Carregando...'}
                            </span>
                        </div>

                        {/* Tipo de Sessão */}
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                SESSÃO:
                            </span>
                            <div className="flex items-center gap-3">
                                {[
                                    { id: 'individual', label: 'Individual' },
                                    { id: 'dupla', label: 'Dupla' },
                                    { id: 'grupo', label: 'Grupo' }
                                ].map(t => (
                                    <label 
                                        key={t.id} 
                                        className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:text-primary"
                                    >
                                        <input
                                            type="radio"
                                            name="tipoSessao"
                                            value={t.id}
                                            checked={tipoSessao === t.id}
                                            onChange={() => setTipoSessao(t.id)}
                                            disabled={isEncerrada}
                                            className="text-primary focus:ring-primary h-4 w-4"
                                        />
                                        <span className="whitespace-nowrap">{t.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Ambiente */}
                        <div className="flex items-center gap-3 shrink-0">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                AMBIENTE:
                            </span>
                            <div className="flex items-center gap-3">
                                {[
                                    { id: 'interno', label: 'Interno' },
                                    { id: 'externo', label: 'Externo' },
                                    { id: 'misto', label: 'Misto' }
                                ].map(a => (
                                    <label 
                                        key={a.id} 
                                        className="inline-flex items-center gap-1.5 text-xs font-medium cursor-pointer hover:text-primary"
                                    >
                                        <input
                                            type="radio"
                                            name="ambiente"
                                            value={a.id}
                                            checked={ambiente === a.id}
                                            onChange={() => setAmbiente(a.id)}
                                            disabled={isEncerrada}
                                            className="text-primary focus:ring-primary h-4 w-4"
                                        />
                                        <span className="whitespace-nowrap">{a.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Tempo de Sessão */}
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                TEMPO DE SESSÃO:
                            </span>
                            <div className="flex items-center gap-1">
                                <Input
                                    type="number"
                                    value={tempoSessao}
                                    onChange={e => setTempoSessao(e.target.value ? Number(e.target.value) : '')}
                                    disabled={isEncerrada}
                                    placeholder="50"
                                    className="w-16 h-8 font-medium text-xs text-center"
                                />
                                <span className="text-xs text-muted-foreground font-medium">min</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 1. CONDIÇÃO INICIAL DO PACIENTE */}
            <Card>
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3 border-b">
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                        1. Condição Inicial do Paciente — Como o paciente chegou para o atendimento?
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {CONDICOES_INICIAIS_OPCOES.map(item => (
                            <label key={item.id} className="flex items-center gap-2 text-sm cursor-pointer p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 transition-colors">
                                <Checkbox
                                    checked={condicaoInicial.includes(item.id)}
                                    onCheckedChange={() => toggleCondicao(item.id)}
                                    disabled={isEncerrada}
                                />
                                <span className="leading-tight">{item.label}</span>
                            </label>
                        ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1">
                        <span className="text-sm font-medium">Outro:</span>
                        <Input
                            placeholder="Descreva outra condição..."
                            value={condicaoInicialOutro}
                            onChange={e => setCondicaoInicialOutro(e.target.value)}
                            disabled={isEncerrada}
                            className="flex-1 h-8"
                        />
                    </div>

                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Observações Iniciais:</Label>
                        <Textarea
                            placeholder="Descreva particularidades do acolhimento..."
                            value={observacoesIniciais}
                            onChange={e => setObservacoesIniciais(e.target.value)}
                            disabled={isEncerrada}
                            rows={2}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* 3. OBJETIVOS PRIORITÁRIOS DESTA SESSÃO (SELEÇÃO 2 A 4) */}
            <Card className="border-l-4 border-l-primary">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3 border-b flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                                3. Objetivos Prioritários Desta Sessão
                            </CardTitle>
                            <Badge variant={sessaoObjetivos.length >= 2 && sessaoObjetivos.length <= 4 ? "default" : "outline"} className="text-xs">
                                {sessaoObjetivos.length}/4 selecionados
                            </Badge>
                        </div>
                        <CardDescription className="text-xs mt-0.5">
                            Selecione de 2 a 4 objetivos mapeados para registrar o desempenho na Seção 6.
                        </CardDescription>
                    </div>

                    {!isEncerrada && (
                        <div className="flex flex-wrap items-center gap-2">
                            {/* Botão Principal: Biblioteca World Sensory (55 Objetivos) */}
                            <Button 
                                type="button"
                                size="sm" 
                                variant="default"
                                className="bg-primary hover:bg-primary/90 text-white shadow-sm h-8 text-xs font-semibold"
                                onClick={() => setIsCatalogoOpen(true)}
                                disabled={sessaoObjetivos.length >= 4}
                            >
                                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                                Biblioteca World Sensory (55)
                            </Button>

                            {/* Dropdown de Objetivos Já Mapeados para o Paciente */}
                            {unaddedObjetivos.length > 0 && sessaoObjetivos.length < 4 && (
                                <Select onValueChange={handleAddObjetivoFromPaciente}>
                                    <SelectTrigger className="w-[180px] h-8 text-xs bg-background">
                                        <SelectValue placeholder="Objetivos do Paciente..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {unaddedObjetivos.map(p => (
                                            <SelectItem key={p.id} value={p.id} className="text-xs">
                                                {p.biblioteca?.codigo} - {p.biblioteca?.categoria}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}

                            {/* Botão Personalizado */}
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => setIsCustomObjOpen(true)}
                                disabled={sessaoObjetivos.length >= 4}
                            >
                                <Plus className="w-3.5 h-3.5 mr-1" />
                                Personalizado
                            </Button>
                        </div>
                    )}
                </CardHeader>

                <CardContent className="pt-4 space-y-3">
                    {sessaoObjetivos.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg bg-slate-50/50 dark:bg-slate-900/30 p-6 space-y-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    Nenhum objetivo prioritário adicionado nesta sessão
                                </p>
                                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                                    Adicione de 2 a 4 objetivos clicando no botão abaixo para preencher os critérios e registrar os desempenhos na Seção 6.
                                </p>
                            </div>
                            {!isEncerrada && (
                                <div className="flex justify-center gap-2 pt-2">
                                    <Button 
                                        type="button"
                                        size="sm" 
                                        className="h-9 px-4 text-xs font-semibold shadow"
                                        onClick={() => setIsCatalogoOpen(true)}
                                    >
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        Abrir Biblioteca World Sensory (55 Objetivos)
                                    </Button>
                                    <Button 
                                        type="button"
                                        size="sm" 
                                        variant="outline"
                                        className="h-9 px-3 text-xs"
                                        onClick={() => setIsCustomObjOpen(true)}
                                    >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Criar Objetivo Manual
                                    </Button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="border rounded-md overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                                <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200">
                                    <tr>
                                        <th className="p-2 w-12 text-center border-r">Nº</th>
                                        <th className="p-2 w-20 border-r">Código</th>
                                        <th className="p-2 w-48 border-r">Objetivo / Categoria</th>
                                        <th className="p-2 border-r">Critério de Desempenho Esperado (Edite parâmetros aqui)</th>
                                        {!isEncerrada && <th className="p-2 w-12 text-center">Ação</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessaoObjetivos.map((so, idx) => (
                                        <tr key={so.paciente_objetivo_id} className="border-t hover:bg-slate-50 dark:hover:bg-slate-900/40">
                                            <td className="p-2 text-center font-bold border-r bg-slate-50/50 dark:bg-slate-900/20">{idx + 1}</td>
                                            <td className="p-2 font-mono font-bold text-primary border-r">{so.codigo || 'OBJ'}</td>
                                            <td className="p-2 border-r font-medium text-slate-700 dark:text-slate-300">
                                                {so.categoria || 'Geral'}
                                            </td>
                                            <td className="p-2 border-r">
                                                <Input
                                                    value={so.criterio_texto || ''}
                                                    onChange={e => updateObjetivoCriterio(so.paciente_objetivo_id, e.target.value)}
                                                    disabled={isEncerrada}
                                                    placeholder="Preencha os valores do critério definidos para a sessão..."
                                                    className="h-8 text-xs w-full bg-white dark:bg-slate-950 font-normal"
                                                />
                                            </td>
                                            {!isEncerrada && (
                                                <td className="p-2 text-center">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                        title="Remover objetivo da sessão"
                                                        onClick={() => handleRemoveObjetivo(so.paciente_objetivo_id)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 4. ESTRATÉGIAS DE INTERVENÇÃO (3 COLUNAS DE CHECKBOXES) */}
            <Card>
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3 border-b">
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                        4. Estratégias de Intervenção
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Coluna 1: Organização Antecedente */}
                        <div className="border rounded-md p-3 space-y-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 border-b pb-1">
                                Organização Antecedente
                            </h4>
                            <div className="space-y-1.5">
                                {ESTRATEGIAS_ORGANIZACAO.map(item => (
                                    <label key={item} className="flex items-center gap-2 text-xs cursor-pointer hover:text-primary">
                                        <Checkbox
                                            checked={estrategiasOrg.includes(item)}
                                            onCheckedChange={() => toggleEstrategiaOrg(item)}
                                            disabled={isEncerrada}
                                        />
                                        <span>{item}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Coluna 2: Estratégias de Ensino */}
                        <div className="border rounded-md p-3 space-y-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 border-b pb-1">
                                Estratégias de Ensino
                            </h4>
                            <div className="space-y-1.5">
                                {ESTRATEGIAS_ENSINO.map(item => (
                                    <label key={item} className="flex items-center gap-2 text-xs cursor-pointer hover:text-primary">
                                        <Checkbox
                                            checked={estrategiasEns.includes(item)}
                                            onCheckedChange={() => toggleEstrategiaEns(item)}
                                            disabled={isEncerrada}
                                        />
                                        <span>{item}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Coluna 3: Estratégias Motivacionais e Comportamentais */}
                        <div className="border rounded-md p-3 space-y-2.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 border-b pb-1">
                                Estratégias Motivacionais e Comportamentais
                            </h4>
                            <div className="space-y-1.5">
                                {ESTRATEGIAS_MOTIVACIONAIS.map(item => (
                                    <label key={item} className="flex items-center gap-2 text-xs cursor-pointer hover:text-primary">
                                        <Checkbox
                                            checked={estrategiasMot.includes(item)}
                                            onCheckedChange={() => toggleEstrategiaMot(item)}
                                            disabled={isEncerrada}
                                        />
                                        <span>{item}</span>
                                    </label>
                                ))}
                                <div className="pt-2 flex items-center gap-2">
                                    <span className="text-xs font-medium">Outra:</span>
                                    <Input
                                        placeholder="Outra estratégia..."
                                        value={estrategiasMotOutra}
                                        onChange={e => setEstrategiasMotOutra(e.target.value)}
                                        disabled={isEncerrada}
                                        className="h-7 text-xs flex-1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 5. PLANEJAMENTO DA SESSÃO (TABELA DE 5 ETAPAS) */}
            <Card>
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3 border-b">
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                        5. Planejamento da Sessão
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="border rounded-md overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-[650px]">
                            <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200">
                                <tr>
                                    <th className="p-2 w-48 border-r">Etapa</th>
                                    <th className="p-2 w-24 border-r">Tempo</th>
                                    <th className="p-2 border-r">Atividade</th>
                                    <th className="p-2 w-32 border-r">Objetivo(s) / Código</th>
                                    <th className="p-2">Observações</th>
                                </tr>
                            </thead>
                            <tbody>
                                {etapas.map((etp, idx) => (
                                    <tr key={idx} className="border-t">
                                        <td className="p-2 font-medium border-r bg-slate-50/50 dark:bg-slate-900/20">
                                            {etp.etapa}
                                        </td>
                                        <td className="p-2 border-r">
                                            <div className="flex items-center gap-1">
                                                <Input
                                                    type="number"
                                                    value={etp.tempo}
                                                    onChange={e => updateEtapa(idx, 'tempo', e.target.value)}
                                                    disabled={isEncerrada}
                                                    placeholder="10"
                                                    className="h-7 text-xs w-16"
                                                />
                                                <span>min</span>
                                            </div>
                                        </td>
                                        <td className="p-2 border-r">
                                            <Input
                                                value={etp.atividade}
                                                onChange={e => updateEtapa(idx, 'atividade', e.target.value)}
                                                disabled={isEncerrada}
                                                placeholder="Descreva a atividade..."
                                                className="h-7 text-xs"
                                            />
                                        </td>
                                        <td className="p-2 border-r">
                                            <Input
                                                value={etp.objetivoCodigo}
                                                onChange={e => updateEtapa(idx, 'objetivoCodigo', e.target.value)}
                                                disabled={isEncerrada}
                                                placeholder="Ex: ERP01"
                                                className="h-7 text-xs"
                                            />
                                        </td>
                                        <td className="p-2">
                                            <Input
                                                value={etp.observacoes}
                                                onChange={e => updateEtapa(idx, 'observacoes', e.target.value)}
                                                disabled={isEncerrada}
                                                placeholder="Observações..."
                                                className="h-7 text-xs"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Encerramento e transição checkboxes */}
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md border text-xs space-y-2">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">
                            5 · Encerramento e Transição — Marcar estratégias aplicadas:
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {[
                                'Organização dos materiais',
                                'Atividade de desaceleração',
                                'Retomar rotina visual',
                                'Aviso de término',
                                'Preparação p/ próxima atividade/terapia',
                                'Feedback ao paciente'
                            ].map(item => (
                                <label key={item} className="flex items-center gap-1.5 cursor-pointer">
                                    <Checkbox
                                        checked={transicaoChecks.includes(item)}
                                        onCheckedChange={() => toggleTransicaoCheck(item)}
                                        disabled={isEncerrada}
                                    />
                                    <span>{item}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 6. REGISTRO OBJETIVO DE DESEMPENHO (CÁLCULO % E NÍVEL DE AJUDA) */}
            <Card className="border-l-4 border-l-emerald-600">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3 border-b flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-2">
                            6. Registro Objetivo de Desempenho
                            <Calculator className="w-4 h-4 text-emerald-600" />
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Cálculo automático de % de acerto, nível de ajuda e alcance do critério baseado nos objetivos selecionados na Seção 3 acima.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="pt-4">
                    {sessaoObjetivos.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg bg-slate-50/50 dark:bg-slate-900/30 p-6 space-y-2">
                            <p className="text-xs text-muted-foreground">
                                Selecione de 2 a 4 objetivos prioritários na Seção 3 acima para liberar as linhas de registro de desempenho aqui.
                            </p>
                            <Button 
                                type="button" 
                                size="sm" 
                                variant="outline" 
                                className="h-8 text-xs font-semibold"
                                onClick={() => setIsCatalogoOpen(true)}
                            >
                                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                                Escolher Objetivos Agora
                            </Button>
                        </div>
                    ) : (
                        <div className="border rounded-md overflow-x-auto shadow-sm">
                            <table className="w-full text-left text-xs border-collapse min-w-[780px]">
                                <thead className="bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-200">
                                    <tr>
                                        <th className="p-2 w-10 text-center border-r">Nº</th>
                                        <th className="p-2 w-20 border-r">Código</th>
                                        <th className="p-2 w-24 border-r">Oport. apres.</th>
                                        <th className="p-2 w-24 border-r">Resp. adeq.</th>
                                        <th className="p-2 w-20 text-center border-r">% Acerto</th>
                                        <th className="p-2 border-r">Maior nível de ajuda necessário</th>
                                        <th className="p-2 w-36 text-center">Critério alcançado?</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sessaoObjetivos.map((so, idx) => {
                                        const perc = so.oportunidades > 0 ? (so.respostas / so.oportunidades) * 100 : 0;
                                        return (
                                            <tr key={so.paciente_objetivo_id} className="border-t hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                                                <td className="p-2 text-center font-bold border-r bg-slate-50/50 dark:bg-slate-900/20">{idx + 1}</td>
                                                <td className="p-2 font-mono font-bold text-primary border-r">{so.codigo || 'OBJ'}</td>
                                                <td className="p-2 border-r">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        value={so.oportunidades}
                                                        onChange={e => updateObjetivo(so.paciente_objetivo_id, 'oportunidades', Number(e.target.value))}
                                                        disabled={isEncerrada}
                                                        className="h-8 text-xs w-20 text-center font-medium bg-white dark:bg-slate-950"
                                                    />
                                                </td>
                                                <td className="p-2 border-r">
                                                    <Input
                                                        type="number"
                                                        min={0}
                                                        max={so.oportunidades}
                                                        value={so.respostas}
                                                        onChange={e => updateObjetivo(so.paciente_objetivo_id, 'respostas', Number(e.target.value))}
                                                        disabled={isEncerrada}
                                                        className="h-8 text-xs w-20 text-center font-medium bg-white dark:bg-slate-950"
                                                    />
                                                </td>
                                                <td className="p-2 text-center border-r font-bold text-sm">
                                                    <span className={perc >= 80 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded' : perc >= 50 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded' : 'text-slate-600'}>
                                                        {perc.toFixed(0)}%
                                                    </span>
                                                </td>
                                                <td className="p-2 border-r">
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                                        {[
                                                            { id: 'independente', label: 'Independente' },
                                                            { id: 'pista_visual', label: 'Pista visual' },
                                                            { id: 'pista_gestual', label: 'Pista gestual' },
                                                            { id: 'pista_verbal', label: 'Pista verbal' },
                                                            { id: 'ajuda_fisica_parcial', label: 'Ajuda física parcial' },
                                                            { id: 'ajuda_fisica_total', label: 'Ajuda física total' }
                                                        ].map(na => (
                                                            <label key={na.id} className="flex items-center gap-1.5 text-[11px] cursor-pointer hover:text-primary">
                                                                <input
                                                                    type="radio"
                                                                    name={`ajuda_${so.paciente_objetivo_id}`}
                                                                    value={na.id}
                                                                    checked={so.nivel_ajuda === na.id}
                                                                    onChange={() => updateObjetivo(so.paciente_objetivo_id, 'nivel_ajuda', na.id)}
                                                                    disabled={isEncerrada}
                                                                    className="h-3.5 w-3.5 text-primary"
                                                                />
                                                                <span className="leading-none">{na.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="p-2 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        {[
                                                            { id: 'sim', label: 'Sim', color: 'text-emerald-700' },
                                                            { id: 'nao', label: 'Não', color: 'text-rose-700' },
                                                            { id: 'parcial', label: 'Parcial', color: 'text-amber-700' }
                                                        ].map(c => (
                                                            <label key={c.id} className={`flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${c.color}`}>
                                                                <input
                                                                    type="radio"
                                                                    name={`crit_${so.paciente_objetivo_id}`}
                                                                    value={c.id}
                                                                    checked={so.criterio_alcancado === c.id}
                                                                    onChange={() => updateObjetivo(so.paciente_objetivo_id, 'criterio_alcancado', c.id)}
                                                                    disabled={isEncerrada}
                                                                    className="h-3.5 w-3.5 text-primary"
                                                                />
                                                                <span>{c.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 7. INTERCORRÊNCIAS E VARIÁVEIS CONTEXTUAIS */}
            <Card>
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3 border-b">
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                        7. Intercorrências e Variáveis Contextuais
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {INTERCORRENCIAS_OPCOES.map(item => (
                            <label key={item} className="flex items-center gap-2 text-xs cursor-pointer hover:text-primary">
                                <Checkbox
                                    checked={intercorrencias.includes(item)}
                                    onCheckedChange={() => toggleIntercorrencia(item)}
                                    disabled={isEncerrada}
                                />
                                <span>{item}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 pt-1">
                        <span className="text-xs font-medium">Outro:</span>
                        <Input
                            placeholder="Descreva outra intercorrência..."
                            value={intercorrenciaOutro}
                            onChange={e => setIntercorrenciaOutro(e.target.value)}
                            disabled={isEncerrada}
                            className="flex-1 h-8 text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Descrição detalhada:</Label>
                        <Textarea
                            placeholder="Descreva o impacto das variáveis contextuais..."
                            value={descricaoIntercorrencia}
                            onChange={e => setDescricaoIntercorrencia(e.target.value)}
                            disabled={isEncerrada}
                            rows={2}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* 8. ANÁLISE CLÍNICA DA SESSÃO */}
            <Card>
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3 border-b">
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                        8. Análise Clínica da Sessão
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">O que favoreceu o desempenho?</Label>
                            <Textarea
                                placeholder="Fatores facilitadores, recursos, motivação..."
                                value={favoreceuDesempenho}
                                onChange={e => setFavoreceuDesempenho(e.target.value)}
                                disabled={isEncerrada}
                                rows={2}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Quais dificuldades foram observadas?</Label>
                            <Textarea
                                placeholder="Barreiras motoras, sensoriais ou comportamentais..."
                                value={dificuldadesObservadas}
                                onChange={e => setDificuldadesObservadas(e.target.value)}
                                disabled={isEncerrada}
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-md border space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-xs">
                            <span className="font-semibold">Houve necessidade de alterar o planejamento?</span>
                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="alterouPlan"
                                        checked={!alterouPlanejamento}
                                        onChange={() => setAlterouPlanejamento(false)}
                                        disabled={isEncerrada}
                                        className="text-primary"
                                    />
                                    <span>Não</span>
                                </label>
                                <label className="flex items-center gap-1 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="alterouPlan"
                                        checked={alterouPlanejamento}
                                        onChange={() => setAlterouPlanejamento(true)}
                                        disabled={isEncerrada}
                                        className="text-primary"
                                    />
                                    <span>Sim — qual alteração?</span>
                                </label>
                            </div>
                        </div>
                        {alterouPlanejamento && (
                            <Input
                                placeholder="Descreva qual foi a alteração realizada no planejamento..."
                                value={qualAlteracao}
                                onChange={e => setQualAlteracao(e.target.value)}
                                disabled={isEncerrada}
                                className="h-7 text-xs mt-1"
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs font-medium">Estratégia com melhor resposta:</Label>
                            <Input
                                placeholder="O que gerou maior adesão e sucesso motor..."
                                value={estrategiaMelhorResposta}
                                onChange={e => setEstrategiaMelhorResposta(e.target.value)}
                                disabled={isEncerrada}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium">Estratégia com baixa efetividade:</Label>
                            <Input
                                placeholder="O que não atingiu o objetivo esperado..."
                                value={estrategiaBaixaEfetividade}
                                onChange={e => setEstrategiaBaixaEfetividade(e.target.value)}
                                disabled={isEncerrada}
                                className="h-8 text-xs"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 9. DECISÃO PARA A PRÓXIMA SESSÃO */}
            <Card>
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 py-3 border-b">
                    <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                        9. Decisão para a Próxima Sessão (Considerar para cada objetivo trabalhado)
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {DECISAO_PROXIMA_OPCOES.map(item => (
                            <label key={item} className="flex items-center gap-2 text-xs cursor-pointer hover:text-primary">
                                <Checkbox
                                    checked={decisaoProxima.includes(item)}
                                    onCheckedChange={() => toggleDecisao(item)}
                                    disabled={isEncerrada}
                                />
                                <span>{item}</span>
                            </label>
                        ))}
                    </div>

                    <div className="space-y-1 pt-2">
                        <Label className="text-xs text-muted-foreground">Observações para a próxima sessão:</Label>
                        <Textarea
                            placeholder="Orientações e ajustes para o próximo plano..."
                            value={observacoesProxima}
                            onChange={e => setObservacoesProxima(e.target.value)}
                            disabled={isEncerrada}
                            rows={3}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Barra Inferior com Botões de Ação */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => router.push(`/dashboard/pacientes/${patientId}/psicomotricidade`)}>
                    Cancelar / Voltar
                </Button>
                <Button variant="secondary" onClick={() => handleSave(false)} disabled={isSaving || isEncerrada}>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Rascunho
                </Button>
                <Button onClick={() => handleSave(true)} disabled={isSaving || isEncerrada} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Encerrar Sessão
                </Button>
            </div>

            {/* MODAL 1: BIBLIOTECA OFICIAL WORLD SENSORY (55 OBJETIVOS CATEGORIZADOS DE A a K) */}
            <Dialog open={isCatalogoOpen} onOpenChange={setIsCatalogoOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                            <BookOpen className="w-5 h-5 text-primary" />
                            Biblioteca Oficial World Sensory — 55 Objetivos (A a K)
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Clique em qualquer objetivo para adicioná-lo imediatamente à sessão (máximo de 4).
                        </DialogDescription>
                    </DialogHeader>

                    {/* Filtros e Busca */}
                    <div className="space-y-2 pt-2">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por código (ex: ERP01, CMG02) ou palavra-chave..."
                                value={catalogoBusca}
                                onChange={e => setCatalogoBusca(e.target.value)}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>

                        {/* Seletor de Categoria A-K */}
                        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                            <Button
                                type="button"
                                size="sm"
                                variant={catalogoCategoriaFiltro === 'todas' ? 'default' : 'outline'}
                                className="h-7 text-[11px] shrink-0"
                                onClick={() => setCatalogoCategoriaFiltro('todas')}
                            >
                                Todas (55)
                            </Button>
                            {CATEGORIAS_OBJETIVOS_ORDEM.map(cat => {
                                const sigla = cat.substring(0, 3);
                                return (
                                    <Button
                                        key={cat}
                                        type="button"
                                        size="sm"
                                        variant={catalogoCategoriaFiltro === cat ? 'default' : 'outline'}
                                        className="h-7 text-[11px] shrink-0"
                                        onClick={() => setCatalogoCategoriaFiltro(cat)}
                                    >
                                        {sigla}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Lista com Rolagem */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y mt-2 max-h-[50vh]">
                        {OBJETIVOS_WORLD_SENSORY_CATALOGO
                            .filter(item => {
                                const matchCat = catalogoCategoriaFiltro === 'todas' || item.categoriaLetra === catalogoCategoriaFiltro;
                                const query = catalogoBusca.toLowerCase().trim();
                                const matchBusca = !query || 
                                    item.codigo.toLowerCase().includes(query) || 
                                    item.categoria.toLowerCase().includes(query) || 
                                    item.descricao.toLowerCase().includes(query);
                                return matchCat && matchBusca;
                            })
                            .map(item => {
                                const isAdded = !!sessaoObjetivos.find(so => so.codigo === item.codigo);
                                return (
                                    <div 
                                        key={item.codigo} 
                                        className={`pt-2 pb-2 flex items-start justify-between gap-3 p-2 rounded-md transition-colors ${isAdded ? 'bg-primary/5 border border-primary/20' : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'}`}
                                    >
                                        <div className="space-y-0.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-800 text-primary px-1.5 py-0.5 rounded">
                                                    {item.codigo}
                                                </span>
                                                <span className="text-[11px] font-semibold text-slate-500 uppercase">
                                                    {item.categoria}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed">
                                                {item.descricao}
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant={isAdded ? "secondary" : "default"}
                                            className={`h-7 px-3 text-xs shrink-0 ${isAdded ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : ''}`}
                                            disabled={isAdded || sessaoObjetivos.length >= 4}
                                            onClick={() => handleAddObjetivoFromCatalogo(item)}
                                        >
                                            {isAdded ? (
                                                <>
                                                    <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                                                    Adicionado
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                                    Adicionar
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                );
                            })}
                    </div>

                    <DialogFooter className="pt-3 border-t flex items-center justify-between">
                        <div className="text-xs text-muted-foreground">
                            {sessaoObjetivos.length}/4 objetivos selecionados
                        </div>
                        <Button type="button" onClick={() => setIsCatalogoOpen(false)}>
                            Concluir Seleção
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: ADICIONAR OBJETIVO PERSONALIZADO */}
            <Dialog open={isCustomObjOpen} onOpenChange={setIsCustomObjOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            Novo Objetivo Personalizado
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Crie um objetivo específico que não esteja na ficha padrão.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                            <Label className="text-xs font-medium">Código do Objetivo:</Label>
                            <Input
                                placeholder="Ex: MOT01, EQUIP02..."
                                value={customCodigo}
                                onChange={e => setCustomCodigo(e.target.value)}
                                className="h-8 text-xs font-mono"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium">Categoria / Área:</Label>
                            <Input
                                placeholder="Ex: Coordenação Motora Fina, Psicomotricidade..."
                                value={customCategoria}
                                onChange={e => setCustomCategoria(e.target.value)}
                                className="h-8 text-xs"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs font-medium">Critério de Desempenho Esperado:</Label>
                            <Textarea
                                placeholder="Descreva o critério com repetições, tentativas ou tempo..."
                                value={customCriterio}
                                onChange={e => setCustomCriterio(e.target.value)}
                                rows={3}
                                className="text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter className="pt-3">
                        <Button type="button" variant="outline" onClick={() => setIsCustomObjOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="button" onClick={handleAddCustomObjetivo}>
                            Adicionar à Sessão
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
