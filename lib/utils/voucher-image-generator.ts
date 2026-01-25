import { toPng } from 'html-to-image'

export interface VoucherData {
    patientName: string
    appointmentDate: string
    appointmentTime: string
    doctorName: string
    qrCodeImage: string
    clinicName?: string
    clinicAddress?: string
    clinicPhone?: string
    appointmentType?: string
}

/**
 * Gera uma imagem PNG do comprovante de agendamento
 * @param element - Elemento HTML do voucher
 * @returns Promise<string> - Data URL da imagem gerada
 */
export async function generateVoucherImage(element: HTMLElement): Promise<string> {
    try {
        const dataUrl = await toPng(element, {
            quality: 0.95,
            pixelRatio: 2, // Higher resolution
            backgroundColor: '#ffffff',
        })
        return dataUrl
    } catch (error) {
        console.error('Error generating voucher image:', error)
        throw new Error('Não foi possível gerar a imagem do comprovante')
    }
}

/**
 * Faz download da imagem do voucher
 * @param dataUrl - Data URL da imagem
 * @param fileName - Nome do arquivo
 */
export function downloadVoucherImage(dataUrl: string, fileName: string): void {
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

/**
 * Converte Data URL para Blob
 * @param dataUrl - Data URL da imagem
 * @returns Blob
 */
export function dataURLtoBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',')
    const mimeMatch = arr[0].match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : 'image/png'
    const bstr = atob(arr[1])
    let n = bstr.length
    const u8arr = new Uint8Array(n)

    while (n--) {
        u8arr[n] = bstr.charCodeAt(n)
    }

    return new Blob([u8arr], { type: mime })
}

/**
 * Compartilha imagem via Web Share API
 * @param dataUrl - Data URL da imagem
 * @param fileName - Nome do arquivo
 * @param text - Texto adicional para compartilhar
 */
export async function shareVoucherImage(
    dataUrl: string,
    fileName: string,
    text?: string
): Promise<void> {
    try {
        const blob = dataURLtoBlob(dataUrl)
        const file = new File([blob], fileName, { type: 'image/png' })

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
            await navigator.share({
                files: [file],
                text: text || 'Comprovante de Agendamento',
            })
        } else {
            // Fallback: download
            downloadVoucherImage(dataUrl, fileName)
        }
    } catch (error) {
        console.error('Error sharing voucher:', error)
        // Fallback: download
        downloadVoucherImage(dataUrl, fileName)
    }
}
