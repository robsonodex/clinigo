// lib/services/tiss/tiss-parser.test.ts
/**
 * Testes unitários para TissRealParser
 * Roda: npm test tiss-parser.test.ts
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { TissRealParser } from './tiss-real-parser';
import { prepareXMLBuffer } from './encoding-utils';

describe('TissRealParser', () => {
    let parser: TissRealParser;

    beforeEach(() => {
        parser = new TissRealParser();
    });

    describe('Parse XML Completo (Unimed Exemplo)', () => {
        it('deve parsear XML real com 4 guias e diferentes status', async () => {
            // Carregar XML de exemplo
            const xmlPath = join(__dirname, 'examples', 'retorno-unimed-exemplo.xml');
            const buffer = readFileSync(xmlPath);

            // Parse
            const result = await parser.parseBuffer(buffer);

            // Assertions
            expect(result.success).toBe(true);
            expect(result.data).toBeDefined();
            expect(result.errors.length).toBe(0); // SEM ERROS

            // Verificar header
            const data = result.data!;
            expect(data.versao_tiss).toBe('4.02.00');
            expect(data.lote_numero).toBe('202601001');
            expect(data.lote_protocolo).toBe('20260113001');
            expect(data.operadora_nome).toBe('UNIMED SEGUROS SAÚDE S/A');
            expect(data.prestador_codigo).toBe('123456');

            // Verificar quantidade de guias
            expect(data.guias).toHaveLength(4);

            // Verificar estatísticas
            expect(result.metadata.total_guias).toBe(4);
            expect(result.metadata.total_aprovadas).toBe(2); // Guia 1 e 4
            expect(result.metadata.total_negadas).toBe(1); // Guia 3
            expect(result.metadata.total_parciais).toBe(1); // Guia 2
        });

        it('deve extrair corretamente GUIA 1 (APROVADA)', async () => {
            const xmlPath = join(__dirname, 'examples', 'retorno-unimed-exemplo.xml');
            const buffer = readFileSync(xmlPath);
            const result = await parser.parseBuffer(buffer);

            const guia1 = result.data!.guias[0];

            expect(guia1.numero_guia_prestador).toBe('20260100001');
            expect(guia1.numero_guia_operadora).toBe('UN123456789');
            expect(guia1.senha_autorizacao).toBe('AUTH001');
            expect(guia1.status).toBe('APPROVED');
            expect(guia1.valor_apresentado).toBe(250.00);
            expect(guia1.valor_liberado).toBe(250.00);
            expect(guia1.valor_glosa).toBe(0);
            expect(guia1.glosas).toHaveLength(0);
            expect(guia1.nome_beneficiario).toBe('João da Silva');
            expect(guia1.cpf_beneficiario).toBe('12345678901');
        });

        it('deve extrair corretamente GUIA 2 (PARCIAL COM GLOSA)', async () => {
            const xmlPath = join(__dirname, 'examples', 'retorno-unimed-exemplo.xml');
            const buffer = readFileSync(xmlPath);
            const result = await parser.parseBuffer(buffer);

            const guia2 = result.data!.guias[1];

            expect(guia2.numero_guia_prestador).toBe('20260100002');
            expect(guia2.status).toBe('PARTIAL');
            expect(guia2.valor_apresentado).toBe(450.00);
            expect(guia2.valor_liberado).toBe(370.00);
            expect(guia2.valor_glosa).toBe(80.00);

            // Verificar glosa
            expect(guia2.glosas).toHaveLength(1);
            expect(guia2.glosas[0].codigo_glosa).toBe('01');
            expect(guia2.glosas[0].descricao_glosa).toBe('Procedimento não previsto no contrato');
            expect(guia2.glosas[0].valor_glosa).toBe(80.00);
        });

        it('deve extrair corretamente GUIA 3 (NEGADA)', async () => {
            const xmlPath = join(__dirname, 'examples', 'retorno-unimed-exemplo.xml');
            const buffer = readFileSync(xmlPath);
            const result = await parser.parseBuffer(buffer);

            const guia3 = result.data!.guias[2];

            expect(guia3.numero_guia_prestador).toBe('20260100003');
            expect(guia3.status).toBe('DENIED');
            expect(guia3.codigo_status).toBe('2');
            expect(guia3.valor_apresentado).toBe(180.00);
            expect(guia3.valor_liberado).toBe(0);
            expect(guia3.valor_glosa).toBe(180.00);

            // Verificar glosa
            expect(guia3.glosas).toHaveLength(1);
            expect(guia3.glosas[0].codigo_glosa).toBe('03');
            expect(guia3.glosas[0].descricao_glosa).toContain('carência');
        });
    });

    describe('Encoding Detection', () => {
        it('deve detectar e converter ISO-8859-1 para UTF-8', () => {
            // Simular XML com caracteres acentuados em ISO-8859-1
            const text = '<?xml version="1.0" encoding="ISO-8859-1"?><teste>José Médico Atenção</teste>';
            const buffer = Buffer.from(text, 'latin1'); // latin1 = ISO-8859-1

            const { xml, encoding, hasBOM } = prepareXMLBuffer(buffer);

            expect(encoding).toBe('ISO-8859-1');
            expect(hasBOM).toBe(false);
            expect(xml).toContain('José');
            expect(xml).toContain('Médico');
            expect(xml).not.toContain('�'); // NÃO deve ter replacement character
        });

        it('deve detectar UTF-8 com BOM', () => {
            const text = '<?xml version="1.0" encoding="UTF-8"?><teste>Teste</teste>';
            const buffer = Buffer.concat([
                Buffer.from([0xEF, 0xBB, 0xBF]), // BOM UTF-8
                Buffer.from(text, 'utf8')
            ]);

            const { xml, encoding, hasBOM } = prepareXMLBuffer(buffer);

            expect(encoding).toBe('UTF-8');
            expect(hasBOM).toBe(true);
            expect(xml).not.toContain('\ufeff'); // BOM removido
        });
    });

    describe('Resiliência a Erros', () => {
        it('deve processar guias mesmo com algumas inválidas', async () => {
            const xmlComErro = `<?xml version="1.0"?>
        <ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
          <ans:cabecalho>
            <ans:versaoPadrao>4.02.00</ans:versaoPadrao>
          </ans:cabecalho>
          <ans:loteGuias>
            <ans:guia>
              <ans:numeroGuiaPrestador>GUIA001</ans:numeroGuiaPrestador>
              <ans:statusProcessamento>1</ans:statusProcessamento>
              <ans:valorTotalGuia>100.00</ans:valorTotalGuia>
            </ans:guia>
            <ans:guia>
              <!-- GUIA SEM NÚMERO - DEVE SER IGNORADA -->
              <ans:statusProcessamento>1</ans:statusProcessamento>
            </ans:guia>
            <ans:guia>
              <ans:numeroGuiaPrestador>GUIA003</ans:numeroGuiaPrestador>
              <ans:statusProcessamento>2</ans:statusProcessamento>
            </ans:guia>
          </ans:loteGuias>
        </ans:mensagemTISS>`;

            const buffer = Buffer.from(xmlComErro, 'utf8');
            const result = await parser.parseBuffer(buffer);

            // Deve processar 2 guias válidas (GUIA001 e GUIA003)
            expect(result.success).toBe(true);
            expect(result.data!.guias).toHaveLength(2);

            // Deve ter WARNING sobre guia sem número
            const warnings = result.errors.filter(e => e.severity === 'WARNING');
            expect(warnings.length).toBeGreaterThan(0);
            expect(warnings[0].message).toContain('sem número');
        });

        it('deve falhar gracefully se XML for completamente inválido', async () => {
            const buffer = Buffer.from('ISSO NAO E UM XML!!!', 'utf8');
            const result = await parser.parseBuffer(buffer);

            expect(result.success).toBe(false);
            expect(result.data).toBeNull();
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors[0].severity).toBe('ERROR');
        });
    });

    describe('Casos Edge (Operadoras Reais)', () => {
        it('Bradesco: guias sem namespace ans:', async () => {
            const xmlBradesco = `<?xml version="1.0"?>
        <mensagemTISS>
          <cabecalho>
            <versaoPadrao>3.05.00</versaoPadrao>
          </cabecalho>
          <loteGuias>
            <guia>
              <numeroGuiaPrestador>BR001</numeroGuiaPrestador>
              <statusProcessamento>1</statusProcessamento>
              <valorTotalGuia>200.00</valorTotalGuia>
            </guia>
          </loteGuias>
        </mensagemTISS>`;

            const buffer = Buffer.from(xmlBradesco, 'utf8');
            const result = await parser.parseBuffer(buffer);

            expect(result.success).toBe(true);
            expect(result.data!.versao_tiss).toBe('3.05.00');
            expect(result.data!.guias).toHaveLength(1);
            expect(result.data!.guias[0].numero_guia_prestador).toBe('BR001');
        });

        it('SulAmérica: array de glosas com 1 item vira objeto', async () => {
            const xmlSulamerica = `<?xml version="1.0"?>
        <ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
          <ans:cabecalho>
            <ans:versaoPadrao>4.02.00</ans:versaoPadrao>
          </ans:cabecalho>
          <ans:loteGuias>
            <ans:guia>
              <ans:numeroGuiaPrestador>SU001</ans:numeroGuiaPrestador>
              <ans:statusProcessamento>3</ans:statusProcessamento>
              <ans:valorTotalGuia>300.00</ans:valorTotalGuia>
              <ans:valorTotalGlosa>50.00</ans:valorTotalGlosa>
              <!-- SÓ UMA GLOSA - xml parser pode transformar em objeto -->
              <ans:motivoGlosa>
                <ans:codigoGlosa>10</ans:codigoGlosa>
                <ans:descricaoGlosa>Valor excede tabela</ans:descricaoGlosa>
                <ans:valorGlosa>50.00</ans:valorGlosa>
              </ans:motivoGlosa>
            </ans:guia>
          </ans:loteGuias>
        </ans:mensagemTISS>`;

            const buffer = Buffer.from(xmlSulamerica, 'utf8');
            const result = await parser.parseBuffer(buffer);

            expect(result.success).toBe(true);

            const guia = result.data!.guias[0];
            expect(guia.status).toBe('PARTIAL');
            expect(guia.glosas).toHaveLength(1); // Deve ainda ser array
            expect(guia.glosas[0].codigo_glosa).toBe('10');
        });
    });
});
