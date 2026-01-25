/**
 * Virtualized List Component
 * @tanstack/react-virtual for optimal performance with large lists
 */
'use client'

import * as React from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'

interface VirtualizedListProps<T> {
    items: T[]
    estimateSize?: number
    overscan?: number
    renderItem: (item: T, index: number) => React.ReactNode
    getItemKey: (item: T, index: number) => string | number
    className?: string
    height?: string | number
}

export function VirtualizedList<T>({
    items,
    estimateSize = 80,
    overscan = 5,
    renderItem,
    getItemKey,
    className,
    height = '600px',
}: VirtualizedListProps<T>) {
    const parentRef = React.useRef<HTMLDivElement>(null)

    const virtualizer = useVirtualizer({
        count: items.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => estimateSize,
        overscan,
    })

    return (
        <div
            ref={parentRef}
            className={className}
            style={{
                height: typeof height === 'number' ? `${height}px` : height,
                overflow: 'auto',
            }}
        >
            <div
                style={{
                    height: `${virtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const item = items[virtualRow.index]
                    return (
                        <div
                            key={getItemKey(item, virtualRow.index)}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            {renderItem(item, virtualRow.index)}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
