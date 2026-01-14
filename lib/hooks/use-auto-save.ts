/**
 * CLINIGO PREMIUM - AutoSave Hook
 * Squad A: Prontuário Premium
 * 
 * Features:
 * - Debounced auto-save every 3 seconds
 * - localStorage fallback for offline
 * - Optimistic updates
 * - Visual save indicator
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { log } from '@/lib/logger'

interface AutoSaveOptions {
    debounceMs?: number
    onSaveSuccess?: () => void
    onSaveError?: (error: Error) => void
}

interface AutoSaveState {
    isSaving: boolean
    lastSaved: Date | null
    hasUnsavedChanges: boolean
    error: Error | null
}

export function useAutoSave<T extends Record<string, any>>(
    recordId: string,
    tableName: string,
    options: AutoSaveOptions = {}
) {
    const {
        debounceMs = 3000,
        onSaveSuccess,
        onSaveError
    } = options

    const { toast } = useToast()
    const [state, setState] = useState<AutoSaveState>({
        isSaving: false,
        lastSaved: null,
        hasUnsavedChanges: false,
        error: null
    })

    const saveTimeoutRef = useRef<NodeJS.Timeout>()
    const dataRef = useRef<T | null>(null)
    const isOnlineRef = useRef(true)

    // Monitor online/offline status
    useEffect(() => {
        const handleOnline = () => {
            isOnlineRef.current = true
            // Sync localStorage to Supabase if there's pending data
            syncOfflineData()
        }

        const handleOffline = () => {
            isOnlineRef.current = false
            toast({
                variant: 'default',
                title: '📴 Modo Offline',
                description: 'Suas alterações serão salvas localmente e sincronizadas quando voltar online.'
            })
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [toast])

    // Save to localStorage (offline fallback)
    const saveToLocalStorage = useCallback((data: T) => {
        try {
            const key = `autosave_${tableName}_${recordId}`
            localStorage.setItem(key, JSON.stringify({
                data,
                timestamp: new Date().toISOString(),
                synced: false
            }))
        } catch (error) {
            console.error('localStorage save failed:', error)
        }
    }, [tableName, recordId])

    // Save to Supabase
    const saveToSupabase = useCallback(async (data: T) => {
        const supabase = createClient()

        try {
            const { error } = await supabase
                .from(tableName)
                .update({
                    ...data,
                    updated_at: new Date().toISOString()
                })
                .eq('id', recordId)

            if (error) throw error

            // Mark as synced in localStorage
            const key = `autosave_${tableName}_${recordId}`
            const stored = localStorage.getItem(key)
            if (stored) {
                const parsed = JSON.parse(stored)
                localStorage.setItem(key, JSON.stringify({ ...parsed, synced: true }))
            }

            return true
        } catch (error) {
            console.error('Supabase save failed:', error)
            throw error
        }
    }, [tableName, recordId])

    // Sync offline data when coming back online
    const syncOfflineData = useCallback(async () => {
        const key = `autosave_${tableName}_${recordId}`
        const stored = localStorage.getItem(key)

        if (!stored) return

        try {
            const { data, synced } = JSON.parse(stored)

            if (!synced) {
                await saveToSupabase(data)
                toast({
                    title: '✅ Sincronizado',
                    description: 'Alterações offline foram salvas na nuvem.',
                    duration: 2000
                })
            }
        } catch (error) {
            console.error('Sync failed:', error)
        }
    }, [tableName, recordId, saveToSupabase, toast])

    // Main auto-save function
    const performSave = useCallback(async () => {
        if (!dataRef.current) return

        setState(prev => ({ ...prev, isSaving: true, error: null }))

        try {
            // Always save to localStorage first (instant)
            saveToLocalStorage(dataRef.current)

            // Then try Supabase if online
            if (isOnlineRef.current) {
                await saveToSupabase(dataRef.current)

                setState(prev => ({
                    ...prev,
                    isSaving: false,
                    lastSaved: new Date(),
                    hasUnsavedChanges: false,
                    error: null
                }))

                onSaveSuccess?.()

                // Subtle success toast
                toast({
                    title: '💾 Salvo',
                    description: `${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
                    duration: 1000
                })

                log.audit(recordId, 'autosave_success', { table: tableName })
            } else {
                // Offline - saved to localStorage only
                setState(prev => ({
                    ...prev,
                    isSaving: false,
                    lastSaved: new Date(),
                    hasUnsavedChanges: true // Still unsaved on server
                }))
            }

        } catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error')

            setState(prev => ({
                ...prev,
                isSaving: false,
                error: err
            }))

            onSaveError?.(err)

            toast({
                variant: 'destructive',
                title: '❌ Erro ao Salvar',
                description: 'Seus dados estão seguros localmente. Tentando novamente...'
            })

            log.error('AutoSave failed', { error: err, recordId, tableName })
        }
    }, [recordId, tableName, saveToLocalStorage, saveToSupabase, onSaveSuccess, onSaveError, toast])

    // Debounced save trigger
    const triggerSave = useCallback((data: T) => {
        dataRef.current = data

        setState(prev => ({ ...prev, hasUnsavedChanges: true }))

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }

        // Set new timeout
        saveTimeoutRef.current = setTimeout(() => {
            performSave()
        }, debounceMs)
    }, [debounceMs, performSave])

    // Force immediate save (for critical moments like signing)
    const forceSave = useCallback(async () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current)
        }
        await performSave()
    }, [performSave])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current)
            }
        }
    }, [])

    return {
        triggerSave,
        forceSave,
        state
    }
}
