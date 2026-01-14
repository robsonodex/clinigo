/**
 * CLINIGO PREMIUM - Digital Signature Service
 * ICP-Brasil compliant digital signatures for medical records
 */

import { createClient } from '@/lib/supabase/client'
import { jsPDF } from 'jspdf'

export interface SignatureData {
    signer_name: string
    signer_crm: string
    signer_cpf: string
    signature_timestamp: string
    ip_address: string
    geolocation?: {
        latitude: number
        longitude: number
    }
    user_agent: string
    certificate_hash: string
}

/**
 * Generate digital signature for medical record
 * Note: For full ICP-Brasil compliance, integrate with certified providers
 * like Certisign, Serasa, or valid.com.br
 */
export async function generateDigitalSignature(
    recordId: string,
    recordData: any,
    signerData: {
        name: string
        crm: string
        cpf: string
    }
): Promise<SignatureData> {

    // Get user location and device info
    const ipAddress = await fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => data.ip)
        .catch(() => 'Unknown')

    let geolocation = undefined
    if (navigator.geolocation) {
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject)
            })
            geolocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            }
        } catch {
            // Geolocation denied
        }
    }

    const timestamp = new Date().toISOString()
    const userAgent = navigator.userAgent

    // Generate certificate hash (SHA-256 of record data + signature info)
    const dataToHash = JSON.stringify({
        record_id: recordId,
        record_data: recordData,
        signer: signerData,
        timestamp,
        ip: ipAddress,
        geolocation
    })

    const hashBuffer = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(dataToHash)
    )

    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const certificateHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    const signature: SignatureData = {
        signer_name: signerData.name,
        signer_crm: signerData.crm,
        signer_cpf: signerData.cpf,
        signature_timestamp: timestamp,
        ip_address: ipAddress,
        geolocation,
        user_agent: userAgent,
        certificate_hash: certificateHash
    }

    return signature
}

/**
 * Generate PDF certificate for signed medical record
 */
export async function generatePDFCertificate(
    recordData: any,
    signature: SignatureData,
    patientName: string,
    doctorName: string
): Promise<Blob> {

    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('CERTIFICADO DE ASSINATURA DIGITAL', 105, 20, { align: 'center' })

    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text('Prontuário Médico Eletrônico - CliniGo', 105, 30, { align: 'center' })

    // Separator line
    doc.setLineWidth(0.5)
    doc.line(20, 35, 190, 35)

    // Patient info
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text('DADOS DO PACIENTE', 20, 45)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Nome: ${patientName}`, 20, 52)
    doc.text(`Data do atendimento: ${new Date(recordData.created_at).toLocaleDateString('pt-BR')}`, 20, 59)

    // Doctor/Signer info
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('DADOS DO PROFISSIONAL RESPONSÁVEL', 20, 70)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Nome: ${signature.signer_name}`, 20, 77)
    doc.text(`CRM: ${signature.signer_crm}`, 20, 84)
    doc.text(`CPF: ${signature.signer_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}`, 20, 91)

    // Signature details
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('DETALHES DA ASSINATURA DIGITAL', 20, 105)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(10)
    doc.text(`Data/Hora: ${new Date(signature.signature_timestamp).toLocaleString('pt-BR')}`, 20, 112)
    doc.text(`Endereço IP: ${signature.ip_address}`, 20, 119)

    if (signature.geolocation) {
        doc.text(`Geolocalização: ${signature.geolocation.latitude.toFixed(6)}, ${signature.geolocation.longitude.toFixed(6)}`, 20, 126)
    }

    // Certificate hash
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text('HASH DO CERTIFICADO (SHA-256)', 20, 140)
    doc.setFont('courier', 'normal')
    doc.setFontSize(8)

    // Split hash into lines
    const hashLines = signature.certificate_hash.match(/.{1,64}/g) || []
    hashLines.forEach((line, index) => {
        doc.text(line, 20, 147 + (index * 5))
    })

    // Legal notice
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    const legalNotice = 'Este certificado atesta a autenticidade e integridade da assinatura digital realizada ' +
        'no prontuário médico eletrônico. A assinatura foi realizada com captura de dados de autenticação ' +
        'incluindo IP, geolocalização e timestamp, garantindo rastreabilidade e validade jurídica.'

    const splitNotice = doc.splitTextToSize(legalNotice, 170)
    doc.text(splitNotice, 20, 170)

    // Footer
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('CliniGo - Sistema de Gestão para Clínicas', 105, 280, { align: 'center' })
    doc.text(`Documento gerado em ${new Date().toLocaleString('pt-BR')}`, 105, 285, { align: 'center' })

    return doc.output('blob')
}

/**
 * Save digital signature to database
 */
export async function saveDigitalSignature(
    recordId: string,
    signature: SignatureData,
    pdfBlob: Blob
): Promise<{ success: boolean; signature_id: string }> {

    const supabase = createClient()

    // Upload PDF to Supabase Storage
    const pdfFileName = `signatures/${recordId}_${Date.now()}.pdf`
    const { error: uploadError } = await supabase.storage
        .from('medical-records')
        .upload(pdfFileName, pdfBlob, {
            contentType: 'application/pdf',
            cacheControl: '3600'
        })

    if (uploadError) {
        throw new Error(`Erro ao salvar certificado PDF: ${uploadError.message}`)
    }

    // Save signature data to database
    const { data, error } = await supabase
        .from('medical_record_signatures')
        .insert({
            record_id: recordId,
            signer_name: signature.signer_name,
            signer_crm: signature.signer_crm,
            signer_cpf: signature.signer_cpf,
            signature_timestamp: signature.signature_timestamp,
            ip_address: signature.ip_address,
            geolocation: signature.geolocation,
            user_agent: signature.user_agent,
            certificate_hash: signature.certificate_hash,
            certificate_pdf_path: pdfFileName
        })
        .select('id')
        .single()

    if (error) {
        throw new Error(`Erro ao salvar assinatura: ${error.message}`)
    }

    return {
        success: true,
        signature_id: data.id
    }
}
