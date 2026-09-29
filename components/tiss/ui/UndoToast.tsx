import { toast } from 'sonner';

/**
 * CLINIGO - Utilitário de Notificação com Ação Desfazer (DP7)
 * Permite reversão de ações reversíveis (como exclusão de rascunho de guia).
 */

export interface ShowUndoToastOptions {
    message: string;
    onUndo: () => void | Promise<void>;
    durationMs?: number;
    undoLabel?: string;
}

export function showUndoToast({
    message,
    onUndo,
    durationMs = 10000,
    undoLabel = 'Desfazer',
}: ShowUndoToastOptions) {
    return toast(message, {
        duration: durationMs,
        action: {
            label: undoLabel,
            onClick: async () => {
                try {
                    await onUndo();
                    toast.success('Ação desfeita com sucesso.');
                } catch (err: any) {
                    toast.error(err?.message || 'Falha ao desfazer a ação.');
                }
            },
        },
    });
}
