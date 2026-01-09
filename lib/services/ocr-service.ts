/**
 * OCR Service using Nvidia API via OpenRouter
 * Provides text extraction from images and PDFs
 */

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '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'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

interface OCRResult {
    success: boolean
    text: string
    confidence: number
    provider: string
    error?: string
}

interface ExtractedData {
    text: string
    documentType?: string
    patientInfo?: {
        name?: string
        cpf?: string
        dateOfBirth?: string
    }
    examInfo?: {
        date?: string
        type?: string
        results?: Record<string, string>
    }
    icdCodes?: string[]
}

/**
 * Extract text from an image using Nvidia Vision API
 */
export async function extractTextFromImage(imageBase64: string, mimeType: string): Promise<OCRResult> {
    try {
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NVIDIA_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://clinigo.com.br',
                'X-Title': 'CliniGo OCR'
            },
            body: JSON.stringify({
                model: 'nvidia/llama-3.2-90b-vision-instruct',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: `Extraia TODO o texto visível desta imagem de documento médico. 
                       Mantenha a formatação original o máximo possível.
                       Se houver tabelas, formate como lista.
                       Se houver valores de exames, liste-os claramente.
                       Responda APENAS com o texto extraído, sem explicações.`
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:${mimeType};base64,${imageBase64}`
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 4096,
                temperature: 0.1
            })
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('Nvidia OCR error:', error)
            return {
                success: false,
                text: '',
                confidence: 0,
                provider: 'nvidia',
                error: `API error: ${response.status}`
            }
        }

        const data = await response.json()
        const extractedText = data.choices?.[0]?.message?.content || ''

        return {
            success: true,
            text: extractedText,
            confidence: 0.95, // Nvidia Vision typically has high accuracy
            provider: 'nvidia'
        }
    } catch (error) {
        console.error('OCR extraction error:', error)
        return {
            success: false,
            text: '',
            confidence: 0,
            provider: 'nvidia',
            error: String(error)
        }
    }
}

/**
 * Extract structured medical data from OCR text using AI
 */
export async function extractMedicalData(ocrText: string): Promise<ExtractedData> {
    try {
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NVIDIA_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://clinigo.com.br',
                'X-Title': 'CliniGo Medical Extraction'
            },
            body: JSON.stringify({
                model: 'nvidia/llama-3.1-nemotron-70b-instruct',
                messages: [
                    {
                        role: 'system',
                        content: `Você é um assistente especializado em extrair dados estruturados de documentos médicos.
                      Analise o texto e extraia as informações relevantes no formato JSON.
                      Se não encontrar alguma informação, não inclua o campo.`
                    },
                    {
                        role: 'user',
                        content: `Analise este texto de documento médico e extraia:
1. Tipo de documento (exame, receita, atestado, laudo, outro)
2. Dados do paciente (nome, CPF, data de nascimento)
3. Dados do exame (data, tipo, resultados com valores)
4. Códigos CID-10 mencionados

Texto:
${ocrText}

Responda APENAS com JSON válido no formato:
{
  "documentType": "...",
  "patientInfo": { "name": "...", "cpf": "...", "dateOfBirth": "..." },
  "examInfo": { "date": "...", "type": "...", "results": { "item": "valor" } },
  "icdCodes": ["código1", "código2"]
}`
                    }
                ],
                max_tokens: 2048,
                temperature: 0.1
            })
        })

        if (!response.ok) {
            console.error('Medical extraction error:', await response.text())
            return { text: ocrText }
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content || ''

        // Try to parse JSON from the response
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0])
                return {
                    text: ocrText,
                    ...parsed
                }
            }
        } catch (parseError) {
            console.error('JSON parse error:', parseError)
        }

        return { text: ocrText }
    } catch (error) {
        console.error('Medical data extraction error:', error)
        return { text: ocrText }
    }
}

/**
 * Classify document type using AI
 */
export async function classifyDocument(ocrText: string): Promise<string> {
    try {
        const response = await fetch(OPENROUTER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NVIDIA_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://clinigo.com.br',
                'X-Title': 'CliniGo Document Classification'
            },
            body: JSON.stringify({
                model: 'nvidia/llama-3.1-nemotron-70b-instruct',
                messages: [
                    {
                        role: 'user',
                        content: `Classifique este documento médico em UMA das categorias:
- exam (exame laboratorial, raio-x, ultrassom, etc)
- prescription (receita médica)
- certificate (atestado médico)
- report (laudo médico)
- referral (encaminhamento)
- consent (termo de consentimento)
- other (outro tipo)

Texto do documento:
${ocrText.substring(0, 1000)}

Responda APENAS com a categoria em lowercase, sem explicação.`
                    }
                ],
                max_tokens: 20,
                temperature: 0
            })
        })

        if (!response.ok) {
            return 'other'
        }

        const data = await response.json()
        const category = data.choices?.[0]?.message?.content?.trim().toLowerCase() || 'other'

        // Validate category
        const validCategories = ['exam', 'prescription', 'certificate', 'report', 'referral', 'consent', 'other']
        return validCategories.includes(category) ? category : 'other'
    } catch (error) {
        console.error('Classification error:', error)
        return 'other'
    }
}

/**
 * Process a document: extract text, classify, and extract structured data
 */
export async function processDocument(
    imageBase64: string,
    mimeType: string
): Promise<{
    ocr: OCRResult
    classification: string
    extractedData: ExtractedData
}> {
    // Step 1: Extract text via OCR
    const ocr = await extractTextFromImage(imageBase64, mimeType)

    if (!ocr.success || !ocr.text) {
        return {
            ocr,
            classification: 'other',
            extractedData: { text: '' }
        }
    }

    // Step 2: Classify document type
    const classification = await classifyDocument(ocr.text)

    // Step 3: Extract structured medical data
    const extractedData = await extractMedicalData(ocr.text)

    return {
        ocr,
        classification,
        extractedData
    }
}

