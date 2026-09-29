/**
 * Testes Unitários de Regras de Negócio: Tipos de Guia e Terapias (T7)
 * Valida roteamento entre Guia de Consulta e Guia de SP/SADT,
 * saldo de sessões de autorização, checklist anti-glosa e bloqueio de duplicidade.
 */

describe('T7: Validação de Tipos de Guia, Terapias Multidisciplinares e Regras Anti-Glosa', () => {

    function resolveGuideType(tussCode: string, explicitType?: 'CONSULTATION' | 'SPSADT'): 'CONSULTATION' | 'SPSADT' {
        if (tussCode.startsWith('2') || tussCode.startsWith('3') || tussCode.startsWith('4') || tussCode.startsWith('5')) {
            return 'SPSADT';
        }
        if (tussCode.startsWith('10101')) {
            return 'CONSULTATION';
        }
        return explicitType || 'CONSULTATION';
    }

    interface PreCheckParams {
        cardNumber?: string;
        cardValidity?: string;
        appointmentDate: string;
        hasPriceTable: boolean;
        requiresAuth: boolean;
        authNumber?: string;
        authSessionsAuthorized?: number;
        authSessionsUsed?: number;
        doctorCbo?: string;
        doctorCouncil?: string;
        alreadyHasGuide: boolean;
    }

    function evaluateGuidePreCheck(params: PreCheckParams) {
        if (params.alreadyHasGuide) {
            return {
                canProceed: false,
                status: 409,
                code: 'GUIDE_ALREADY_EXISTS',
                error: 'Já existe uma guia TISS emitida para este atendimento. Operação cancelada para evitar duplicidade.'
            };
        }

        const warnings: string[] = [];

        // 1. Carteirinha
        if (!params.cardNumber || !params.cardNumber.trim()) {
            warnings.push('Número da carteirinha do beneficiário não está preenchido no cadastro do paciente.');
        }

        if (params.cardValidity) {
            const cardDate = new Date(params.cardValidity);
            const apptDate = new Date(params.appointmentDate);
            if (cardDate < apptDate) {
                warnings.push(`Carteirinha estava VENCIDA na data do atendimento. Risco de glosa por motivo 1001/1002.`);
            }
        }

        // 2. Preço
        if (!params.hasPriceTable) {
            warnings.push('Procedimento TUSS não possui preço cadastrado na tabela do convênio. Valor atribuído R$ 0,00.');
        }

        // 3. Profissional CBO e Conselho
        if (!params.doctorCbo) {
            warnings.push('Profissional executante não possui Código Brasileiro de Ocupações (CBO) cadastrado. Risco crítico de glosa na ANS.');
        }
        if (!params.doctorCouncil) {
            warnings.push('Profissional executante não possui registro de conselho de classe (CRM/CRP/CREFITO/CRFa) cadastrado.');
        }

        // 4. Autorização e Saldo
        if (params.requiresAuth && !params.authNumber) {
            warnings.push('Este procedimento exige autorização prévia da operadora e nenhuma senha/código foi informada.');
        }

        if (params.authNumber && params.authSessionsAuthorized != null && params.authSessionsUsed != null) {
            const remaining = params.authSessionsAuthorized - params.authSessionsUsed;
            if (remaining <= 0) {
                warnings.push(`Autorização ${params.authNumber} com saldo de sessões esgotado (${params.authSessionsUsed}/${params.authSessionsAuthorized} utilizadas). Risco crítico de glosa.`);
            } else if (remaining === 1) {
                warnings.push(`Aviso de saldo: Última sessão restante na autorização ${params.authNumber} (1 de ${params.authSessionsAuthorized}).`);
            }
        }

        const isHardBlocked = !params.cardNumber || (params.requiresAuth && !params.authNumber);

        return {
            canProceed: !isHardBlocked,
            status: isHardBlocked ? 422 : 200,
            warnings,
            isHardBlocked
        };
    }

    describe('1. Roteamento Inteligente de Tipo de Guia', () => {
        it('deve gerar Guia de Consulta para procedimentos de consulta médica (10101012)', () => {
            const type = resolveGuideType('10101012');
            expect(type).toBe('CONSULTATION');
        });

        it('deve gerar Guia SP/SADT para sessões de psicoterapia (20104049)', () => {
            const type = resolveGuideType('20104049');
            expect(type).toBe('SPSADT');
        });

        it('deve gerar Guia SP/SADT para fonoterapia (20104081) e terapia ocupacional (20104090)', () => {
            expect(resolveGuideType('20104081')).toBe('SPSADT');
            expect(resolveGuideType('20104090')).toBe('SPSADT');
        });

        it('deve gerar Guia SP/SADT para fisioterapia motora (20104103) e exames SADT (40101010)', () => {
            expect(resolveGuideType('20104103')).toBe('SPSADT');
            expect(resolveGuideType('40101010')).toBe('SPSADT');
        });
    });

    describe('2. Validação de Cenários do Ciclo de Emissão e Terapias', () => {
        it('Cenário 1: Consulta médica regular com dados completos deve passar sem avisos', () => {
            const res = evaluateGuidePreCheck({
                cardNumber: '001234567890012',
                cardValidity: '2027-12-31',
                appointmentDate: '2026-09-29',
                hasPriceTable: true,
                requiresAuth: false,
                doctorCbo: '225125',
                doctorCouncil: 'CRM 123456-SP',
                alreadyHasGuide: false,
            });

            expect(res.canProceed).toBe(true);
            expect(res.warnings).toHaveLength(0);
        });

        it('Cenário 2: Sessão de terapia com autorização e saldo saudável (5 de 10 usadas)', () => {
            const res = evaluateGuidePreCheck({
                cardNumber: '001234567890012',
                cardValidity: '2027-12-31',
                appointmentDate: '2026-09-29',
                hasPriceTable: true,
                requiresAuth: true,
                authNumber: 'AUTH-999',
                authSessionsAuthorized: 10,
                authSessionsUsed: 5,
                doctorCbo: '251510', // Psicólogo Clínico
                doctorCouncil: 'CRP 06/99999',
                alreadyHasGuide: false,
            });

            expect(res.canProceed).toBe(true);
            expect(res.warnings).toHaveLength(0);
        });

        it('Cenário 3: Sessão de terapia com última sessão restante (9 de 10 usadas)', () => {
            const res = evaluateGuidePreCheck({
                cardNumber: '001234567890012',
                cardValidity: '2027-12-31',
                appointmentDate: '2026-09-29',
                hasPriceTable: true,
                requiresAuth: true,
                authNumber: 'AUTH-999',
                authSessionsAuthorized: 10,
                authSessionsUsed: 9,
                doctorCbo: '251510',
                doctorCouncil: 'CRP 06/99999',
                alreadyHasGuide: false,
            });

            expect(res.canProceed).toBe(true);
            expect(res.warnings.some(w => w.includes('Última sessão restante'))).toBe(true);
        });

        it('Cenário 4: Saldo de sessões esgotado (10 de 10 usadas) deve emitir aviso crítico', () => {
            const res = evaluateGuidePreCheck({
                cardNumber: '001234567890012',
                cardValidity: '2027-12-31',
                appointmentDate: '2026-09-29',
                hasPriceTable: true,
                requiresAuth: true,
                authNumber: 'AUTH-999',
                authSessionsAuthorized: 10,
                authSessionsUsed: 10,
                doctorCbo: '251510',
                doctorCouncil: 'CRP 06/99999',
                alreadyHasGuide: false,
            });

            expect(res.warnings.some(w => w.includes('saldo de sessões esgotado'))).toBe(true);
        });

        it('Cenário 5: Procedimento sem preço cadastrado na tabela do convênio', () => {
            const res = evaluateGuidePreCheck({
                cardNumber: '001234567890012',
                cardValidity: '2027-12-31',
                appointmentDate: '2026-09-29',
                hasPriceTable: false,
                requiresAuth: false,
                doctorCbo: '225125',
                doctorCouncil: 'CRM 123456-SP',
                alreadyHasGuide: false,
            });

            expect(res.warnings.some(w => w.includes('não possui preço cadastrado'))).toBe(true);
        });

        it('Cenário 6: Carteirinha vencida na data do atendimento', () => {
            const res = evaluateGuidePreCheck({
                cardNumber: '001234567890012',
                cardValidity: '2026-01-01',
                appointmentDate: '2026-09-29',
                hasPriceTable: true,
                requiresAuth: false,
                doctorCbo: '225125',
                doctorCouncil: 'CRM 123456-SP',
                alreadyHasGuide: false,
            });

            expect(res.warnings.some(w => w.includes('Carteirinha estava VENCIDA'))).toBe(true);
        });

        it('Cenário 7: Profissional executante sem CBO e sem Conselho', () => {
            const res = evaluateGuidePreCheck({
                cardNumber: '001234567890012',
                cardValidity: '2027-12-31',
                appointmentDate: '2026-09-29',
                hasPriceTable: true,
                requiresAuth: false,
                doctorCbo: '',
                doctorCouncil: '',
                alreadyHasGuide: false,
            });

            expect(res.warnings.some(w => w.includes('Código Brasileiro de Ocupações (CBO)'))).toBe(true);
            expect(res.warnings.some(w => w.includes('registro de conselho de classe'))).toBe(true);
        });

        it('Cenário 8: Tentativa de emitir guia duplicada deve ser rejeitada com código 409', () => {
            const res = evaluateGuidePreCheck({
                cardNumber: '001234567890012',
                cardValidity: '2027-12-31',
                appointmentDate: '2026-09-29',
                hasPriceTable: true,
                requiresAuth: false,
                doctorCbo: '225125',
                doctorCouncil: 'CRM 123456-SP',
                alreadyHasGuide: true,
            });

            expect(res.canProceed).toBe(false);
            expect(res.status).toBe(409);
            expect(res.code).toBe('GUIDE_ALREADY_EXISTS');
        });
    });
});
