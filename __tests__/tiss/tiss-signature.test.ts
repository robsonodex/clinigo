/**
 * TISS Digital Signature Tests
 * Tests for XML-DSig signing with ICP-Brasil A1 certificates
 */

import * as crypto from 'crypto';
import * as forge from 'node-forge';
import { TISSDigitalSigner, createTISSSigner } from '@/lib/services/tiss/tiss-digital-signer';

// Generate a self-signed test certificate
function generateTestCertificate(daysValid: number = 365): { pfx: Buffer; password: string } {
    const password = 'test123';

    // Generate key pair
    const keys = forge.pki.rsa.generateKeyPair(2048);

    // Create certificate
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '01';
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date();
    cert.validity.notAfter.setDate(cert.validity.notBefore.getDate() + daysValid);

    const attrs = [
        { name: 'commonName', value: 'CLINIGO TEST CERTIFICATE' },
        { name: 'countryName', value: 'BR' },
        { name: 'stateOrProvinceName', value: 'SP' },
        { name: 'localityName', value: 'Sao Paulo' },
        { name: 'organizationName', value: 'CliniGo Teste LTDA' },
    ];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);

    // Self-sign
    cert.sign(keys.privateKey, forge.md.sha256.create());

    // Create PKCS12 (PFX)
    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(
        keys.privateKey,
        [cert],
        password,
        { algorithm: '3des' }
    );

    const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
    const pfxBuffer = Buffer.from(p12Der, 'binary');

    return { pfx: pfxBuffer, password };
}

// Generate an expired test certificate
function generateExpiredCertificate(): { pfx: Buffer; password: string } {
    const password = 'expired123';

    const keys = forge.pki.rsa.generateKeyPair(2048);
    const cert = forge.pki.createCertificate();
    cert.publicKey = keys.publicKey;
    cert.serialNumber = '02';

    // Set dates in the past
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 2);
    cert.validity.notBefore = pastDate;

    const expiredDate = new Date();
    expiredDate.setFullYear(expiredDate.getFullYear() - 1);
    cert.validity.notAfter = expiredDate;

    const attrs = [
        { name: 'commonName', value: 'EXPIRED TEST CERTIFICATE' },
        { name: 'countryName', value: 'BR' },
    ];

    cert.setSubject(attrs);
    cert.setIssuer(attrs);
    cert.sign(keys.privateKey, forge.md.sha256.create());

    const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, { algorithm: '3des' });
    const p12Der = forge.asn1.toDer(p12Asn1).getBytes();

    return { pfx: Buffer.from(p12Der, 'binary'), password };
}

// Sample TISS XML for signing
const SAMPLE_TISS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <ans:cabecalho>
        <ans:identificacaoTransacao>
            <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
            <ans:sequencialTransacao>LOTE-001-TEST</ans:sequencialTransacao>
            <ans:dataRegistroTransacao>2026-01-30</ans:dataRegistroTransacao>
            <ans:horaRegistroTransacao>10:30:00</ans:horaRegistroTransacao>
        </ans:identificacaoTransacao>
        <ans:origem>
            <ans:identificacaoPrestador>
                <ans:codigoPrestadorNaOperadora>123456</ans:codigoPrestadorNaOperadora>
            </ans:identificacaoPrestador>
        </ans:origem>
        <ans:destino>
            <ans:registroANS>123456</ans:registroANS>
        </ans:destino>
        <ans:Padrao>4.01.00</ans:Padrao>
    </ans:cabecalho>
    <ans:prestadorParaOperadora>
        <ans:loteGuias>
            <ans:numeroLote>001</ans:numeroLote>
        </ans:loteGuias>
    </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

