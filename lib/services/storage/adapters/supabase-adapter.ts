import { StorageService, UploadParams, UploadResult } from '../storage-service'
import { createServiceRoleClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export class SupabaseStorageAdapter implements StorageService {
    private bucketName: string

    constructor(bucketName: string = 'patient-documents') {
        this.bucketName = bucketName
    }

    async upload(params: UploadParams): Promise<UploadResult> {
        const { clinicId, entityId, file, filename, contentType } = params
        const adminDb = createServiceRoleClient() as any

        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
        const uniqueId = crypto.randomUUID().substring(0, 8)
        const storagePath = `${clinicId}/${entityId}/${uniqueId}-${sanitizedFilename}`

        const { error: uploadError } = await adminDb.storage
            .from(this.bucketName)
            .upload(storagePath, file, {
                contentType,
                upsert: true,
            })

        if (uploadError) {
            console.error('[SUPABASE_STORAGE_ADAPTER] Upload error:', uploadError)
            throw new Error(`Falha no upload para Supabase Storage: ${uploadError.message}`)
        }

        return {
            key: storagePath,
            provider: 'supabase',
        }
    }

    async getSignedReadUrl(params: { key: string; expiresInSeconds?: number }): Promise<string> {
        const { key, expiresInSeconds = 600 } = params
        const adminDb = createServiceRoleClient() as any

        let cleanPath = key.replace(/^supabase:\/\//, '')
        if (cleanPath.includes(`${this.bucketName}/`)) {
            cleanPath = cleanPath.split(`${this.bucketName}/`)[1].split('?')[0]
        }

        const { data, error } = await adminDb.storage
            .from(this.bucketName)
            .createSignedUrl(cleanPath, expiresInSeconds)

        if (error || !data?.signedUrl) {
            throw new Error(`Falha ao gerar URL assinada Supabase: ${error?.message || 'Erro desconhecido'}`)
        }

        return data.signedUrl
    }

    async delete(params: { key: string }): Promise<void> {
        const { key } = params
        const adminDb = createServiceRoleClient() as any

        let cleanPath = key.replace(/^supabase:\/\//, '')
        if (cleanPath.includes(`${this.bucketName}/`)) {
            cleanPath = cleanPath.split(`${this.bucketName}/`)[1].split('?')[0]
        }

        const { error } = await adminDb.storage
            .from(this.bucketName)
            .remove([cleanPath])

        if (error) {
            console.error('[SUPABASE_STORAGE_ADAPTER] Delete error:', error)
            throw new Error(`Falha ao remover arquivo do Supabase Storage: ${error.message}`)
        }
    }
}
