'use client'

import { useCallback, useEffect, useState } from 'react'

export type SidebarThemeMode = 'light' | 'dark'
export type AppThemeMode = SidebarThemeMode

const SIDEBAR_STORAGE_KEY = 'clinigo-sidebar-theme'
const LEGACY_APP_KEY = 'clinigo-theme-mode'
const SIDEBAR_THEME_EVENT = 'clinigo-sidebar-theme-changed'

function ensureLightSystemSurface() {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.remove('dark')
    root.style.colorScheme = 'light'
}

function readStoredSidebarTheme(): SidebarThemeMode {
    if (typeof window === 'undefined') return 'light'
    try {
        // Remove qualquer resquício de tema escuro global
        window.localStorage.removeItem(LEGACY_APP_KEY)
        const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY)
        if (saved === 'dark-green' || saved === 'dark') return 'dark'
        if (saved === 'light-classic' || saved === 'light') return 'light'
    } catch {
        // Ignore storage errors (private mode / SSR)
    }
    return 'light'
}

/**
 * Hook de tema EXCLUSIVO do Menu Lateral (Sidebar) do CliniGo.
 * O sistema em si permanece SEMPRE em Tema Claro Editorial;
 * apenas o menu lateral pode alternar entre Claro e Escuro.
 */
export function useSidebarTheme() {
    const [theme, setThemeState] = useState<SidebarThemeMode>('light')
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        ensureLightSystemSurface()
        const initial = readStoredSidebarTheme()
        setThemeState(initial)
        setMounted(true)

        const onThemeEvent = (e: Event) => {
            const detail = (e as CustomEvent<SidebarThemeMode>).detail
            if (detail === 'light' || detail === 'dark') {
                setThemeState(detail)
            }
        }

        const onStorage = (e: StorageEvent) => {
            if (e.key === SIDEBAR_STORAGE_KEY) {
                setThemeState(e.newValue === 'dark-green' || e.newValue === 'dark' ? 'dark' : 'light')
            }
        }

        window.addEventListener(SIDEBAR_THEME_EVENT, onThemeEvent)
        window.addEventListener('storage', onStorage)
        return () => {
            window.removeEventListener(SIDEBAR_THEME_EVENT, onThemeEvent)
            window.removeEventListener('storage', onStorage)
        }
    }, [])

    const setTheme = useCallback((next: SidebarThemeMode) => {
        ensureLightSystemSurface()
        setThemeState(next)
        try {
            window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next === 'dark' ? 'dark-green' : 'light-classic')
        } catch {
            // Ignore storage errors
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent<SidebarThemeMode>(SIDEBAR_THEME_EVENT, { detail: next }))
        }
    }, [])

    const toggleTheme = useCallback(() => {
        setTheme(theme === 'dark' ? 'light' : 'dark')
    }, [theme, setTheme])

    return {
        theme,
        isDark: theme === 'dark',
        mounted,
        setTheme,
        toggleTheme,
    }
}

// Alias mantido por retrocompatibilidade (controla exclusivamente o Menu Lateral)
export const useAppTheme = useSidebarTheme
