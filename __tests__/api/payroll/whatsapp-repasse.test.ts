import { describe, it, expect } from '@jest/globals';
import {
  generatePhoneVariations,
  isRepasseExtractCommand,
  formatRepasseWhatsAppMessage,
  formatUnauthorizedRepasseMessage,
  DoctorExtractData,
} from '@/lib/services/whatsapp-repasse';

describe('Extrato de Repasse via WhatsApp (Prioridade 1)', () => {
  describe('generatePhoneVariations (Normalização de Telefones Brasileiros)', () => {
    it('deve gerar variações com e sem 55 e com/sem o 9º dígito', () => {
      const variations = generatePhoneVariations('5521998765432');
      expect(variations).toContain('5521998765432');
      expect(variations).toContain('21998765432');
      expect(variations).toContain('2198765432');
      expect(variations).toContain('552198765432');
    });

    it('deve tratar números com formatação de caracteres especiais', () => {
      const variations = generatePhoneVariations('+55 (21) 99876-5432');
      expect(variations).toContain('5521998765432');
      expect(variations).toContain('21998765432');
    });

    it('deve lidar com números de 10 dígitos (DDD + 8 dígitos)', () => {
      const variations = generatePhoneVariations('2188765432');
      expect(variations).toContain('2188765432');
      expect(variations).toContain('552188765432');
      expect(variations).toContain('21988765432');
      expect(variations).toContain('5521988765432');
    });

    it('retorna array vazio para entrada vazia ou inválida', () => {
      expect(generatePhoneVariations('')).toEqual([]);
      expect(generatePhoneVariations('abc')).toEqual([]);
    });
  });

  describe('isRepasseExtractCommand (Gatilhos de Comando)', () => {
    it('deve reconhecer comandos exatos e com acentos/espaços', () => {
      expect(isRepasseExtractCommand('extrato')).toBe(true);
      expect(isRepasseExtractCommand('Extrato')).toBe(true);
      expect(isRepasseExtractCommand('EXTRATO DE REPASSE')).toBe(true);
      expect(isRepasseExtractCommand('repasse')).toBe(true);
      expect(isRepasseExtractCommand('meu repasse')).toBe(true);
      expect(isRepasseExtractCommand('quanto já ganhei')).toBe(true);
      expect(isRepasseExtractCommand('quanto ja ganhei')).toBe(true);
      expect(isRepasseExtractCommand('meus ganhos')).toBe(true);
      expect(isRepasseExtractCommand('saldo')).toBe(true);
      expect(isRepasseExtractCommand('minha comissao')).toBe(true);
      expect(isRepasseExtractCommand('comissão')).toBe(true);
    });

    it('deve rejeitar mensagens comuns não relacionadas a extrato financeiro', () => {
      expect(isRepasseExtractCommand('Olá, bom dia!')).toBe(false);
      expect(isRepasseExtractCommand('Quero marcar uma consulta')).toBe(false);
      expect(isRepasseExtractCommand('Onde fica a clínica?')).toBe(false);
      expect(isRepasseExtractCommand('Ok, obrigado')).toBe(false);
    });
  });

  describe('formatRepasseWhatsAppMessage (Formatação da Mensagem)', () => {
    it('deve gerar texto com resumo de atendimentos, faturamento e valor a receber', () => {
      const mockData: DoctorExtractData = {
        doctor_id: 'doc-123',
        doctor_name: 'Ana Souza',
        specialty: 'Psicologia',
        clinic_id: 'clinic-456',
        clinic_name: 'Espaço Incluir',
        reference_month: '2026-09',
        period_label: 'Setembro de 2026',
        completed_count: 25,
        gross_revenue: 5000,
        net_repasse: 3500,
        private_count: 15,
        private_gross: 3000,
        private_repasse: 2100,
        insurance_count: 10,
        insurance_gross: 2000,
        insurance_repasse: 1400,
        rule_description: '70% Particular / 70% Convênio',
        future_scheduled_count: 8,
        projected_additional_repasse: 1120,
        total_projected_repasse: 4620,
      };

      const message = formatRepasseWhatsAppMessage(mockData);

      expect(message).toContain('EXTRATO DE REPASSE — ESPAÇO INCLUIR');
      expect(message).toContain('Dr(a). Ana Souza');
      expect(message).toContain('Setembro de 2026');
      expect(message).toContain('25 consulta(s)');
      expect(message).toContain('R$ 5.000,00');
      expect(message).toContain('R$ 3.500,00');
      expect(message).toContain('70% Particular / 70% Convênio');
      expect(message).toContain('8 consulta(s)');
      expect(message).toContain('R$ 4.620,00');
    });
  });

  describe('formatUnauthorizedRepasseMessage (Mensagem de Segurança)', () => {
    it('deve gerar alerta de segurança e instrução para atualizar telefone', () => {
      const msg = formatUnauthorizedRepasseMessage();
      expect(msg).toContain('CLINIGO — AUTENTICAÇÃO DE REPASSE');
      expect(msg).toContain('Acesso Não Autorizado');
      expect(msg).toContain('LGPD e sigilo financeiro');
    });
  });
});
