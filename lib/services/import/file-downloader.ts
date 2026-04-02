import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Downloads a file from Supabase storage or falls back to fetch if the URL is not a standard storage URL.
 * Uses the Supabase client to bypass public bucket restrictions if the client is authenticated.
 */
export async function downloadImportFile(fileUrl: string, supabase: SupabaseClient): Promise<Buffer> {
    try {
        const urlObj = new URL(fileUrl);
        const pathParts = urlObj.pathname.split('/documents/');
        
        if (pathParts.length > 1) {
            // Extract the path after the bucket name
            const filePath = decodeURIComponent(pathParts[1]);
            
            const { data, error } = await supabase.storage.from('documents').download(filePath);
            
            if (error) {
                throw new Error(`Storage download error: ${error.message}`);
            }
            
            const arrayBuffer = await data.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
    } catch (e) {
        console.warn('[Import Download] URL parse/download failed, falling back to fetch', e);
    }

    // Fallback if URL structure doesn't match or above failed
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
        throw new Error('Failed to fetch file: ' + fileResponse.status);
    }
    const arrayBuffer = await fileResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
}
