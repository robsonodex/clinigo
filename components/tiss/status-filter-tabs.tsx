'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

export interface StatusFilterOption {
    value: string;
    label: string;
    count?: number;
    icon?: LucideIcon;
}

interface StatusFilterTabsProps {
    value: string;
    onValueChange: (value: string) => void;
    options: StatusFilterOption[];
    urlParamKey?: string;
    className?: string;
}

/**
 * Filtro por status padronizado para o Faturamento TISS (F1)
 * Suporta contadores em tempo real, ícones neutros e sincronização com query params.
 */
export function StatusFilterTabs({
    value,
    onValueChange,
    options,
    urlParamKey = 'status',
    className,
}: StatusFilterTabsProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Sincroniza estado inicial a partir dos searchParams caso urlParamKey esteja configurado
    useEffect(() => {
        if (!urlParamKey) return;
        const paramValue = searchParams.get(urlParamKey);
        if (paramValue && paramValue !== value) {
            const exists = options.some((opt) => opt.value.toLowerCase() === paramValue.toLowerCase());
            if (exists) {
                const matched = options.find((opt) => opt.value.toLowerCase() === paramValue.toLowerCase());
                if (matched) {
                    onValueChange(matched.value);
                }
            }
        }
    }, [searchParams, urlParamKey, options, onValueChange, value]);

    const handleSelect = useCallback((newValue: string) => {
        onValueChange(newValue);

        if (!urlParamKey) return;

        const params = new URLSearchParams(searchParams.toString());
        if (newValue === 'all' || newValue === 'ALL') {
            params.delete(urlParamKey);
        } else {
            params.set(urlParamKey, newValue);
        }

        const queryString = params.toString();
        const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
        router.replace(targetUrl, { scroll: false });
    }, [urlParamKey, searchParams, pathname, router, onValueChange]);

    return (
        <div
            role="tablist"
            aria-label="Filtro por status"
            className={cn(
                'inline-flex items-center gap-1.5 p-1 rounded-lg bg-muted/60 border border-border/60 overflow-x-auto max-w-full scrollbar-none',
                className
            )}
        >
            {options.map((option) => {
                const isActive = option.value.toLowerCase() === value.toLowerCase();
                const Icon = option.icon;

                return (
                    <button
                        key={option.value}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => handleSelect(option.value)}
                        className={cn(
                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all shrink-0 select-none min-h-[36px]',
                            isActive
                                ? 'bg-background text-foreground shadow-xs font-semibold'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        )}
                    >
                        {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                        <span>{option.label}</span>
                        {typeof option.count === 'number' && (
                            <Badge
                                variant={isActive ? 'default' : 'secondary'}
                                className={cn(
                                    'h-4 min-w-[18px] px-1 text-[10px] font-mono leading-none rounded-full flex items-center justify-center',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-muted-foreground/15 text-muted-foreground'
                                )}
                            >
                                {option.count}
                            </Badge>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
