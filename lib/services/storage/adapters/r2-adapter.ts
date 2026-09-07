import { StorageService, UploadParams, UploadResult } from '../storage-service'
import { getR2Client } from '../r2-client'
import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import crypto from 'crypto'

export class R2StorageAdapter implements StorageService {
    private bucketName: string

    constructor(bucketName?: string) {
        this.bucketName = bucketName || process.env.R2_BUCKET_NAME || 'clinigo-patient-documents'
    }

    async upload(params: UploadParams): Promise<UploadResult> {
        const { clinicId, module, entityId, file, filename, contentType } = params
        const client = getR2Client()

        const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_')
        const uniqueId = crypto.randomUUID().substring(0, 8)
        // Padrao obrigatorio: {clinic_id}/{modulo}/{entidade_id}/{uuid}-{nome_original_sanitizado}
        const storageKey = `${clinicId}/${module}/${entityId}/${uniqueId}-${sanitizedFilename}`

        const command = new PutObjectCommand({
            Bucket: this.bucketName,
            Key: storageKey,
            Body: file,
            ContentType: contentType,
            Metadata: {
                clinicId,
                module,
                entityId,
                originalName: encodeURIComponent(filename),
                uploadedAt: new Date().toISOString(),
            },
        })

        try {
            await client.send(command)
            console.log(`[R2_STORAGE] Upload concluido: key=${storageKey}, size=${file.length} bytes, clinic=${clinicId}`)
        } catch (error: any) {
            console.error('[R2_STORAGE_ADAPTER] Upload error:', error)
            throw new Error(`Falha no upload para Cloudflare R2: ${error?.message || 'Erro desconhecido'}`)
        }

        return {
            key: `r2://${storageKey}`,
            provider: 'r2',
        }
    }

    async getSignedReadUrl(params: { key: string; expiresInSeconds?: number }): Promise<string> {
        const { key, expiresInSeconds = 600 } = params
        const client = getR2Client()
        const cleanKey = key.replace(/^r2:\/\//, '')

        const command = new GetObjectCommand({
            Bucket: this.bucketName,
            Key: cleanKey,
        })

        try {
            const signedUrl = await getSignedUrl(client, command, {
                expiresIn: expiresInSeconds,
            })
            return signedUrl
        } catch (error: any) {
            console.error('[R2_STORAGE_ADAPTER] Presign error:', error)
            throw new Error(`Falha ao gerar URL assinada R2: ${error?.message || 'Erro desconhecido'}`)
        }
    }

    async delete(params: { key: string }): Promise<void> {
        const { key } = params
        const client = getR2Client()
        const cleanKey = key.replace(/^r2:\/\//, '')

        const command = new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: cleanKey,
        })

        try {
            await client.send(command)
            console.log(`[R2_STORAGE] Objeto removido: key=${cleanKey}`)
        } catch (error: any) {
            console.error('[R2_STORAGE_ADAPTER] Delete error:', error)
            throw new Error(`Falha ao remover arquivo do Cloudflare R2: ${error?.message || 'Erro desconhecido'}`)
        }
    }
}
