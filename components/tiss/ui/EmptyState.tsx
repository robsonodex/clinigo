'use client';

import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon = Inbox,
    title,
    description,
    actionLabel,
    onAction,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-lg border border-dashed border-border bg-card/50 ${className}`}>
            <div className="h-12 w-12 rounded-full bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground">
                <Icon className="h-6 w-6 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mt-1 mb-6">
                {description}
            </p>
            {actionLabel && onAction && (
                <Button onClick={onAction} size="sm" className="min-h-[44px] px-4 font-medium">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
