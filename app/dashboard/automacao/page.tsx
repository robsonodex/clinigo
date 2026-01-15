import { Bot } from 'lucide-react';

export default function AutomacaoPage() {
    return (
        <div className="space-y-6 container mx-auto py-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Bot className="w-8 h-8" />
                        Automação
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie suas automações e fluxos de trabalho.
                    </p>
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <a href="/dashboard/automacao/configuracoes" className="block p-6 border rounded-lg bg-card text-card-foreground shadow-sm hover:bg-muted/50 transition-colors">
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">Configurações</h3>
                    <p className="text-sm text-muted-foreground">
                        Personalize lembretes, repasses e geração de TISS.
                    </p>
                </a>

                {/* Placeholder content */}
                <div className="p-6 border rounded-lg bg-card text-card-foreground shadow-sm opacity-50">
                    <h3 className="text-lg font-semibold mb-2">Logs de Execução</h3>
                    <p className="text-sm text-muted-foreground">
                        Histórico de automações (Em Breve).
                    </p>
                </div>
            </div>
        </div>
    );
}
