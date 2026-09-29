/**
 * @jest-environment node
 */
import * as fs from 'fs';
import * as path from 'path';
import { TissXsdAdapter } from '@/lib/services/tiss/tiss-xsd-adapter';

describe('TissXsdAdapter: Adaptador Real de Validação XSD / Fallback Fechado', () => {
    const fixtureDir = path.join(__dirname, '..', '__fixtures__', 'xsd-real-wasm-env');
    const emptyDir = path.join(__dirname, '..', '__fixtures__', 'xsd-empty-env');

    // Schema completo com extension, restriction com pattern, choice e maxOccurs
    const richSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
    <xs:complexType name="basePerson">
        <xs:sequence>
            <xs:element name="nome" type="xs:string"/>
        </xs:sequence>
    </xs:complexType>

    <xs:complexType name="extendedPerson">
        <xs:complexContent>
            <xs:extension base="basePerson">
                <xs:sequence>
                    <xs:element name="cpf">
                        <xs:simpleType>
                            <xs:restriction base="xs:string">
                                <xs:pattern value="[0-9]{11}"/>
                            </xs:restriction>
                        </xs:simpleType>
                    </xs:element>
                </xs:sequence>
            </xs:extension>
        </xs:complexContent>
    </xs:complexType>

    <xs:element name="mensagemLote">
        <xs:complexType>
            <xs:sequence>
                <xs:element name="beneficiario" type="extendedPerson"/>
                <xs:choice>
                    <xs:element name="guiaConsulta" type="xs:string"/>
                    <xs:element name="guiaSadt" type="xs:string"/>
                </xs:choice>
                <xs:element name="procedimento" type="xs:string" maxOccurs="2"/>
            </xs:sequence>
        </xs:complexType>
    </xs:element>
</xs:schema>`;

    // Schema com construção não suportada/insegura (URL externa via HTTP)
    const unsupportedSchema = `<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
    <xs:import namespace="http://externo.com/ans" schemaLocation="https://external-ans-domain.org/schema.xsd"/>
    <xs:element name="mensagemLote" type="xs:string"/>
</xs:schema>`;

    const xmlValid = `<?xml version="1.0" encoding="UTF-8"?>
<mensagemLote>
    <beneficiario>
        <nome>Carlos da Silva</nome>
        <cpf>12345678901</cpf>
    </beneficiario>
    <guiaConsulta>CONS-001</guiaConsulta>
    <procedimento>10101012</procedimento>
    <procedimento>10101020</procedimento>
</mensagemLote>`;

    const xmlInvalidPattern = `<?xml version="1.0" encoding="UTF-8"?>
<mensagemLote>
    <beneficiario>
        <nome>Carlos da Silva</nome>
        <cpf>123_INVALIDO</cpf>
    </beneficiario>
    <guiaConsulta>CONS-001</guiaConsulta>
    <procedimento>10101012</procedimento>
</mensagemLote>`;

    const xmlInvalidChoice = `<?xml version="1.0" encoding="UTF-8"?>
<mensagemLote>
    <beneficiario>
        <nome>Carlos da Silva</nome>
        <cpf>12345678901</cpf>
    </beneficiario>
    <guiaInexistente>INVALIDA</guiaInexistente>
    <procedimento>10101012</procedimento>
</mensagemLote>`;

    const xmlInvalidMaxOccurs = `<?xml version="1.0" encoding="UTF-8"?>
<mensagemLote>
    <beneficiario>
        <nome>Carlos da Silva</nome>
        <cpf>12345678901</cpf>
    </beneficiario>
    <guiaConsulta>CONS-001</guiaConsulta>
    <procedimento>10101012</procedimento>
    <procedimento>10101020</procedimento>
    <procedimento>10101030</procedimento>
</mensagemLote>`;

    const xmlInvalidOrder = `<?xml version="1.0" encoding="UTF-8"?>
<mensagemLote>
    <beneficiario>
        <nome>Carlos da Silva</nome>
        <cpf>12345678901</cpf>
    </beneficiario>
    <procedimento>10101012</procedimento>
    <guiaConsulta>CONS-001</guiaConsulta>
</mensagemLote>`;

    beforeAll(() => {
        if (!fs.existsSync(fixtureDir)) fs.mkdirSync(fixtureDir, { recursive: true });
        if (!fs.existsSync(emptyDir)) fs.mkdirSync(emptyDir, { recursive: true });
        fs.writeFileSync(path.join(fixtureDir, 'rich-fixture.xsd'), richSchema, 'utf8');
    });

    afterAll(() => {
        try {
            if (fs.existsSync(path.join(fixtureDir, 'rich-fixture.xsd'))) {
                fs.unlinkSync(path.join(fixtureDir, 'rich-fixture.xsd'));
            }
            if (fs.existsSync(path.join(fixtureDir, 'unsupported-fixture.xsd'))) {
                fs.unlinkSync(path.join(fixtureDir, 'unsupported-fixture.xsd'));
            }
            if (fs.existsSync(fixtureDir)) fs.rmdirSync(fixtureDir);
            if (fs.existsSync(emptyDir)) fs.rmdirSync(emptyDir);
        } catch {
            // ignore
        }
    });

    it('1. Valida com sucesso XML conforme contra XSD com extension, pattern, choice e maxOccurs (XSD_PARCIAL)', async () => {
        const adapter = new TissXsdAdapter(fixtureDir);
        const res = await adapter.validate(xmlValid);

        expect(res.validation_mode).toBe('XSD_PARCIAL');
        expect(res.valid).toBe(true);
        expect(res.errors.length).toBe(0);
        expect(res.disclaimer).toContain('não homologado ANS');
    });

    it('2. Rejeita XML com pattern regex inválido (cpf não aceito)', async () => {
        const adapter = new TissXsdAdapter(fixtureDir);
        const res = await adapter.validate(xmlInvalidPattern);

        expect(res.validation_mode).toBe('XSD_PARCIAL');
        expect(res.valid).toBe(false);
        expect(res.errors.length).toBeGreaterThan(0);
        expect(res.errors.some((e) => e.message.includes('cpf') || e.message.includes('pattern'))).toBe(true);
    });

    it('3. Rejeita XML com choice inválido (elemento esperado não atende à escolha)', async () => {
        const adapter = new TissXsdAdapter(fixtureDir);
        const res = await adapter.validate(xmlInvalidChoice);

        expect(res.validation_mode).toBe('XSD_PARCIAL');
        expect(res.valid).toBe(false);
        expect(res.errors.length).toBeGreaterThan(0);
    });

    it('4. Rejeita XML que excede maxOccurs', async () => {
        const adapter = new TissXsdAdapter(fixtureDir);
        const res = await adapter.validate(xmlInvalidMaxOccurs);

        expect(res.validation_mode).toBe('XSD_PARCIAL');
        expect(res.valid).toBe(false);
        expect(res.errors.length).toBeGreaterThan(0);
    });

    it('5. Rejeita XML com elementos fora de ordem na sequence', async () => {
        const adapter = new TissXsdAdapter(fixtureDir);
        const res = await adapter.validate(xmlInvalidOrder);

        expect(res.validation_mode).toBe('XSD_PARCIAL');
        expect(res.valid).toBe(false);
        expect(res.errors.length).toBeGreaterThan(0);
    });

    it('6. Falha fechado (XSD_NAO_SUPORTADO) quando schema possui construção externa ou insegura, NUNCA aprovando', async () => {
        const unsupportedDir = path.join(__dirname, '..', '__fixtures__', 'xsd-unsupported-env');
        if (!fs.existsSync(unsupportedDir)) fs.mkdirSync(unsupportedDir, { recursive: true });
        fs.writeFileSync(path.join(unsupportedDir, 'unsupported.xsd'), unsupportedSchema, 'utf8');

        try {
            const adapter = new TissXsdAdapter(unsupportedDir);
            const res = await adapter.validate(xmlValid);

            expect(res.validation_mode).toBe('XSD_NAO_SUPORTADO');
            expect(res.valid).toBe(false);
            expect(res.unsupportedConstructs).toBeDefined();
            expect(res.unsupportedConstructs?.length).toBeGreaterThan(0);
        } finally {
            try {
                if (fs.existsSync(path.join(unsupportedDir, 'unsupported.xsd'))) {
                    fs.unlinkSync(path.join(unsupportedDir, 'unsupported.xsd'));
                }
                if (fs.existsSync(unsupportedDir)) fs.rmdirSync(unsupportedDir);
            } catch {
                // ignore
            }
        }
    });

    it('7. Opera em fallback ESTRUTURAL com disclaimer obrigatório quando nenhum .xsd está presente', async () => {
        const adapter = new TissXsdAdapter(emptyDir);
        const res = await adapter.validate(xmlValid);

        expect(res.validation_mode).toBe('ESTRUTURAL');
        expect(res.disclaimer).toContain('Validação estrutural simplificada');
    });
});
