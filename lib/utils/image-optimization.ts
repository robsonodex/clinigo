/**
 * Image Optimization Utilities
 * Convert images to WebP/AVIF and generate responsive srcset
 */

export interface ImageSizes {
    width: number
    height: number
}

export const DEVICE_SIZES = [640, 750, 828, 1080, 1200, 1920] as const

/**
 * Generate responsive srcset for Next.js Image
 */
export function generateSrcSet(
    basePath: string,
    sizes: typeof DEVICE_SIZES = DEVICE_SIZES
): string {
    return sizes.map((size) => `${basePath}?w=${size} ${size}w`).join(', ')
}

/**
 * Calculate optimal sizes attribute for responsive images
 */
export function getResponsiveSizes(
    breakpoints: { maxWidth: string; size: string }[]
): string {
    return breakpoints
        .map(({ maxWidth, size }) => `(max-width: ${maxWidth}) ${size}`)
        .join(', ')
}

/**
 * Common responsive sizes patterns
 */
export const RESPONSIVE_PATTERNS = {
    fullWidth: '100vw',
    halfWidth: '(max-width: 768px) 100vw, 50vw',
    thirdWidth: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    hero: '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px',
    thumbnail: '(max-width: 768px) 50vw, 25vw',
}

/**
 * Get optimized image format based on browser support
 */
export function getOptimizedFormat(): 'avif' | 'webp' | 'jpeg' {
    if (typeof window === 'undefined') return 'jpeg'

    // Check AVIF support
    const canvas = document.createElement('canvas')
    if (canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0) {
        return 'avif'
    }

    // Check WebP support
    if (canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0) {
        return 'webp'
    }

    return 'jpeg'
}

/**
 * Lazy load image with intersection observer
 */
export function lazyLoadImage(
    img: HTMLImageElement,
    options: IntersectionObserverInit = {}
): () => void {
    if (!('IntersectionObserver' in window)) {
        // Fallback: load immediately
        if (img.dataset.src) img.src = img.dataset.src
        return () => { }
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const image = entry.target as HTMLImageElement
                if (image.dataset.src) {
                    image.src = image.dataset.src
                    image.removeAttribute('data-src')
                    observer.unobserve(image)
                }
            }
        })
    }, options)

    observer.observe(img)

    return () => observer.disconnect()
}
