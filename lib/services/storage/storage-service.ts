import { isR2Configured } from './r2-client'
import { SupabaseStorageAdapter } from './adapters/supabase-adapter'
import { R2StorageAdapter } from './adapters/r2-adapter'

export interface UploadParams {
    clinicId: string
    module: string
    entityId: string
    file: Buffer
    filename: string
    contentType: string
}

export interface UploadResult {
    key: string
    provider: 'supabase' | 'r2'
    publicUrl?: string
}

export interface StorageService {
    upload(params: UploadParams): Promise<UploadResult>
    getSignedReadUrl(params: { key: string; expiresInSeconds?: number }): Promise<string>
    delete(params: { key: string }): Promise<void>
}

/**
 * Fabrica para obter o servico de storage de acordo com feature flags e configuracao.
 * Rollback instantaneo: alternar a env var para 'supabase' reverte o provedor sem deploy.
 */
export function getStorageService(module: string = 'patient-documents'): StorageService {
    // Normalizar nome do modulo para variavel de ambiente (ex: patient-documents -> PATIENT_DOCUMENTS)
    const envKey = `STORAGE_PROVIDER_${module.toUpperCase().replace(/-/g, '_')}`
    const providerFromEnv = (process.env[envKey] || process.env.STORAGE_PROVIDER_DEFAULT || 'supabase').toLowerCase()

    const shouldUseR2 = providerFromEnv === 'r2' && isR2Configured()

    if (shouldUseR2) {
        return new R2StorageAdapter()
    }

    // Fallback sempre seguro para Supabase Storage
    return new SupabaseStorageAdapter(module)
}
