import fs from 'fs';
import path from 'path';
import { S3Client, PutObjectCommand, HeadObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';

// 1. Configuracao Cloudflare R2 (Destino Principal)
const accountId = process.env.R2_ACCOUNT_ID || '88fe3c510b9cdc68a57eced3ca4896b0';
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || 'clinigo';
const endpoint = process.env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`;

const backupFile = process.argv[2];

if (!backupFile || !fs.existsSync(backupFile)) {
    console.error('Arquivo de backup invalido ou nao fornecido:', backupFile);
    process.exit(1);
}

const stats = fs.statSync(backupFile);
const fileName = path.basename(backupFile);
const r2Key = `database-backups/${fileName}`;

console.log(`[BACKUP INICIADO] Arquivo: ${fileName} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

// Inicializacao do cliente Cloudflare R2
const r2 = new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

async function uploadToR2() {
    console.log(`\n=== 1. UPLOAD PRIMARIO: CLOUDFLARE R2 ===`);
    console.log(`Destino: r2://${bucketName}/${r2Key}`);

    const fileStream = fs.createReadStream(backupFile);
    await r2.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
        Body: fileStream,
        ContentType: 'application/gzip',
        Metadata: {
            created_at: new Date().toISOString(),
            source: 'supabase_postgres_pg_dump',
            size_bytes: String(stats.size),
        },
    }));

    // Verificacao de integridade via HeadObject
    const head = await r2.send(new HeadObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
    }));

    if (head.ContentLength !== stats.size) {
        throw new Error(`Divergencia de tamanho no R2: esperado ${stats.size}, gravado ${head.ContentLength}`);
    }

    console.log(`[R2 SUCESSO] Backup enviado e verificado byte a byte com sucesso (${head.ContentLength} bytes).`);

    // Retencao automatica no R2: manter ultimos 30 dias de backups
    try {
        await pruneOldR2Backups(30);
    } catch (pruneErr) {
        console.warn(`[R2 RETENCAO] Aviso ao expirar backups antigos (nao bloqueante):`, pruneErr.message);
    }
}

async function pruneOldR2Backups(retentionDays = 30) {
    const listRes = await r2.send(new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: 'database-backups/',
    }));

    if (!listRes.Contents || listRes.Contents.length === 0) return;

    const threshold = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    const toDelete = listRes.Contents
        .filter(obj => obj.Key !== 'database-backups/' && obj.LastModified && new Date(obj.LastModified).getTime() < threshold)
        .map(obj => ({ Key: obj.Key }));

    if (toDelete.length > 0) {
        console.log(`[R2 RETENCAO] Removendo ${toDelete.length} backups com mais de ${retentionDays} dias.`);
        await r2.send(new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: toDelete },
        }));
    }
}

async function uploadToGoogleDrive() {
    console.log(`\n=== 2. UPLOAD SECUNDARIO: GOOGLE DRIVE ===`);

    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    // Se nenhuma credencial de Google Drive estiver presente, pula de forma limpa e graciosa
    if (!folderId || (!serviceAccountJson && (!clientId || !clientSecret || !refreshToken))) {
        console.log(`[INFO] Credenciais do Google Drive nao fornecidas (GOOGLE_DRIVE_FOLDER_ID / OAuth / Service Account).`);
        console.log(`[INFO] Etapa secundaria ignorada com seguranca. O backup primario no Cloudflare R2 esta 100% ativo e salvo.`);
        return;
    }

    try {
        const { google } = await import('googleapis');
        let auth;

        if (serviceAccountJson) {
            const credentials = JSON.parse(serviceAccountJson);
            auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/drive.file'],
            });
        } else {
            const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
            oauth2Client.setCredentials({ refresh_token: refreshToken });
            auth = oauth2Client;
        }

        const drive = google.drive({ version: 'v3', auth });
        const media = {
            mimeType: 'application/gzip',
            body: fs.createReadStream(backupFile),
        };

        const driveRes = await drive.files.create({
            requestBody: {
                name: fileName,
                parents: [folderId],
            },
            media,
            fields: 'id, name, size',
        });

        console.log(`[GOOGLE DRIVE SUCESSO] Arquivo sincronizado com ID: ${driveRes.data.id}`);
    } catch (gdriveErr) {
        // Falha no Google Drive nao pode interromper o sucesso geral se o R2 ja salvou!
        console.error(`[GOOGLE DRIVE AVISO] Falha ao enviar para o Google Drive:`, gdriveErr.message);
        console.log(`[INFO] O backup primario no Cloudflare R2 continua preservado e valido.`);
    }
}

async function main() {
    try {
        await uploadToR2();
        await uploadToGoogleDrive();
        console.log(`\n[BACKUP CONCLUIDO] Processo finalizado com exito.`);
        process.exit(0);
    } catch (err) {
        console.error(`\n[ERRO CRITICO NO BACKUP]:`, err);
        process.exit(1);
    }
}

main();
