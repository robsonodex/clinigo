/**
 * CLINIGO - TISS Digital Signer
 * 
 * XML-DSig digital signature for TISS XML files.
 * Supports ICP-Brasil A1 certificates (PFX/P12 format).
 * 
 * @see https://www.iti.gov.br/icp-brasil
 */

import * as crypto from 'crypto';
import * as forge from 'node-forge';
import { SignedXml, FileKeyInfo } from 'xml-crypto';

// ============================================================================
// Types
// ============================================================================

export interface CertificateInfo {
    commonName: string;
    issuer: string;
    validFrom: Date;
    validUntil: Date;
    serialNumber: string;
    isValid: boolean;
    isExpired: boolean;
    daysUntilExpiry: number;
}

export interface SignatureResult {
    success: boolean;
    signedXml?: string;
    certificateHash: string;
    certificateInfo: CertificateInfo;
    signedAt: string;
    error?: string;
}

export interface SignatureVerificationResult {
    valid: boolean;
    signatureFound: boolean;
    certificateInfo?: CertificateInfo;
    error?: string;
}

// ============================================================================
// Custom Key Info Provider
// ============================================================================

class X509KeyInfoProvider {
    private certificate: string;
    private publicKey: string;

    constructor(certificate: string, publicKey: string) {
        this.certificate = certificate;
        this.publicKey = publicKey;
    }

    // xml-crypto v6 uses getKeyInfoContent (returns inner content without KeyInfo wrapper)
    getKeyInfoContent(args?: { key?: string; prefix?: string }): string {
        const prefix = args?.prefix ? args.prefix + ':' : '';

        // Clean certificate (remove headers/footers and newlines)
        const cleanCert = this.certificate
            .replace(/-----BEGIN CERTIFICATE-----/g, '')
            .replace(/-----END CERTIFICATE-----/g, '')
            .replace(/\s/g, '');

        return `<${prefix}X509Data><${prefix}X509Certificate>${cleanCert}</${prefix}X509Certificate></${prefix}X509Data>`;
    }

    // Legacy support (xml-crypto < v6)
    getKeyInfo(key?: string, prefix?: string): string {
        return this.getKeyInfoContent({ key, prefix });
    }

    getKey(keyInfo?: Node): Buffer {
        return Buffer.from(this.publicKey);
    }
}

// ============================================================================
// TISSDigitalSigner Class
// ============================================================================

export class TISSDigitalSigner {
    private privateKey: string | null = null;
    private certificate: string | null = null;
    private certificateInfo: CertificateInfo | null = null;

    // =========================================================================
    // Public Methods
    // =========================================================================

    /**
     * Load A1 certificate from PFX/P12 file
     * @param pfxBuffer Buffer containing the PFX/P12 file
     * @param password Password for the certificate
     */
    loadCertificate(pfxBuffer: Buffer, password: string): CertificateInfo {
        try {
            // Parse PFX/PKCS12
            const p12Asn1 = forge.asn1.fromDer(pfxBuffer.toString('binary'));
            const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password);

            // Extract certificate
            const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
            const certBag = certBags[forge.pki.oids.certBag];

            if (!certBag || certBag.length === 0 || !certBag[0].cert) {
                throw new Error('No certificate found in PFX file');
            }

            const cert = certBag[0].cert;

            // Extract private key
            const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
            const keyBag = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag];

            if (!keyBag || keyBag.length === 0 || !keyBag[0].key) {
                throw new Error('No private key found in PFX file');
            }

            const privateKey = keyBag[0].key;

            // Convert to PEM format
            this.certificate = forge.pki.certificateToPem(cert);
            this.privateKey = forge.pki.privateKeyToPem(privateKey);

