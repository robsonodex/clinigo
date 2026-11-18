'use client';

import { useState } from 'react';
import Link from 'next/link';
import { HelpCircle, ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

interface HelpStepSummary {
    step: number;
    title: string;
    detail: string;
}

interface TissContextualHelpProps {
    anchor: string;
    title: string;
    subtitle: string;
    steps: HelpStepSummary[];
    triggerLabel?: string;
    variant?: 'outline' | 'ghost' | 'secondary';
}

const PRESET_TOPICS: Record<
    string,
    { title: string; subtitle: string; steps: HelpStepSummary[] }
> = {
    'tiss-elaboracao-contas': {
        title: 'Ajuda: Elaboração e Liberação de Contas',
        subtitle: 'Como revisar itens, validar o Escudo Anti-Glosa e liberar contas (Ctrl+L) antes do faturamento.',
        steps: [
            { step: 1, title: 'Selecione a aba Elaboração de Contas', detail: 'Filtre por Período, Convênio ou Profissional para localizar atendimentos concluídos.' },
            { step: 2, title: 'Verifique o Escudo Anti-Glosa', detail: 'Confira se carteirinha, senha de autorização, biometria e evolução estão em verde antes de liberar.' },
            { step: 3, title: 'Abra a Conta e ajuste itens', detail: 'Use Incluir Item ou Estorno nos 4 grupos (Honorários, Taxas, Materiais, Diagnose) e clique em Grava.' },
            { step: 4, title: 'Encerrar e Liberar Conta (Ctrl+L)', detail: 'Pressione Ctrl+L ou clique em Encerrar e Liberar para disponibilizar a conta na montagem da remessa.' },
        ],
    },
    'tiss-remessas-xml': {
        title: 'Ajuda: Remessas XML e Anexos TISS-ANS',
        subtitle: 'Como agrupar contas liberadas, validar regras ANS e registrar o protocolo da operadora.',
        steps: [
            { step: 1, title: 'Crie a Nova Remessa', detail: 'Informe Operadora, Competência e Tipo de Atendimento no botão Nova Remessa.' },
            { step: 2, title: 'Processos: Selecionar Contas Liberadas', detail: 'Vincule apenas contas já liberadas com saldo conferido em lotes individuais ou selecionando todas.' },
            { step: 3, title: 'Feche a Remessa e Gere o XML', detail: 'Execute Fechar Remessa e Validar e baixe o XML ENVIO_LOTE_GUIAS com hash validado.' },
            { step: 4, title: 'Registre Protocolo e Anexos', detail: 'Salve o número de protocolo da operadora e acompanhe os 4 anexos TISS-ANS da remessa.' },
        ],
    },
    'tiss-controle-glosas': {
        title: 'Ajuda: Controle de Glosas em 3 Níveis',
        subtitle: 'Fluxo estruturado para conferência por Remessa, Contas e Itens/Grupos com batimento contábil.',
        steps: [
            { step: 1, title: 'Nível 1 - Remessas e Faturas', detail: 'Selecione a remessa e clique em Iniciar / Revisar Remessa (ou importe o XML de retorno).' },
            { step: 2, title: 'Nível 2 - Contas da Remessa', detail: 'Use os filtros de contagem, Liberação Automática para contas pagas ou Abrir Conta para detalhar glosas.' },
            { step: 3, title: 'Nível 3 - Glosa Parcial ou Irrecuperável', detail: 'Informe Qtde. e Valor Aprovado, escolha o Motivo ANS (Tabela 38) e marque Irrecuperável se não couber recurso.' },
            { step: 4, title: 'Conclui e Batimento Contábil', detail: 'Compare Glosa Prevista x Glosa Digitada e conclua a conta antes de finalizar a remessa no Nível 1.' },
        ],
    },
    'tiss-recursos-dossie': {
        title: 'Ajuda: Recursos de Glosa e Dossiê',
        subtitle: 'Como contestar apenas glosas recuperáveis com evidência clínica e exportar o XML de recurso.',
        steps: [
            { step: 1, title: 'Crie o Lote de Recurso por Operadora', detail: 'Somente glosas em aberto e marcadas como recuperáveis aparecem para contestação.' },
            { step: 2, title: 'Gere o Dossiê Probatório Automático', detail: 'O sistema compila espelho da guia, check-in biométrico e evolução assinada em 1 clique.' },
            { step: 3, title: 'Exporte o XML de Recurso ANS e Envie', detail: 'Baixe o XML de recurso de glosa ou anexe documentos extras e registre o protocolo.' },
            { step: 4, title: 'Registre o Resultado (Deferido ou Indeferido)', detail: 'A liquidação atualiza os lançamentos financeiros e o repasse médico conforme política da clínica.' },
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
}: TissContextualHelpProps) {
    const [open, setOpen] = useState(false);

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
                </SheetHeader>

                <div className="py-5 space-y-4">
                    {steps.map((s) => (
                        <div key={s.step} className="rounded-md border border-border bg-muted/30 p-3.5 space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-semibold shrink-0">
                                    {s.step}
                                </span>
                                <p className="text-sm font-semibold text-foreground">{s.title}</p>
                            </div>
                            <p className="text-xs text-muted-foreground pl-8 leading-relaxed">{s.detail}</p>
                        </div>
                    ))}

                    <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-3.5 flex items-start gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                        <p className="text-xs text-emerald-900 leading-relaxed">
                            Para visualizar o manual completo com regras ANS, dicas práticas e atalhos de teclado, abra o guia detalhado na Central de Ajuda.
                        </p>
                    </div>
                </div>

                <div className="pt-4 border-t border-border flex flex-col gap-2">
                    <Button asChild className="h-10 min-h-[40px] w-full justify-between px-4 text-xs font-medium">
                        <Link href={`/dashboard/help#${anchor}`} onClick={() => setOpen(false)}>
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
}: {
    topicKey: keyof typeof PRESET_TOPICS;
    triggerLabel?: string;
    variant?: 'outline' | 'ghost' | 'secondary';
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
        />
    );
}
