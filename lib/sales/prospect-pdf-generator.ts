/**
 * Engine de Exportação de PDF de Alta Fidelidade (HTML/CSS/SVG A4 -> Imagem 2x via html-to-image -> jsPDF).
 *
 * Benefícios decisivos sobre desenho manual em jsPDF:
 *  - Tipografia UTF-8 nativa do navegador (ZERO bug de acentos ou setas corrompidas)
 *  - Layout CSS Flexbox/Grid real (ZERO corte horizontal ou vertical)
 *  - Gráficos SVG nítidos, QR Code real e logo oficial redondo em alta resolução
 *  - Preview ao vivo na tela 100% idêntico ao PDF baixado
 */

import {
    buildCommercialProposalHtml,
    buildContinuityReportHtml,
    buildExecutivePresentationHtml,
    slugifyPdfFilePart,
    type PdfPersonalizationInput,
    type RenderedPdfAssets,
} from './prospect-pdf-templates'

export type { PdfPersonalizationInput }

let cachedLogoDataUrl: string | null = null
let cachedQrDataUrl: string | null = null

export async function resolvePdfAssets(): Promise<RenderedPdfAssets> {
    if (typeof window === 'undefined') {
        return { logoSrc: '/logo-clinigo-round.jpg', qrDataUrl: null }
    }

    if (!cachedLogoDataUrl) {
        try {
            const res = await fetch('/logo-clinigo-round.jpg')
            if (res.ok) {
                const blob = await res.blob()
                cachedLogoDataUrl = await new Promise<string | null>((resolve) => {
                    const reader = new FileReader()
                    reader.onloadend = () =>
                        resolve(typeof reader.result === 'string' ? reader.result : null)
                    reader.onerror = () => resolve(null)
                    reader.readAsDataURL(blob)
                })
            }
        } catch {
            cachedLogoDataUrl = null
        }
    }

    if (!cachedQrDataUrl) {
        try {
            const QRCode = (await import('qrcode')).default
            cachedQrDataUrl = await QRCode.toDataURL('https://clinigo.app', {
                width: 160,
                margin: 1,
                color: { dark: '#0F2922', light: '#FFFFFF' },
            })
        } catch {
            cachedQrDataUrl = null
        }
    }

    return {
        logoSrc: cachedLogoDataUrl || '/logo-clinigo-round.jpg',
        qrDataUrl: cachedQrDataUrl,
    }
}

async function waitForImages(container: HTMLElement): Promise<void> {
    const imgs = Array.from(container.querySelectorAll('img'))
    await Promise.all(
        imgs.map(
            (img) =>
                new Promise<void>((resolve) => {
                    if (img.complete && img.naturalWidth > 0) {
                        resolve()
                        return
                    }
                    const timer = setTimeout(resolve, 1500)
                    img.onload = () => {
                        clearTimeout(timer)
                        resolve()
                    }
                    img.onerror = () => {
                        clearTimeout(timer)
                        resolve()
                    }
                })
        )
    )
}

async function renderHtmlPagesToPdfDownload(pagesHtml: string, fileName: string): Promise<string> {
    const [{ toJpeg }, { default: jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
    ])

    const host = document.createElement('div')
    host.style.position = 'fixed'
    host.style.left = '-10000px'
    host.style.top = '0'
    host.style.width = '794px'
    host.style.zIndex = '-1'
    host.style.pointerEvents = 'none'
    host.style.background = '#FFFFFF'
    host.innerHTML = pagesHtml
    document.body.appendChild(host)

    try {
        await waitForImages(host)
        if (document.fonts?.ready) {
            await document.fonts.ready.catch(() => {})
        }
        await new Promise((r) => setTimeout(r, 80))

        const pageNodes = Array.from(host.querySelectorAll<HTMLElement>('[data-pdf-page]'))
        if (pageNodes.length === 0) {
            throw new Error('Nenhuma página A4 encontrada para exportar')
        }

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })

        for (let i = 0; i < pageNodes.length; i++) {
            const pageEl = pageNodes[i]
            const dataUrl = await toJpeg(pageEl, {
                quality: 0.96,
                pixelRatio: 2,
                backgroundColor: '#FFFFFF',
                width: 794,
                height: 1123,
                cacheBust: false,
            })

            if (i > 0) {
                doc.addPage('a4', 'portrait')
            }
            doc.addImage(dataUrl, 'JPEG', 0, 0, 210, 297, undefined, 'FAST')
        }

        doc.save(fileName)
        return fileName
    } finally {
        host.remove()
    }
}

export async function generateContinuityReportPdf(input: PdfPersonalizationInput): Promise<string> {
    const assets = await resolvePdfAssets()
    const html = buildContinuityReportHtml(input, assets)
    const fileName = `modelo-relatorio-continuidade-${slugifyPdfFilePart(input.clinicName)}.pdf`
    return renderHtmlPagesToPdfDownload(html, fileName)
}

export async function generateExecutivePresentationPdf(input: PdfPersonalizationInput): Promise<string> {
    const assets = await resolvePdfAssets()
    const html = buildExecutivePresentationHtml(input, assets)
    const fileName = `apresentacao-executiva-clinigo-${slugifyPdfFilePart(input.clinicName)}.pdf`
    return renderHtmlPagesToPdfDownload(html, fileName)
}

export async function generateCommercialProposalPdf(input: PdfPersonalizationInput): Promise<string> {
    const assets = await resolvePdfAssets()
    const html = buildCommercialProposalHtml(input, assets)
    const fileName = `proposta-comercial-clinigo-${slugifyPdfFilePart(input.clinicName)}.pdf`
    return renderHtmlPagesToPdfDownload(html, fileName)
}
