import Link from 'next/link'
import { Sliders, ArrowRight, BellRing, FileSpreadsheet } from 'lucide-react'

export default function AutomacaoPage() {
    return (
        <div className="space-y-6 container mx-auto py-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border">
                <div className="w-9 h-9 rounded-lg bg-accent border border-primary/15 flex items-center justify-center text-primary shrink-0">
                    <Sliders className="w-4 h-4" />
                </div>
                <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
                        Automação
                    </h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        Gerencie réguas automáticas de lembretes, confirmações, repasses e faturamento TISS.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Link
                    href="/dashboard/automacao/configuracoes"
                    className="group block p-5 border border-border rounded-xl bg-card text-card-foreground hover:border-primary/40 hover:bg-accent/20 transition-all"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg bg-accent border border-primary/15 text-primary flex items-center justify-center">
                            <Sliders className="w-4 h-4" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1">
                        Configurações de Automação
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Personalize disparos de lembretes, regras de repasse e rotinas de geração TISS.
                    </p>
                </Link>

                <Link
                    href="/dashboard/notificacoes"
                    className="group block p-5 border border-border rounded-xl bg-card text-card-foreground hover:border-primary/40 hover:bg-accent/20 transition-all"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg bg-accent border border-primary/15 text-primary flex items-center justify-center">
                            <BellRing className="w-4 h-4" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1">
                        Central de Notificações
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Acompanhe alertas operacionais e histórico recente de envios da clínica.
                    </p>
                </Link>

                <Link
                    href="/dashboard/logs-auditoria"
                    className="group block p-5 border border-border rounded-xl bg-card text-card-foreground hover:border-primary/40 hover:bg-accent/20 transition-all"
                >
                    <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-lg bg-accent border border-primary/15 text-primary flex items-center justify-center">
                            <FileSpreadsheet className="w-4 h-4" />
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1">
                        Trilha de Auditoria
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        Consulte registros auditados e exporte relatórios de conformidade LGPD.
                    </p>
                </Link>
            </div>
        </div>
    )
}
