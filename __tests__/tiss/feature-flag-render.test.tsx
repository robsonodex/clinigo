/** @jest-environment jsdom */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewGuideDialog } from '@/app/dashboard/(clinic)/tiss/new-guide-dialog';
import { GuideListTable } from '@/components/tiss/guide-list-table';
import type { TissGuide } from '@/types/tiss';

// Mock do hook useFaturamentoPremium
jest.mock('@/lib/tiss/use-faturamento-premium', () => ({
    useFaturamentoPremium: jest.fn(() => ({ isPremium: false, isLoading: false })),
}));

import { useFaturamentoPremium } from '@/lib/tiss/use-faturamento-premium';

describe('B2.1 - Feature Flag faturamento_premium: Isolamento Visual e Comportamental', () => {
    const mockGuides: TissGuide[] = [
        {
            id: 'guide-1',
            clinic_id: 'clinic-1',
            batch_id: 'batch-1',
            guide_number: '2026000001',
            guide_type: 'consulta',
            patient_id: 'pat-1',
            patient_name: 'Maria Oliveira',
            procedure_code: '10101012',
            procedure_name: 'Consulta Médica',
            procedure_quantity: 1,
            unit_value: 150.0,
            total_value: 150.0,
            glosa_value: 0,
            status: 'PENDING',
            validation_status: 'VALID',
            created_at: '2026-09-30T10:00:00Z',
            updated_at: '2026-09-30T10:00:00Z',
        } as unknown as TissGuide,
    ];

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('1. NewGuideDialog (Modal de Nova Guia)', () => {
        it('Quando faturamento_premium = false, renderiza estritamente o formulário legado', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: false, isLoading: false });

            render(<NewGuideDialog onSuccess={jest.fn()} overridePremium={false} />);

            // Clicar no botão para abrir o diálogo
            const trigger = screen.getByRole('button', { name: /Nova Guia/i });
            fireEvent.click(trigger);

            // Confirma presença dos elementos exclusivos da UI legada
            expect(screen.getByText('Preencha os dados para gerar uma nova guia de faturamento.')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Cole o UUID do paciente...')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Criar Guia/i })).toBeInTheDocument();

            // Garante que o assistente de 3 passos NÃO está presente
            expect(screen.queryByText(/Passo 1 de 3/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/Conferir cadastro do convenio/i)).not.toBeInTheDocument();
        });

        it('Quando faturamento_premium = true, renderiza o assistente premium em 3 passos com conferência interna', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: true, isLoading: false });

            render(<NewGuideDialog onSuccess={jest.fn()} overridePremium={true} />);

            // Clicar no botão para abrir o diálogo
            const trigger = screen.getByRole('button', { name: /Nova Guia/i });
            fireEvent.click(trigger);

            // Confirma elementos exclusivos da UI nova B2
            expect(screen.getByText(/Assistente de Emissão TISS/i)).toBeInTheDocument();
            expect(screen.getByText(/Passo 1 de 3/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/Digite o nome do paciente.../i)).toBeInTheDocument();

            // Garante que a UI legada com input temporário de UUID NÃO está presente
            expect(screen.queryByPlaceholderText('Cole o UUID do paciente...')).not.toBeInTheDocument();
        });
    });

    describe('2. GuideListTable (Tabela de Guias TISS)', () => {
        it('Quando faturamento_premium = false, renderiza tabela legada (6 colunas sem coluna Ações)', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: false, isLoading: false });

            render(<GuideListTable guides={mockGuides} overridePremium={false} />);

            // Deve exibir cabeçalhos legados
            expect(screen.getByText('Número')).toBeInTheDocument();
            expect(screen.getByText('Paciente')).toBeInTheDocument();
            expect(screen.getByText('Procedimento')).toBeInTheDocument();
            expect(screen.getByText('Quantidade')).toBeInTheDocument();
            expect(screen.getByText('Valor')).toBeInTheDocument();
            expect(screen.getByText('Status')).toBeInTheDocument();

            // NÃO deve exibir coluna de Ações nem checkboxes de seleção em massa
            expect(screen.queryByText('Ações')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Selecionar todas as guias')).not.toBeInTheDocument();
        });

        it('Quando faturamento_premium = true, renderiza tabela premium com coluna Ações e suporte a seleção em massa', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: true, isLoading: false });

            render(<GuideListTable guides={mockGuides} overridePremium={true} />);

            // Deve exibir cabeçalhos premium incluindo Ações e checkbox de lote
            expect(screen.getByText('Número')).toBeInTheDocument();
            expect(screen.getByText('Ações')).toBeInTheDocument();
            expect(screen.getByLabelText('Selecionar todas as guias')).toBeInTheDocument();
            expect(screen.getByLabelText(`Selecionar guia ${mockGuides[0].guide_number}`)).toBeInTheDocument();
        });
    });
});
