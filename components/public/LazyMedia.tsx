'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'

// =============================================================================
// Types
// =============================================================================

interface LazyImageProps {
    src: string
    alt: string
    width?: number
    height?: number
    fill?: boolean
    className?: string
    priority?: boolean
    placeholder?: 'blur' | 'empty'
    blurDataURL?: string
    onLoad?: () => void
}

interface LazyVideoProps {
    src: string
    poster?: string
    className?: string
    autoPlay?: boolean
    muted?: boolean
    loop?: boolean
    playsInline?: boolean
}

// =============================================================================
// Lazy Image Component
// =============================================================================

/**
 * Lazy-loaded image with intersection observer
 * Falls back to placeholder until in viewport
 */
export function LazyImage({
    src,
    alt,
    width,
    height,
    fill = false,
    className = '',
    priority = false,
    placeholder = 'empty',
    blurDataURL,
    onLoad,
}: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false)
    const [isInView, setIsInView] = useState(priority)
    const imgRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (priority) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true)
                    observer.disconnect()
                }
            },
            { rootMargin: '50px' }
        )

        if (imgRef.current) {
            observer.observe(imgRef.current)
        }

        return () => observer.disconnect()
    }, [priority])

    const handleLoad = () => {
        setIsLoaded(true)
        onLoad?.()
    }

    return (
        <div
            ref={imgRef}
            className={`relative overflow-hidden ${className}`}
            style={!fill ? { width, height } : undefined}
        >
            {/* Placeholder */}
            {!isLoaded && (
                <div className="absolute inset-0 bg-gray-200 animate-pulse" />
            )}

            {/* Image */}
            {isInView && (
                <Image
                    src={src}
                    alt={alt}
                    width={fill ? undefined : width}
                    height={fill ? undefined : height}
                    fill={fill}
                    className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={handleLoad}
                    priority={priority}
                    placeholder={blurDataURL ? 'blur' : placeholder}
                    blurDataURL={blurDataURL}
                />
            )}
        </div>
    )
}

// =============================================================================
// Lazy Video Component
// =============================================================================

/**
 * Lazy-loaded video with intersection observer
 * Only loads and plays when in viewport
 */
export function LazyVideo({
    src,
    poster,
    className = '',
    autoPlay = true,
    muted = true,
    loop = true,
    playsInline = true,
}: LazyVideoProps) {
    const [isInView, setIsInView] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)
    const videoRef = useRef<HTMLVideoElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsInView(entry.isIntersecting)

                // Pause when out of view to save resources
                if (videoRef.current) {
                    if (entry.isIntersecting) {
                        videoRef.current.play().catch(() => { })
                    } else {
                        videoRef.current.pause()
                    }
                }
            },
            { rootMargin: '50px' }
        )

        if (containerRef.current) {
            observer.observe(containerRef.current)
        }

        return () => observer.disconnect()
    }, [])

    return (
        <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
            {/* Poster placeholder */}
            {!isLoaded && poster && (
                <Image
                    src={poster}
                    alt=""
                    fill
                    className="object-cover"
                />
            )}

            {/* Loading spinner */}
            {!isLoaded && !poster && (
                <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
            )}

            {/* Video */}
            {isInView && (
                <video
                    ref={videoRef}
                    src={src}
                    poster={poster}
                    autoPlay={autoPlay}
                    muted={muted}
                    loop={loop}
                    playsInline={playsInline}
                    onLoadedData={() => setIsLoaded(true)}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
            )}
        </div>
    )
}

// =============================================================================
// Preload Critical Resources
// =============================================================================

/**
 * Preload critical images for faster LCP
 */
export function preloadImage(src: string): void {
    if (typeof window === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'image'
    link.href = src
    document.head.appendChild(link)
}

/**
 * Preload critical font
 */
export function preloadFont(url: string): void {
    if (typeof window === 'undefined') return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.as = 'font'
    link.type = 'font/woff2'
    link.crossOrigin = 'anonymous'
    link.href = url
    document.head.appendChild(link)
}
