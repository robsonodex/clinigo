import { calculateTissHash } from '@/lib/services/tiss/tiss-hash-calculator';
import { TISSXSDValidator } from '@/lib/services/tiss/tiss-xsd-validator';

describe('T2: Teste Comparativo de Hash do Lote TISS e Validação de Estrutura', () => {
  const sampleBatchData = {
    batchNumber: 'LOTE-20260901',
    insuranceAnsCode: '359017',
    provider: {
      cnesCode: '1234567',
      name: 'Clinica Medica Exemplo LTDA',
      taxId: '12345678000199',
      type: 'PJ',
    },
    guides: [
      {
        guideNumber: 'G-001',
        guideType: 'CONSULTA',
        beneficiary: {
          cardNumber: '01234567890123456789',
          name: 'Paciente Teste Um',
        },
        procedure: {
          code: '10101012',
          description: 'Consulta em consultorio',
          value: 120.0,
        },
      },
      {
        guideType: 'SP_SADT',
        guideNumber: 'G-002',
        beneficiary: {
          cardNumber: '01234567890123456789',
          name: 'Paciente Teste Dois',
        },
        procedure: {
          code: '50000560',
          description: 'Sessao individual de psicologia',
          value: 85.0,
        },
      },
    ],
  };

  const sampleXML = `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas">
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>1001</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>2026-09-29</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>09:30:00</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:codigoPrestadorNaOperadora>1234567</ans:codigoPrestadorNaOperadora>
        <ans:CNPJ>12345678000199</ans:CNPJ>
      </ans:identificacaoPrestador>
    </ans:origem>
    <ans:destino>
      <ans:registroANS>359017</ans:registroANS>
    </ans:destino>
    <ans:Padrao>4.01.00</ans:Padrao>
  </ans:cabecalho>
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>LOTE-20260901</ans:numeroLote>
      <ans:guiasTISS>
        <ans:guiaConsulta>
          <ans:cabecalhoGuia>
            <ans:registroANS>359017</ans:registroANS>
            <ans:numeroGuiaPrestador>G-001</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          <ans:dadosBeneficiario>
            <ans:numeroCarteira>01234567890123456789</ans:numeroCarteira>
            <ans:nomeBeneficiario>Paciente Teste Um</ans:nomeBeneficiario>
          </ans:dadosBeneficiario>
          <ans:dadosProcedimento>
            <ans:procedimento>
              <ans:codigoProcedimento>10101012</ans:codigoProcedimento>
              <ans:descricaoProcedimento>Consulta em consultorio</ans:descricaoProcedimento>
            </ans:procedimento>
            <ans:valorProcedimento>120.00</ans:valorProcedimento>
          </ans:dadosProcedimento>
        </ans:guiaConsulta>
      </ans:guiasTISS>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
</ans:mensagemTISS>`;

  it('deve usar LEGACY_SHA256_JSON como padrão quando nenhum algoritmo for informado', () => {
    const hashDefault = calculateTissHash(sampleBatchData);
    expect(hashDefault).toHaveLength(64); // SHA-256
    const hashExplicitLegacy = calculateTissHash(sampleBatchData, 'LEGACY_SHA256_JSON');
    expect(hashDefault).toBe(hashExplicitLegacy);
  });

  it('deve gerar vetor de teste determinístico para algoritmo LEGACY_SHA256_JSON', () => {
    const hashLegacy = calculateTissHash(sampleBatchData, 'LEGACY_SHA256_JSON');
    expect(hashLegacy).toHaveLength(64); // SHA-256 produz 64 caracteres hex
    expect(/^[a-f0-9]{64}$/.test(hashLegacy)).toBe(true);

    // O mesmo dado gera exatamente o mesmo hash
    const hashLegacy2 = calculateTissHash(sampleBatchData, 'LEGACY_SHA256_JSON');
    expect(hashLegacy).toBe(hashLegacy2);
  });

  it('deve gerar vetor de teste determinístico para algoritmo ANS_MD5_CANONICAL', () => {
    const hashANS = calculateTissHash(sampleXML, 'ANS_MD5_CANONICAL');
    expect(hashANS).toHaveLength(32); // MD5 produz 32 caracteres hex minúsculos
    expect(/^[a-f0-9]{32}$/.test(hashANS)).toBe(true);

    // O mesmo XML gera exatamente o mesmo hash
    const hashANS2 = calculateTissHash(sampleXML, 'ANS_MD5_CANONICAL');
    expect(hashANS).toBe(hashANS2);
  });

  it('os algoritmos devem diferir em tamanho e formato (SHA-256 64 chars vs MD5 32 chars)', () => {
    const hashLegacy = calculateTissHash(sampleXML, 'LEGACY_SHA256_JSON');
    const hashANS = calculateTissHash(sampleXML, 'ANS_MD5_CANONICAL');

    expect(hashLegacy.length).toBe(64);
    expect(hashANS.length).toBe(32);
    expect(hashLegacy).not.toBe(hashANS);
  });

  it('validação da estrutura XML contra TISSXSDValidator para Guia de Consulta', async () => {
    const validator = new TISSXSDValidator();
    const result = await validator.validateXML(sampleXML, '4.01.00');

    expect(result).toBeDefined();
    expect(result.schemaVersion).toBe('4.01.00');
    // Verifica que elementos obrigatórios estão presentes
    const errorCodes = result.errors.map((e) => e.code);
    expect(errorCodes).not.toContain('REQUIRED_FIELD_MISSING');
  });
});
