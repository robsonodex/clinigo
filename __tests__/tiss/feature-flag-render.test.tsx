/** @jest-environment jsdom */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock de hooks e dependências externas
jest.mock('@/lib/tiss/use-faturamento-premium', () => ({
    useFaturamentoPremium: jest.fn(() => ({ isPremium: false, isLoading: false })),
}));

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
    usePathname: () => '/dashboard/tiss',
    useSearchParams: () => new URLSearchParams(),
}));

jest.mock('@tanstack/react-query', () => ({
    useQuery: jest.fn(() => ({ data: [], isLoading: false, refetch: jest.fn() })),
}));

// Mock do DropdownMenu para renderização inline determinística em ambiente de teste JSDOM
jest.mock('@/components/ui/dropdown-menu', () => ({
    DropdownMenu: ({ children }: any) => <div>{children}</div>,
    DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
    DropdownMenuContent: ({ children }: any) => <div data-testid="dropdown-content">{children}</div>,
    DropdownMenuItem: ({ children, onClick, disabled, className }: any) => (
        <button onClick={onClick} disabled={disabled} className={className}>
            {children}
        </button>
    ),
    DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
    DropdownMenuSeparator: () => <hr />,
}));

import { useFaturamentoPremium } from '@/lib/tiss/use-faturamento-premium';
import { NewGuideDialog } from '@/app/dashboard/(clinic)/tiss/new-guide-dialog';
import { GuideListTable } from '@/components/tiss/guide-list-table';
import { BatchListTable } from '@/components/tiss/batch-list-table';
import TissBatchesPage from '@/app/dashboard/(clinic)/tiss/batches/page';
import GlosasPage from '@/app/dashboard/(clinic)/tiss/glosas/page';
import TissPage from '@/app/dashboard/(clinic)/tiss/page';
import type { TissGuide, TissBatch } from '@/types/tiss';