describe('TISS Digital Signature', () => {
    let validCert: { pfx: Buffer; password: string };
    let expiredCert: { pfx: Buffer; password: string };

    beforeAll(() => {
        // Generate test certificates (this may take a moment)
        validCert = generateTestCertificate(365);
        expiredCert = generateExpiredCertificate();
    });

    describe('Certificate Loading', () => {
        it('should load valid A1 certificate from PFX', () => {
            const signer = createTISSSigner();
            const certInfo = signer.loadCertificate(validCert.pfx, validCert.password);

            expect(certInfo.commonName).toBe('CLINIGO TEST CERTIFICATE');
            expect(certInfo.isValid).toBe(true);
            expect(certInfo.isExpired).toBe(false);
            expect(certInfo.daysUntilExpiry).toBeGreaterThan(0);
        });

        it('should reject invalid password', () => {
            const signer = createTISSSigner();

            expect(() => {
                signer.loadCertificate(validCert.pfx, 'wrongpassword');
            }).toThrow();
        });

        it('should reject corrupt PFX data', () => {
            const signer = createTISSSigner();
            const corruptData = Buffer.from('not a valid pfx file');

            expect(() => {
                signer.loadCertificate(corruptData, 'anypassword');
            }).toThrow();
        });

        it('should detect expired certificate', () => {
            const signer = createTISSSigner();
            const certInfo = signer.loadCertificate(expiredCert.pfx, expiredCert.password);

            expect(certInfo.isExpired).toBe(true);
            expect(certInfo.isValid).toBe(false);
            expect(certInfo.daysUntilExpiry).toBeLessThan(0);
        });
    });

    describe('XML Signing', () => {
        it('should sign XML with valid certificate', () => {
            const signer = createTISSSigner();
            signer.loadCertificate(validCert.pfx, validCert.password);

            const result = signer.signXML(SAMPLE_TISS_XML);

            expect(result.success).toBe(true);
            expect(result.signedXml).toBeDefined();
            expect(result.signedXml).toContain('<Signature');
            expect(result.signedXml).toContain('</Signature>');
            expect(result.certificateHash).toBeTruthy();
        });

        it('should embed signature inside mensagemTISS', () => {
            const signer = createTISSSigner();
            signer.loadCertificate(validCert.pfx, validCert.password);

            const result = signer.signXML(SAMPLE_TISS_XML);

            // Signature should be before closing tag of mensagemTISS
            const signedXml = result.signedXml!;
            const signatureIndex = signedXml.indexOf('<Signature');
            const closingIndex = signedXml.lastIndexOf('</ans:mensagemTISS>');

            expect(signatureIndex).toBeGreaterThan(-1);
            expect(signatureIndex).toBeLessThan(closingIndex);
        });

        it('should include X509Certificate in KeyInfo', () => {
            const signer = createTISSSigner();
            signer.loadCertificate(validCert.pfx, validCert.password);

            const result = signer.signXML(SAMPLE_TISS_XML);

            expect(result.signedXml).toContain('X509Data');
            expect(result.signedXml).toContain('X509Certificate');
        });

        it('should reject signing with expired certificate', () => {
            const signer = createTISSSigner();
            signer.loadCertificate(expiredCert.pfx, expiredCert.password);

            const result = signer.signXML(SAMPLE_TISS_XML);

            expect(result.success).toBe(false);
            expect(result.error).toContain('expired');
        });

        it('should fail if certificate not loaded', () => {
            const signer = createTISSSigner();
            // Don't load certificate

            const result = signer.signXML(SAMPLE_TISS_XML);

            expect(result.success).toBe(false);
            expect(result.error).toContain('not loaded');
        });
    });

    describe('Signature Verification', () => {
        it('should verify signature structure', () => {
            const signer = createTISSSigner();
            signer.loadCertificate(validCert.pfx, validCert.password);

            const signResult = signer.signXML(SAMPLE_TISS_XML);
            expect(signResult.success).toBe(true);

            const verifyResult = signer.verifySignature(signResult.signedXml!);

            expect(verifyResult.signatureFound).toBe(true);
        });

        it('should detect missing signature', () => {
            const signer = createTISSSigner();

            const verifyResult = signer.verifySignature(SAMPLE_TISS_XML);

            expect(verifyResult.signatureFound).toBe(false);
        });
    });

    describe('Certificate Hash', () => {
        it('should generate consistent SHA-256 hash', () => {
            const signer = createTISSSigner();
            signer.loadCertificate(validCert.pfx, validCert.password);

            const hash1 = signer.getCertificateHash();
            const hash2 = signer.getCertificateHash();

            expect(hash1).toBe(hash2);
            expect(hash1.length).toBe(64); // SHA-256 hex = 64 chars
        });

        it('should return empty hash if no certificate loaded', () => {
            const signer = createTISSSigner();

            const hash = signer.getCertificateHash();

            expect(hash).toBe('');
        });
    });

    describe('Certificate Info', () => {
        it('should expose certificate info after loading', () => {
            const signer = createTISSSigner();
            signer.loadCertificate(validCert.pfx, validCert.password);

            const info = signer.getCertificateInfo();

            expect(info).not.toBeNull();
            expect(info!.commonName).toBe('CLINIGO TEST CERTIFICATE');
            expect(info!.validFrom).toBeInstanceOf(Date);
            expect(info!.validUntil).toBeInstanceOf(Date);
        });

        it('should return null if no certificate loaded', () => {
            const signer = createTISSSigner();

            const info = signer.getCertificateInfo();

            expect(info).toBeNull();
        });
    });

    describe('Factory Function', () => {
        it('should create new signer instance', () => {
            const signer1 = createTISSSigner();
            const signer2 = createTISSSigner();

            expect(signer1).not.toBe(signer2);
            expect(signer1.isCertificateLoaded()).toBe(false);
        });
    });
});
