import { S3Client } from '@aws-sdk/client-s3'

/**
 * Singleton client do Cloudflare R2 utilizando AWS SDK S3
 * R2 e compativel com a API S3 e possui zero custo de egress.
 */

let r2ClientInstance: S3Client | null = null

export function isR2Configured(): boolean {
    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const bucketName = process.env.R2_BUCKET_NAME

    return Boolean(accountId && accessKeyId && secretAccessKey && bucketName)
}

export function getR2Client(): S3Client {
    if (r2ClientInstance) return r2ClientInstance

    const accountId = process.env.R2_ACCOUNT_ID
    const accessKeyId = process.env.R2_ACCESS_KEY_ID
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
    const endpoint = process.env.R2_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined)

    if (!accessKeyId || !secretAccessKey || !endpoint) {
        throw new Error('[R2_CLIENT] Credenciais do Cloudflare R2 nao configuradas nas variaveis de ambiente.')
    }

    r2ClientInstance = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    })

    return r2ClientInstance
}
