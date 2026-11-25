'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ArrowRight, BookOpen, CheckCircle2, LocateFixed } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { triggerHelpSpotlight } from '@/lib/help/in-page-spotlight';

export interface HelpStepSummary {
    step: number;
    title: string;
    detail: string;
    /** Lista ordenada de `data-help-target` na mesma página (alvo principal primeiro, pré-requisito depois). */
    targetKeys?: string[];
    /** Mensagem curta exibida quando o elemento principal está em tela e recebe o pulso. */
    activeHint?: string;
    /** Mensagem curta exibida quando o subnível ainda não foi aberto e destacamos o botão pré-requisito. */
    fallbackHint?: string;
}

interface TissContextualHelpProps {
    anchor: string;
    title: string;
    subtitle: string;
    steps: HelpStepSummary[];
    triggerLabel?: string;
    variant?: 'outline' | 'ghost' | 'secondary';
    onBeforeHighlightStep?: (stepNumber: number, topicKey: string) => void;
}

export const PRESET_TOPICS: Record<
    string,
    { title: string; subtitle: string; steps: HelpStepSummary[] }
> = {
    'tiss-elaboracao-contas': {
        title: 'Ajuda: Elaboração, Radar de Receita e Blindagem TEA',
        subtitle: 'Acompanhe sessões sem guia (Dinheiro na Mesa), valide o Escudo Anti-Glosa e libere contas (Ctrl+L) sem conflitos.',
        steps: [
            {
                step: 1,
                title: 'Confira o Radar Dinheiro na Mesa e Blindagem TEA',
                detail: 'Inspecione sessões concluídas sem guia TISS, prazos ANS próximos do vencimento, sobreposições de horário (ANS 1720) e alertas de subpagamento antes de faturar.',
                targetKeys: ['tiss-radar-receita', 'tiss-blindagem-tea', 'tiss-tab-elaboracao'],
                activeHint: 'Passo 1: revise o Radar de Receita e os alertas de Blindagem Terapias destacados acima.',
            },
            {
                step: 2,
                title: 'Selecione a aba Elaboração de Contas',
                detail: 'Filtre por Período, Convênio ou Profissional para localizar atendimentos concluídos.',
                targetKeys: ['tiss-elaboracao-filters', 'tiss-tab-elaboracao'],
                activeHint: 'Passo 2: filtre os atendimentos concluídos nesta área.',
            },
            {
                step: 3,
                title: 'Verifique o Escudo Anti-Glosa',
                detail: 'Confira se carteirinha, senha de autorização, biometria e evolução assinada estão em verde antes de liberar.',
                targetKeys: ['tiss-elaboracao-shield', 'tiss-elaboracao-table'],
                activeHint: 'Passo 3: confira os 4 itens verdes do Escudo Anti-Glosa antes de liberar.',
            },
            {
                step: 4,
                title: 'Abra a Conta e ajuste itens',
                detail: 'Use Incluir Item ou Estorno nos 4 grupos (Honorários, Taxas, Materiais, Diagnose) e clique em Grava.',
                targetKeys: ['tiss-elaboracao-table'],
                activeHint: 'Passo 4: clique na conta desejada para conferir ou ajustar itens.',
            },
            {
                step: 5,
                title: 'Encerrar e Liberar Conta (Ctrl+L)',
                detail: 'Pressione Ctrl+L ou clique em Encerrar e Liberar para disponibilizar a conta na montagem da remessa.',
                targetKeys: ['tiss-elaboracao-release', 'tiss-elaboracao-table'],
                activeHint: 'Passo 5: pressione Ctrl+L ou clique em Encerrar e Liberar.',
            },
        ],
    },
    'tiss-remessas-xml': {
        title: 'Ajuda: Remessas XML ANS Oficial (ISO-8859-1 + MD5)',
        subtitle: 'Como agrupar contas liberadas, gerar XML ANS oficial com Epílogo MD5 e registrar o protocolo da operadora.',
        steps: [
            {
                step: 1,
                title: 'Crie a Nova Remessa',
                detail: 'Informe Operadora, Competência e Tipo de Atendimento no botão Nova Remessa.',
                targetKeys: ['tiss-batches-new-btn'],
                activeHint: 'Passo 1: clique em Nova Remessa para criar o lote da competência.',
            },
            {
                step: 2,
                title: 'Processos: Selecionar Contas Liberadas',
                detail: 'Vincule apenas contas já liberadas com saldo conferido em centavos exatos e códigos TUSS 8 dígitos.',
                targetKeys: ['tiss-batches-table'],
                activeHint: 'Passo 2: abra a remessa criada para vincular as contas liberadas.',
            },
            {
                step: 3,
                title: 'Feche a Remessa e Gere o XML ANS Oficial',
                detail: 'Execute Fechar Remessa e Validar para gerar o XML ISO-8859-1 com Epílogo MD5 oficial (ANS), proteção Anti-XXE e registro ANS da operadora.',
                targetKeys: ['tiss-batches-table'],
                activeHint: 'Passo 3: feche a remessa e baixe o arquivo XML validado no padrão ANS.',
            },
            {
                step: 4,
                title: 'Registre Protocolo e Anexos',
                detail: 'Salve o número de protocolo da operadora e acompanhe os 4 anexos TISS-ANS da remessa.',
                targetKeys: ['tiss-batches-table'],
                activeHint: 'Passo 4: informe o protocolo da operadora diretamente na linha da remessa.',
            },
        ],
    },
    'tiss-controle-glosas': {
        title: 'Ajuda: Controle de Glosas em 3 Níveis',
        subtitle: 'Fluxo estruturado para conferência por Remessa, Contas e Itens/Grupos com batimento contábil.',
        steps: [
            {
                step: 1,
                title: 'Nível 1 - Remessas e Faturas',
                detail: 'Selecione a remessa e clique em Iniciar / Revisar Remessa (ou importe o XML de retorno).',
                targetKeys: ['glosas-l1-toolbar', 'glosas-l1-table', 'glosas-tab-3niveis'],
                activeHint: 'Passo 1 (Nível 1): selecione uma remessa e use Iniciar / Revisar Remessa ou Importar XML.',
                fallbackHint: 'Passo 1: volte ao Nível 1 (Remessas e Faturas) para selecionar ou importar a remessa.',
            },
            {
                step: 2,
                title: 'Nível 2 - Contas da Remessa',
                detail: 'Use os filtros de contagem, Liberação Automática para contas pagas ou Abrir Conta para detalhar glosas.',
                targetKeys: ['glosas-l2-filters', 'glosas-l2-actions', 'glosas-l1-start-review', 'glosas-l1-table'],
                activeHint: 'Passo 2 (Nível 2): use os filtros rápidos, Liberação Automática ou Abrir Conta.',
                fallbackHint: 'Passo 2 (Nível 2): primeiro selecione uma remessa aqui e clique em Iniciar / Revisar Remessa para abrir as contas.',
            },
            {
                step: 3,
                title: 'Nível 3 - Glosa Parcial ou Irrecuperável',
                detail: 'Informe Qtde. e Valor Aprovado, escolha o Motivo ANS (Tabela 38) e marque Irrecuperável se não couber recurso.',
                targetKeys: ['glosas-l3-groups', 'glosas-l2-accounts-table', 'glosas-l1-start-review', 'glosas-manual-btn'],
                activeHint: 'Passo 3 (Nível 3): abra o grupo desejado e clique em Glosa Parcial / Item para informar o Motivo ANS.',
                fallbackHint: 'Passo 3 (Nível 3): abra uma conta da remessa para detalhar glosas parciais ou marque Irrecuperável.',
            },
            {
                step: 4,
                title: 'Conclui e Batimento Contábil',
                detail: 'Compare Glosa Prevista x Glosa Digitada e conclua a conta antes de finalizar a remessa no Nível 1.',
                targetKeys: ['glosas-l3-batimento', 'glosas-l1-finalize', 'glosas-l2-actions', 'glosas-tab-3niveis'],
                activeHint: 'Passo 4: confira o batimento (Glosa Prevista x Digitada) e finalize a revisão.',
                fallbackHint: 'Passo 4: após revisar as contas, use Contas Revisadas (Finalizar Remessa) destacado na tela.',
            },
        ],
    },
    'tiss-recursos-dossie': {
        title: 'Ajuda: Recursos de Glosa e Dossiê',
        subtitle: 'Como contestar apenas glosas recuperáveis com evidência clínica e exportar o XML de recurso.',
        steps: [
            {
                step: 1,
                title: 'Crie o Lote de Recurso por Operadora',
                detail: 'Somente glosas em aberto e marcadas como recuperáveis aparecem para contestação.',
                targetKeys: ['glosas-recursos-new-btn', 'glosas-tab-recursos'],
                activeHint: 'Passo 1: clique em Novo Lote de Recurso (C1) destacado na tela.',
            },
            {
                step: 2,
                title: 'Gere o Dossiê Probatório Automático',
                detail: 'O sistema compila espelho da guia, check-in biométrico e evolução assinada em 1 clique.',
                targetKeys: ['glosas-recursos-table', 'glosas-recursos-new-btn'],
                activeHint: 'Passo 2: abra o Dossiê Probatório na linha do recurso para revisar e redigir com IA.',
            },
            {
                step: 3,
                title: 'Exporte o XML de Recurso ANS e Envie',
                detail: 'Baixe o XML de recurso de glosa ou anexe documentos extras e registre o protocolo.',
                targetKeys: ['glosas-recursos-table'],
                activeHint: 'Passo 3: use os botões de XML, anexos e envio na linha do lote de recurso.',
            },
            {
                step: 4,
                title: 'Registre o Parecer da Operadora (Acato / Parcial / Negado)',
                detail: 'Registre a decisão da operadora no lote. Valores acatados ficam em controle separado até a entrada efetiva no banco (FIN-01).',
                targetKeys: ['glosas-recursos-status-tabs', 'glosas-recursos-table'],
                activeHint: 'Passo 4: acompanhe o status por aba e registre o parecer da operadora no lote.',
            },
            {
                step: 5,
                title: 'Confirmar Crédito Bancário e Retenções na Fonte',
                detail: 'Quando o valor cair na conta da clínica, clique em Confirmar Crédito na linha do recurso e informe opcionalmente retenções ISS/IRRF/CSRF (sem NFS-e).',
                targetKeys: ['glosas-acato-credito', 'glosas-recursos-table'],
                activeHint: 'Passo 5: use o controle Acato × Crédito Bancário destacado para liquidar o recebimento real.',
            },
        ],
    },
};

