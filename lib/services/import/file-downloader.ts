import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Downloads a file from Supabase storage.
 * Tries: 1) Direct storage download, 2) Signed URL, 3) Public fetch fallback
 */
export async function downloadImportFile(fileUrl: string, supabase: SupabaseClient): Promise<Buffer> {
    const urlObj = new URL(fileUrl);
    const pathParts = urlObj.pathname.split('/documents/');

    if (pathParts.length > 1) {
        const filePath = decodeURIComponent(pathParts[1]);
        console.log('[Import Download] Attempting storage download for path:', filePath);

        // Attempt 1: Direct Supabase Storage download (works with service role)
        const { data, error } = await supabase.storage.from('documents').download(filePath);

        if (!error && data) {
            console.log('[Import Download] Storage download successful');
            const arrayBuffer = await data.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }

        console.warn('[Import Download] Storage download failed:', error?.message);

        // Attempt 2: Create a signed URL for private buckets
        const { data: signedData, error: signError } = await supabase.storage
            .from('documents')
            .createSignedUrl(filePath, 300); // 5 min expiry

        if (!signError && signedData?.signedUrl) {
            console.log('[Import Download] Using signed URL');
            const response = await fetch(signedData.signedUrl);
            if (response.ok) {
                const arrayBuffer = await response.arrayBuffer();
                return Buffer.from(arrayBuffer);
            }
            console.warn('[Import Download] Signed URL fetch failed:', response.status);
        } else {
            console.warn('[Import Download] Signed URL creation failed:', signError?.message);
        }
    }

    // Attempt 3: Direct public fetch (last resort)
    console.log('[Import Download] Falling back to direct fetch');
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
        throw new Error(`Erro ao baixar arquivo de importação (HTTP ${fileResponse.status}). Verifique se o arquivo ainda existe no storage.`);
    }
    const arrayBuffer = await fileResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

