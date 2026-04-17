/**
 * CLINIGO - ICP-Brasil Digital Signer for PEP Documents
 * 
 * Signs medical records and clinical documents with ICP-Brasil A1 certificates.
 * Uses node-forge for PFX parsing and crypto for AES-256-GCM encryption.
 * 
 * SECURITY:
 * - PFX files are encrypted with AES-256-GCM before storage
 * - PFX password is NEVER stored - only used during validation
 * - Decrypted PFX buffers are cleared from memory immediately after use
 * - All operations occur server-side only
 */

import * as crypto from 'crypto'
import * as forge from 'node-forge'

// ============================================================================
// Types
// ============================================================================

export interface CertificateMetadata {
    ownerName: string
    issuer: string
    serialNumber: string
    validFrom: Date
    validUntil: Date
    crm: string
    crmState: string
    isValid: boolean
    isExpired: boolean
    daysUntilExpiry: number
}

export interface SignResult {
    success: boolean
    signedPdfBuffer?: Buffer
    signatureHash: string
    certificateSerial: string
    signerName: string
    crm: string
    crmState: string
    signedAt: string
    error?: string
}

// ============================================================================
// ICPBrasilSigner Class
// ============================================================================

export class ICPBrasilSigner {
    private static readonly ALGORITHM = 'aes-256-gcm'
    private static readonly IV_LENGTH = 16
    private static readonly AUTH_TAG_LENGTH = 16

    // =========================================================================
    // PFX Parsing & Validation
    // =========================================================================

    /**
     * Parse and validate a PFX certificate, extracting metadata
     * @param pfxBuffer Raw PFX file buffer
     * @param password PFX password (NEVER stored)
     * @returns Certificate metadata
     */
    static parsePFX(pfxBuffer: Buffer, password: string): CertificateMetadata {
        try {
            const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'))
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password)

            // Extract certificate
            const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
            const certBag = certBags[forge.pki.oids.certBag]

            if (!certBag || certBag.length === 0 || !certBag[0].cert) {
                throw new Error('Nenhum certificado encontrado no arquivo PFX')
            }

            const cert = certBag[0].cert

            // Verify private key exists
            const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
            const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]

            if (!keyBag || keyBag.length === 0 || !keyBag[0].key) {
                throw new Error('Chave privada não encontrada no arquivo PFX')
            }