describe('Feature Flag faturamento_premium: Isolamento Visual e Comportamental (B2 e P0)', () => {
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

    const mockDraftBatch: TissBatch = {
        id: 'batch-draft-1',
        clinic_id: 'clinic-1',
        batch_number: 'LOTE-DRAFT',
        status: 'DRAFT',
        total_guides: 2,
        total_value: 300,
        created_at: '2026-09-30T10:00:00Z',
        updated_at: '2026-09-30T10:00:00Z',
    } as unknown as TissBatch;

    const mockValidBatch: TissBatch = {
        id: 'batch-valid-1',
        clinic_id: 'clinic-1',
        batch_number: 'LOTE-VALID',
        status: 'VALID',
        total_guides: 2,
        total_value: 300,
        created_at: '2026-09-30T10:00:00Z',
        updated_at: '2026-09-30T10:00:00Z',
    } as unknown as TissBatch;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('1. NewGuideDialog (Modal de Nova Guia)', () => {
        it('Quando faturamento_premium = false, renderiza estritamente o formulário legado', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: false, isLoading: false });

            render(<NewGuideDialog onSuccess={jest.fn()} overridePremium={false} />);

            const trigger = screen.getByRole('button', { name: /Nova Guia/i });
            fireEvent.click(trigger);

            expect(screen.getByText('Preencha os dados para gerar uma nova guia de faturamento.')).toBeInTheDocument();
            expect(screen.getByPlaceholderText('Cole o UUID do paciente...')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /Criar Guia/i })).toBeInTheDocument();

            expect(screen.queryByText(/Passo 1 de 3/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/Conferir cadastro do convenio/i)).not.toBeInTheDocument();
        });

        it('Quando faturamento_premium = true, renderiza o assistente premium em 3 passos com conferência interna', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: true, isLoading: false });

            render(<NewGuideDialog onSuccess={jest.fn()} overridePremium={true} />);

            const trigger = screen.getByRole('button', { name: /Nova Guia/i });
            fireEvent.click(trigger);

            expect(screen.getByText(/Assistente de Emissão TISS/i)).toBeInTheDocument();
            expect(screen.getByText(/Passo 1 de 3/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/Digite o nome do paciente.../i)).toBeInTheDocument();

            expect(screen.queryByPlaceholderText('Cole o UUID do paciente...')).not.toBeInTheDocument();
        });
    });

    describe('2. GuideListTable (Tabela de Guias TISS)', () => {
        it('Quando faturamento_premium = false, renderiza tabela legada (6 colunas sem coluna Ações)', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: false, isLoading: false });

            render(<GuideListTable guides={mockGuides} overridePremium={false} />);

            expect(screen.getByText('Número')).toBeInTheDocument();
            expect(screen.getByText('Paciente')).toBeInTheDocument();
            expect(screen.getByText('Procedimento')).toBeInTheDocument();
            expect(screen.getByText('Quantidade')).toBeInTheDocument();
            expect(screen.getByText('Valor')).toBeInTheDocument();
            expect(screen.getByText('Status')).toBeInTheDocument();

            expect(screen.queryByText('Ações')).not.toBeInTheDocument();
            expect(screen.queryByLabelText('Selecionar todas as guias')).not.toBeInTheDocument();
        });

        it('Quando faturamento_premium = true, renderiza tabela premium com coluna Ações e suporte a seleção em massa', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: true, isLoading: false });

            render(<GuideListTable guides={mockGuides} overridePremium={true} />);

            expect(screen.getByText('Número')).toBeInTheDocument();
            expect(screen.getByText('Ações')).toBeInTheDocument();
            expect(screen.getByLabelText('Selecionar todas as guias')).toBeInTheDocument();
            expect(screen.getByLabelText(`Selecionar guia ${mockGuides[0].guide_number}`)).toBeInTheDocument();
        });
    });

    describe('3. BatchListTable (Menu de Lote P0: L2, L3, L7, F2)', () => {
        it('Quando faturamento_premium = false, menu do lote exibe item legado "Registrar Envio do Lote" e NENHUM item novo P0', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: false, isLoading: false });

            render(<BatchListTable batches={[mockDraftBatch]} isLoading={false} onRefresh={jest.fn()} overridePremium={false} />);

            expect(screen.getByText('Registrar Envio do Lote')).toBeInTheDocument();

            expect(screen.queryByText('Vincular Guias')).not.toBeInTheDocument();
            expect(screen.queryByText('Fechar Lote')).not.toBeInTheDocument();
            expect(screen.queryByText('Registrar Envio Manual')).not.toBeInTheDocument();
            expect(screen.queryByText('Histórico do Lote')).not.toBeInTheDocument();
        });

        it('Quando faturamento_premium = true, lote DRAFT exibe L2 (Vincular Guias), L3 (Fechar Lote), F2 (Histórico) e NÃO exibe L7 nem legado', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: true, isLoading: false });

            render(<BatchListTable batches={[mockDraftBatch]} isLoading={false} onRefresh={jest.fn()} overridePremium={true} />);

            expect(screen.getByText('Vincular Guias')).toBeInTheDocument();
            expect(screen.getByText('Fechar Lote')).toBeInTheDocument();
            expect(screen.getByText('Histórico do Lote')).toBeInTheDocument();

            expect(screen.queryByText('Registrar Envio Manual')).not.toBeInTheDocument();
            expect(screen.queryByText('Registrar Envio do Lote')).not.toBeInTheDocument();
        });

        it('Quando faturamento_premium = true, lote VALID exibe L7 (Registrar Envio Manual) e F2 (Histórico), mas NÃO exibe L2 ou L3', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: true, isLoading: false });

            render(<BatchListTable batches={[mockValidBatch]} isLoading={false} onRefresh={jest.fn()} overridePremium={true} />);

            expect(screen.getByText('Registrar Envio Manual')).toBeInTheDocument();
            expect(screen.getByText('Histórico do Lote')).toBeInTheDocument();

            expect(screen.queryByText('Vincular Guias')).not.toBeInTheDocument();
            expect(screen.queryByText('Fechar Lote')).not.toBeInTheDocument();
            expect(screen.queryByText('Registrar Envio do Lote')).not.toBeInTheDocument();
        });
    });

    describe('4. TissBatchesPage (Filtros F1 de Lotes)', () => {
        it('Quando faturamento_premium = false, NÃO renderiza StatusFilterTabs (F1)', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: false, isLoading: false });

            render(<TissBatchesPage />);

            expect(screen.queryByText('Todos os Lotes')).not.toBeInTheDocument();
            expect(screen.queryByText('Aprovados')).not.toBeInTheDocument();
        });

        it('Quando faturamento_premium = true, renderiza StatusFilterTabs (F1) com contadores', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: true, isLoading: false });

            render(<TissBatchesPage />);

            expect(screen.getByText('Todos os Lotes')).toBeInTheDocument();
            expect(screen.getByText('Aprovados')).toBeInTheDocument();
        });
    });

    describe('5. GlosasPage (Recursos C1-C8, Glosa Manual R3 e Filtros F1)', () => {
        it('Quando faturamento_premium = false, NÃO exibe R3 (Lançar Glosa Manual), nem aba Recursos (C1-C8), nem F1', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: false, isLoading: false });

            render(<GlosasPage />);

            expect(screen.queryByText(/Lançar Glosa Manual/i)).not.toBeInTheDocument();
            expect(screen.queryByText(/Recursos de Glosa \(C1 - C8\)/i)).not.toBeInTheDocument();
            expect(screen.queryByText('Todas as Glosas')).not.toBeInTheDocument();
        });

        it('Quando faturamento_premium = true, exibe R3, aba Recursos C1-C8 e filtros F1', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: true, isLoading: false });

            render(<GlosasPage />);

            expect(screen.getByText(/Lançar Glosa Manual/i)).toBeInTheDocument();
            expect(screen.getByText(/Recursos de Glosa \(C1 - C8\)/i)).toBeInTheDocument();
            expect(screen.getByText('Todas as Glosas')).toBeInTheDocument();
        });
    });

    describe('6. TissPage (Página Principal: Alternância entre Legado e Premium)', () => {
        it('Quando faturamento_premium = false, renderiza LegacyTissPage com texto Padrão TISS 4.0 e sem F1', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: false, isLoading: false });

            render(<TissPage />);

            expect(screen.getByText('Padrão TISS 4.0')).toBeInTheDocument();
            expect(screen.getByText('PRO')).toBeInTheDocument();

            expect(screen.queryByText('PREMIUM')).not.toBeInTheDocument();
            expect(screen.queryByText('Histórico da Guia TISS')).not.toBeInTheDocument();
        });

        it('Quando faturamento_premium = true, renderiza PremiumTissPage com botões de validação e filtros F1', () => {
            (useFaturamentoPremium as jest.Mock).mockReturnValue({ isPremium: true, isLoading: false });

            render(<TissPage />);

            expect(screen.getByText('PREMIUM')).toBeInTheDocument();
            expect(screen.getByText('Lotes')).toBeInTheDocument();
            expect(screen.queryByText('Padrão TISS 4.0')).not.toBeInTheDocument();
        });
    });
});
