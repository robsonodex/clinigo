import { type NextRequest, NextResponse } from 'next/server'
import { extractTextFromImage, extractMedicalData } from '@/lib/services/ocr-service'
import { handleApiError, ValidationError } from '@/lib/utils/errors'
import { successResponse } from '@/lib/utils/responses'

export const runtime = 'nodejs'

/**
 * POST /api/checkin/ocr
 * Extract data from uploaded document image for auto-fill
 * 
 * Body: { image: base64 string, mimeType: 'image/jpeg' | 'image/png' }
 * Returns: { patientInfo: { name, cpf, dateOfBirth, address }, documentType }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { image, mimeType } = body

        if (!image) {
            throw new ValidationError('Imagem é obrigatória')
        }

        // Remove data URL prefix if present
        const base64Data = image.includes('base64,')
            ? image.split('base64,')[1]
            : image

        const type = mimeType || 'image/jpeg'

        // Step 1: Extract text from image
        const ocrResult = await extractTextFromImage(base64Data, type)

        if (!ocrResult.success || !ocrResult.text) {
            return successResponse({
                success: false,
                message: 'Não foi possível extrair texto da imagem',
                error: ocrResult.error
            })
        }

        // Step 2: Extract structured data (name, CPF, etc.)
        const extractedData = await extractMedicalData(ocrResult.text)

        // Step 3: Try to extract address from text if not found
        let address: string | undefined
        if (!extractedData.patientInfo?.name) {
            // Try to extract name from RG/CNH pattern
            const nameMatch = ocrResult.text.match(/nome[:\s]+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛÇ\s]+)/i)
            if (nameMatch) {
                extractedData.patientInfo = {
                    ...extractedData.patientInfo,
                    name: nameMatch[1].trim()
                }
            }
        }

        // Extract CPF pattern if not found
        if (!extractedData.patientInfo?.cpf) {
            const cpfMatch = ocrResult.text.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/)
            if (cpfMatch) {
                extractedData.patientInfo = {
                    ...extractedData.patientInfo,
                    cpf: cpfMatch[0]
                }
            }
        }

        // Extract address pattern
        const addressMatch = ocrResult.text.match(/(?:endere[çc]o|resid[êe]ncia)[:\s]+([^\n]+)/i)
        if (addressMatch) {
            address = addressMatch[1].trim()
        }

        return successResponse({
            success: true,
            patientInfo: {
                name: extractedData.patientInfo?.name,
                cpf: extractedData.patientInfo?.cpf,
                dateOfBirth: extractedData.patientInfo?.dateOfBirth,
                address
            },
            documentType: extractedData.documentType || 'rg',
            rawText: ocrResult.text.substring(0, 500), // Truncate for response
            confidence: ocrResult.confidence
        })
    } catch (error) {
        console.error('[OCR API] Error:', error)
        return handleApiError(error)
    }
}