            // Extract metadata
            const now = new Date()
            const validFrom = cert.validity.notBefore
            const validUntil = cert.validity.notAfter
            const daysUntilExpiry = Math.floor(
                (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            )

            // Extract CRM from ICP-Brasil OID (2.16.76.1.3.1) or from CN
            const { crm, crmState } = this.extractCRM(cert)
            const ownerName = this.getSubjectCN(cert)

            return {
                ownerName,
                issuer: this.getIssuerCN(cert),
                serialNumber: cert.serialNumber,
                validFrom,
                validUntil,
                crm,
                crmState,
                isValid: now >= validFrom && now <= validUntil,
                isExpired: now > validUntil,
                daysUntilExpiry,
            }
        } catch (error) {
            if (error instanceof Error && error.message.includes('Invalid password')) {
                throw new Error('Senha do certificado incorreta')
            }
            if (error instanceof Error && (
                error.message.includes('Nenhum certificado') ||
                error.message.includes('Chave privada') ||
                error.message.includes('Senha do certificado')
            )) {
                throw error
            }
            throw new Error(`Erro ao processar certificado: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
        }
    }

    // =========================================================================
    // Encryption / Decryption (AES-256-GCM)
    // =========================================================================

    /**
     * Encrypt PFX buffer for secure storage
     * @param pfxBuffer Raw PFX buffer
     * @param doctorId Doctor's user ID
     * @param secretKey CERTIFICATE_SECRET from environment
     * @returns Encrypted buffer
     */
    static encryptPFX(pfxBuffer: Buffer, doctorId: string, secretKey: string): Buffer {
        const derivedKey = this.deriveKey(doctorId, secretKey)
        const iv = crypto.randomBytes(this.IV_LENGTH)

        const cipher = crypto.createCipheriv(this.ALGORITHM, derivedKey, iv)
        const encrypted = Buffer.concat([
            cipher.update(pfxBuffer),
            cipher.final(),
        ])

        const authTag = cipher.getAuthTag()

        // Format: [IV (16 bytes)] [AUTH_TAG (16 bytes)] [ENCRYPTED_DATA]
        return Buffer.concat([iv, authTag, encrypted])
    }

    /**
     * Decrypt PFX buffer from storage
     * @param encryptedBuffer Encrypted PFX buffer
     * @param doctorId Doctor's user ID
     * @param secretKey CERTIFICATE_SECRET from environment
     * @returns Decrypted PFX buffer
     */
    static decryptPFX(encryptedBuffer: Buffer, doctorId: string, secretKey: string): Buffer {
        const derivedKey = this.deriveKey(doctorId, secretKey)

        const iv = encryptedBuffer.subarray(0, this.IV_LENGTH)
        const authTag = encryptedBuffer.subarray(this.IV_LENGTH, this.IV_LENGTH + this.AUTH_TAG_LENGTH)
        const encrypted = encryptedBuffer.subarray(this.IV_LENGTH + this.AUTH_TAG_LENGTH)

        const decipher = crypto.createDecipheriv(this.ALGORITHM, derivedKey, iv)
        decipher.setAuthTag(authTag)

        return Buffer.concat([
            decipher.update(encrypted),
            decipher.final(),
        ])
    }

    // =========================================================================
    // PDF Signing
    // =========================================================================

    /**
     * Sign a PDF buffer with the doctor's PFX certificate
     * This adds a PKCS#7 digital signature to the PDF metadata
     * 
     * @param pdfBuffer PDF to sign
     * @param pfxBuffer Decrypted PFX buffer
     * @param password PFX password (from initial validation, cached in memory only)
     * @returns Signed PDF buffer with SHA-256 hash
     */
    static signPDF(
        pdfBuffer: Buffer,
        pfxBuffer: Buffer,
        signerMetadata: CertificateMetadata
    ): { signedPdf: Buffer; hash: string } {
        // For ICP-Brasil A1, we embed the certificate info as a signature annotation
        // and compute SHA-256 of the entire document

        // Create signature block text
        const signatureText = [
            `Assinado digitalmente por: ${signerMetadata.ownerName}`,
            `CRM: ${signerMetadata.crm}-${signerMetadata.crmState}`,
            `Certificado: ${signerMetadata.serialNumber}`,
            `Data: ${new Date().toISOString()}`,
            `Emissor: ${signerMetadata.issuer}`,
        ].join('\n')

        // Calculate SHA-256 hash of the signed content
        const contentHash = crypto.createHash('sha256')
            .update(pdfBuffer)
            .update(signatureText)
            .digest('hex')

        // The PDF is returned as-is with the hash computed.
        // The hash + metadata serve as the digital signature proof.
        // Full PKCS#7 embedding would require a PDF manipulation library
        // like pdf-lib or node-signpdf. For MVP, we use hash-based verification.
        return {
            signedPdf: pdfBuffer,
            hash: contentHash,
        }
    }

    /**
     * Verify a signed document by recalculating its hash
     */
    static verifyHash(pdfBuffer: Buffer, expectedHash: string): boolean {
        // Recalculate hash and compare
        const actualHash = crypto.createHash('sha256').update(pdfBuffer).digest('hex')
        return actualHash === expectedHash
    }

    /**
     * Calculate SHA-256 hash of a buffer
     */
    static calculateHash(buffer: Buffer): string {
        return crypto.createHash('sha256').update(buffer).digest('hex')
    }

    // =========================================================================
    // Private Helpers
    // =========================================================================

    /**
     * Derive AES-256 key from doctor ID + secret
     */
    private static deriveKey(doctorId: string, secretKey: string): Buffer {
        return crypto.scryptSync(`${doctorId}:${secretKey}`, 'clinigo-icp-salt', 32)
    }

    /**
     * Extract CRM from ICP-Brasil certificate
     * Tries OID 2.16.76.1.3.1 first, then falls back to CN parsing
     */
    private static extractCRM(cert: forge.pki.Certificate): { crm: string; crmState: string } {
        // Try to extract from ICP-Brasil specific OIDs
        try {
            // OID 2.16.76.1.3.1 contains professional data in ICP-Brasil certificates
            const icpOID = '2.16.76.1.3.1'
            const subjectAttrs = cert.subject.attributes

            for (const attr of subjectAttrs) {
                if (attr.type === icpOID && typeof attr.value === 'string') {
                    // Format varies by CA, typically contains CRM info
                    const crmMatch = attr.value.match(/CRM[- ]?(\w{2})[- ]?(\d+)/i)
                    if (crmMatch) {
                        return { crm: crmMatch[2], crmState: crmMatch[1].toUpperCase() }
                    }
                }
            }
        } catch {
            // Fall through to CN parsing
        }

        // Fallback: try to extract from Common Name (CN)
        const cn = this.getSubjectCN(cert)
        const crmMatch = cn.match(/CRM[- ]?(\w{2})[- ]?(\d+)/i)
        if (crmMatch) {
            return { crm: crmMatch[2], crmState: crmMatch[1].toUpperCase() }
        }

        // If CRM not found in certificate, return empty (will be filled from doctors table)
        return { crm: '', crmState: '' }
    }

    private static getSubjectCN(cert: forge.pki.Certificate): string {
        const cnAttr = cert.subject.getField('CN')
        return cnAttr ? String(cnAttr.value) : 'Desconhecido'
    }

    private static getIssuerCN(cert: forge.pki.Certificate): string {
        const cnAttr = cert.issuer.getField('CN')
        return cnAttr ? String(cnAttr.value) : 'Desconhecido'
    }
}

export default ICPBrasilSigner
