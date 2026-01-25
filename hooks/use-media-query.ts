/**
 * Media Query Hook
 * React hook for responsive design
 */
'use client'

import { useEffect, useState } from 'react'

export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        const media = window.matchMedia(query)

        // Set initial value
        setMatches(media.matches)

        // Create listener
        const listener = (event: MediaQueryListEvent) => {
            setMatches(event.matches)
        }

        // Modern browsers
        if (media.addEventListener) {
            media.addEventListener('change', listener)
            return () => media.removeEventListener('change', listener)
        } else {
            // Fallback for older browsers
            media.addListener(listener)
            return () => media.removeListener(listener)
        }
    }, [query])

    return matches
}

// Predefined breakpoints
export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
export const useIsTablet = () => useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
export const useIsDesktop = () => useMediaQuery('(min-width: 1024px)')
