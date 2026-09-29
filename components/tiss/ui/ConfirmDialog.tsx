'use client';

import React from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    itemName?: string;
    actionType?: 'delete' | 'cancel' | 'generic';
    confirmLabel?: string;
    cancelLabel?: string;
    isLoading?: boolean;
    onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    itemName,
    actionType = 'delete',
    confirmLabel,
    cancelLabel = 'Cancelar',
    isLoading = false,
    onConfirm,
}: ConfirmDialogProps) {
    const defaultTitle = actionType === 'delete' ? 'Confirmar Exclusão' : 'Confirmar Ação';
    const defaultDescription = itemName
        ? `Tem certeza que deseja excluir ${itemName}? Esta ação não pode ser desfeita.`
        : 'Tem certeza que deseja prosseguir com esta ação?';

    const defaultConfirmLabel = actionType === 'delete' ? 'Excluir Definitivamente' : 'Confirmar';

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="sm:max-w-[450px]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-base font-semibold text-foreground">
                        {title || defaultTitle}
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-muted-foreground mt-2">
                        {description || defaultDescription}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-4 gap-2">
                    <AlertDialogCancel disabled={isLoading} className="text-sm min-h-[44px]">
                        {cancelLabel}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isLoading}
                        onClick={(e) => {
                            e.preventDefault();
                            onConfirm();
                        }}
                        className={`text-sm min-h-[44px] ${
                            actionType === 'delete'
                                ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                                : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}
                    >
                        {isLoading ? 'Processando...' : confirmLabel || defaultConfirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