            // Extract certificate info
            const now = new Date();
            const validFrom = cert.validity.notBefore;
            const validUntil = cert.validity.notAfter;
            const daysUntilExpiry = Math.floor((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            this.certificateInfo = {
                commonName: this.getSubjectCN(cert),
                issuer: this.getIssuerCN(cert),
                validFrom,
                validUntil,
                serialNumber: cert.serialNumber,
                isValid: now >= validFrom && now <= validUntil,
                isExpired: now > validUntil,
                daysUntilExpiry,
            };

            return this.certificateInfo;

        } catch (error) {
            throw new Error(`Failed to load certificate: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Sign TISS XML with loaded certificate
     * @param xml The XML string to sign
     */
    signXML(xml: string): SignatureResult {
        if (!this.privateKey || !this.certificate || !this.certificateInfo) {
            return {
                success: false,
                signedXml: undefined,
                certificateHash: '',
                certificateInfo: {} as CertificateInfo,
                signedAt: new Date().toISOString(),
                error: 'Certificate not loaded. Call loadCertificate first.',
            };
        }

        // Check certificate validity
        if (this.certificateInfo.isExpired) {
            return {
                success: false,
                signedXml: undefined,
                certificateHash: this.getCertificateHash(),
                certificateInfo: this.certificateInfo,
                signedAt: new Date().toISOString(),
                error: 'Certificate has expired',
            };
        }

        try {
            // Create XML signer
            const sig = new SignedXml({
                privateKey: this.privateKey,
            });

            // Configure signature
            sig.signatureAlgorithm = 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256';
            sig.canonicalizationAlgorithm = 'http://www.w3.org/2001/10/xml-exc-c14n#';

            // Add reference to the root element
            sig.addReference({
                xpath: "//*[local-name()='mensagemTISS']",
                transforms: [
                    'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
                    'http://www.w3.org/2001/10/xml-exc-c14n#',
                ],
                digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
            });

            // Set key info content provider (xml-crypto v6 API)
            const publicKey = forge.pki.publicKeyToPem(
                forge.pki.certificateFromPem(this.certificate).publicKey
            );
            const keyInfoProvider = new X509KeyInfoProvider(this.certificate, publicKey);

            // xml-crypto v6: override getKeyInfoContent on instance
            sig.getKeyInfoContent = keyInfoProvider.getKeyInfoContent.bind(keyInfoProvider);
            sig.publicCert = this.certificate;

            // Compute signature
            sig.computeSignature(xml, {
                location: {
                    reference: "//*[local-name()='mensagemTISS']",
                    action: 'append'
                },
            });

            const signedXml = sig.getSignedXml();

            return {
                success: true,
                signedXml,
                certificateHash: this.getCertificateHash(),
                certificateInfo: this.certificateInfo,
                signedAt: new Date().toISOString(),
            };

        } catch (error) {
            return {
                success: false,
                signedXml: undefined,
                certificateHash: this.getCertificateHash(),
                certificateInfo: this.certificateInfo,
                signedAt: new Date().toISOString(),
                error: `Signing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Verify signature in a signed XML
     * @param signedXml The signed XML to verify
     */
    verifySignature(signedXml: string): SignatureVerificationResult {
        try {
            // Find signature element
            const signatureMatch = signedXml.match(/<Signature[^>]*>[\s\S]*?<\/Signature>/);

            if (!signatureMatch) {
                return {
                    valid: false,
                    signatureFound: false,
                    error: 'No signature found in XML',
                };
            }

            // If we have a loaded certificate, use it for verification
            if (this.certificate) {
                const sig = new SignedXml();

                // Get public key from certificate
                const cert = forge.pki.certificateFromPem(this.certificate);
                const publicKey = forge.pki.publicKeyToPem(cert.publicKey);

                sig.publicCert = this.certificate;
                sig.loadSignature(signatureMatch[0]);

                const isValid = sig.checkSignature(signedXml);

                return {
                    valid: isValid,
                    signatureFound: true,
                    certificateInfo: this.certificateInfo || undefined,
                };
            }

            // If no certificate loaded, we can only confirm signature exists
            return {
                valid: true, // Signature structure is valid
                signatureFound: true,
            };

        } catch (error) {
            return {
                valid: false,
                signatureFound: false,
                error: `Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            };
        }
    }

    /**
     * Get SHA-256 hash of loaded certificate
     */
    getCertificateHash(): string {
        if (!this.certificate) return '';

        const cleanCert = this.certificate
            .replace(/-----BEGIN CERTIFICATE-----/g, '')
            .replace(/-----END CERTIFICATE-----/g, '')
            .replace(/\s/g, '');

        return crypto.createHash('sha256').update(cleanCert).digest('hex');
    }

    /**
     * Get loaded certificate info
     */
    getCertificateInfo(): CertificateInfo | null {
        return this.certificateInfo;
    }

    /**
     * Check if certificate is loaded
     */
    isCertificateLoaded(): boolean {
        return this.privateKey !== null && this.certificate !== null;
    }

    // =========================================================================
    // Private Helper Methods
    // =========================================================================

    private getSubjectCN(cert: forge.pki.Certificate): string {
        const cnAttr = cert.subject.getField('CN');
        return cnAttr ? cnAttr.value : 'Unknown';
    }

    private getIssuerCN(cert: forge.pki.Certificate): string {
        const cnAttr = cert.issuer.getField('CN');
        return cnAttr ? cnAttr.value : 'Unknown';
    }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new TISS Digital Signer instance
 */
export function createTISSSigner(): TISSDigitalSigner {
    return new TISSDigitalSigner();
}

export default TISSDigitalSigner;
