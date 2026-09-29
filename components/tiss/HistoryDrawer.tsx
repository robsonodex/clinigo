'use client';

import React, { useState, useEffect } from 'react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, User, FileText, RefreshCw, ShieldAlert, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HistoryDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    entityType: 'tiss_guide' | 'tiss_batch' | 'tiss_glosa' | 'tiss_glosa_contest' | string;
    entityId: string;
    title?: string;
}

export function HistoryDrawer({
    open,
    onOpenChange,
    entityType,
    entityId,
    title = 'Histórico e Auditoria',
}: HistoryDrawerProps) {
    const [entries, setEntries] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchHistory = async () => {
        if (!entityId) return;
        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/tiss/audit?entityType=${entityType}&entityId=${entityId}&limit=50`);
            const data = await res.json();

            if (res.ok) {
                setEntries(data.data || []);
            } else {
                setError(data.error || 'Erro ao carregar histórico');
            }
        } catch {
            setError('Erro de conexão ao buscar histórico');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (open && entityId) {
            fetchHistory();
        }
    }, [open, entityId]);

    const formatActionName = (action: string) => {
        return action
            .replace(/_/g, ' ')
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="sm:max-w-lg w-full flex flex-col p-6">
                <SheetHeader className="pb-4 border-b border-border">
                    <div className="flex items-center justify-between">
                        <SheetTitle className="text-base font-semibold tracking-tight text-foreground flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {title}
                        </SheetTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={fetchHistory}
                            disabled={isLoading}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label="Atualizar histórico"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                    <SheetDescription className="text-xs text-muted-foreground">
                        Trilha de auditoria imutável com registro de ações, datas e usuários responsáveis.
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 overflow-hidden py-4">
                    {isLoading ? (
                        <div className="space-y-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex gap-3">
                                    <Skeleton className="h-6 w-6 rounded-full shrink-0" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-3/4" />
                                        <Skeleton className="h-3 w-1/2" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                            <ShieldAlert className="h-8 w-8 text-destructive mb-2" />
                            <p className="text-sm font-medium text-destructive">{error}</p>
                            <Button variant="outline" size="sm" onClick={fetchHistory} className="mt-4">
                                Tentar novamente
                            </Button>
                        </div>
                    ) : entries.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center p-4 text-muted-foreground">
                            <FileText className="h-8 w-8 mb-2 stroke-[1.5]" />
                            <p className="text-sm font-medium text-foreground">Nenhum evento registrado</p>
                            <p className="text-xs mt-1">Os eventos desta entidade aparecerão aqui conforme as ações forem executadas.</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-full pr-3">
                            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[1px] before:bg-border">
                                {entries.map((item) => (
                                    <div key={item.id} className="relative group">
                                        <div className="absolute -left-[29px] top-1.5 h-3 w-3 rounded-full bg-background border-2 border-primary ring-4 ring-background" />

                                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                                            <span className="font-semibold text-foreground text-sm">
                                                {formatActionName(item.action)}
                                            </span>
                                            <time dateTime={item.created_at}>
                                                {format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            </time>
                                        </div>

                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <User className="h-3.5 w-3.5" />
                                            <span>{item.user_name || 'Sistema'}</span>
                                        </div>

                                        {item.metadata?.reason && (
                                            <div className="mt-2 text-xs bg-muted/50 p-2.5 rounded-md border border-border/60">
                                                <span className="font-medium text-foreground">Motivo: </span>
                                                <span className="text-muted-foreground">{item.metadata.reason}</span>
                                            </div>
                                        )}

                                        {item.metadata?.previous_state && item.metadata?.new_state && (
                                            <div className="mt-2 flex items-center gap-2 text-xs bg-muted/30 p-2 rounded border border-border/40">
                                                <span className="font-mono text-muted-foreground">{String(item.metadata.previous_state)}</span>
                                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                <span className="font-mono font-medium text-foreground">{String(item.metadata.new_state)}</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
