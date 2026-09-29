'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
    getGuideStatusMeta,
    getBatchStatusMeta,
    getAppealStatusMeta,
    StatusMeta,
} from '@/lib/tiss/status-labels';

interface StatusBadgeProps {
    status: string;
    type: 'guide' | 'batch' | 'appeal';
    className?: string;
}

export function StatusBadge({ status, type, className = '' }: StatusBadgeProps) {
    let meta: StatusMeta;

    switch (type) {
        case 'guide':
            meta = getGuideStatusMeta(status);
            break;
        case 'batch':
            meta = getBatchStatusMeta(status);
            break;
        case 'appeal':
            meta = getAppealStatusMeta(status);
            break;
    }

    return (
        <Badge
            variant="outline"
            className={`font-medium tracking-wide text-xs px-2.5 py-0.5 border rounded-md select-none transition-colors ${meta.badgeClass} ${className}`}
            aria-label={`Status: ${meta.label}`}
        >
            {meta.label}
        </Badge>
    );
}
