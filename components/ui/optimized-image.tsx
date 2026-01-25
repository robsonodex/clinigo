/**
 * Optimized Image Component
 * Wrapper around Next.js Image with automatic optimization
 */
'use client'

import Image, { ImageProps } from 'next/image'
import { RESPONSIVE_PATTERNS } from '@/lib/utils/image-optimization'

interface OptimizedImageProps extends Omit<ImageProps, 'sizes'> {
    sizePattern?: keyof typeof RESPONSIVE_PATTERNS | string
    priority?: boolean
}

export function OptimizedImage({
    sizePattern = 'fullWidth',
    priority = false,
    ...props
}: OptimizedImageProps) {
    const sizes =
        typeof sizePattern === 'string' && sizePattern in RESPONSIVE_PATTERNS
            ? RESPONSIVE_PATTERNS[sizePattern as keyof typeof RESPONSIVE_PATTERNS]
            : sizePattern

    return (
        <Image
            {...props}
            sizes={sizes}
            priority={priority}
            quality={85} // Good balance between quality and file size
            placeholder="blur"
            blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWEREiMxUf/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
        />
    )
}