export function TissContextualHelp({
    anchor,
    title,
    subtitle,
    steps,
    triggerLabel = 'Ajuda TISS',
    variant = 'outline',
    onBeforeHighlightStep,
}: TissContextualHelpProps) {
    const [open, setOpen] = useState(false);

    const handleSelectStep = (stepItem: HelpStepSummary) => {
        onBeforeHighlightStep?.(stepItem.step, anchor);
        setOpen(false);

        const targets = stepItem.targetKeys || [];
        if (targets.length === 0) return;

        window.setTimeout(() => {
            triggerHelpSpotlight(targets, {
                onResolved: (res) => {
                    if (res.found) {
                        const msg =
                            res.isFallback && stepItem.fallbackHint
                                ? stepItem.fallbackHint
                                : stepItem.activeHint || `Passo ${stepItem.step}: ${stepItem.title}`;
                        toast.info(msg, { duration: 4200 });
                    } else if (stepItem.fallbackHint || stepItem.activeHint) {
                        toast.info(stepItem.fallbackHint || stepItem.activeHint, { duration: 4200 });
                    }
                },
            });
        }, 260);
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button
                    type="button"
                    variant={variant}
                    className="h-9 min-h-[36px] px-3 gap-1.5 text-xs font-medium rounded-md shadow-none shrink-0 whitespace-nowrap"
                    title={`Abrir ajuda passo a passo: ${title}`}
                >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    <span>{triggerLabel}</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader className="pb-4 border-b border-border text-left">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <BookOpen className="w-4 h-4" />
                        <span>Central de Treinamento CliniGo</span>
                    </div>
                    <SheetTitle className="text-lg font-semibold text-foreground">{title}</SheetTitle>
                    <SheetDescription className="text-sm text-muted-foreground">{subtitle}</SheetDescription>
                    <p className="text-[11px] text-[#155E4B] font-medium pt-1">
                        Clique em qualquer passo abaixo para destacar onde executar na tela atual.
                    </p>
                </SheetHeader>

                <div className="py-5 space-y-3">
                    {steps.map((s) => (
                        <button
                            key={s.step}
                            type="button"
                            onClick={() => handleSelectStep(s)}
                            className="group w-full text-left rounded-md border border-border bg-muted/30 hover:bg-[#E6F2EE]/45 hover:border-[#155E4B]/50 transition-colors p-3.5 space-y-1.5 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#155E4B]"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 group-hover:bg-[#155E4B] text-white text-xs font-semibold shrink-0 transition-colors">
                                        {s.step}
                                    </span>
                                    <p className="text-sm font-semibold text-foreground group-hover:text-[#0F493A] transition-colors">
                                        {s.title}
                                    </p>
                                </div>
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 group-hover:text-[#155E4B] shrink-0 transition-colors">
                                    <LocateFixed className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Mostrar</span>
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground pl-8 leading-relaxed">{s.detail}</p>
                        </button>
                    ))}

                    <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <p className="text-xs text-emerald-900 leading-relaxed">
                            Para visualizar o manual completo com regras ANS, dicas práticas e atalhos de teclado, abra o guia detalhado na Central de Ajuda.
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t border-border flex flex-col gap-2">
                    <Button asChild className="h-10 min-h-[40px] w-full justify-between px-4 text-xs font-medium rounded-md">
                        <Link href={`/dashboard/help#${anchor}`} prefetch={false} onClick={() => setOpen(false)}>
                            <span>Abrir Manual Completo em /dashboard/help</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}

export function TissPresetHelpButton({
    topicKey,
    triggerLabel,
    variant = 'outline',
    onBeforeHighlightStep,
}: {
    topicKey: keyof typeof PRESET_TOPICS;
    triggerLabel?: string;
    variant?: 'outline' | 'ghost' | 'secondary';
    onBeforeHighlightStep?: (stepNumber: number, topicKey: string) => void;
}) {
    const topic = PRESET_TOPICS[topicKey] || PRESET_TOPICS['tiss-elaboracao-contas'];
    return (
        <TissContextualHelp
            anchor={topicKey}
            title={topic.title}
            subtitle={topic.subtitle}
            steps={topic.steps}
            triggerLabel={triggerLabel}
            variant={variant}
            onBeforeHighlightStep={onBeforeHighlightStep}
        />
    );
}
