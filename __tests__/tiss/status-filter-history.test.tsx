import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusFilterTabs } from '@/components/tiss/status-filter-tabs';
import { HistoryDrawer } from '@/components/tiss/HistoryDrawer';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let mockSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: mockPush,
        replace: mockReplace,
    }),
    usePathname: () => '/dashboard/tiss',
    useSearchParams: () => mockSearchParams,
}));

describe('F1: StatusFilterTabs Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSearchParams = new URLSearchParams();
    });

    const options = [
        { value: 'all', label: 'Todas', count: 15 },
        { value: 'pendente', label: 'Pendentes', count: 5 },
        { value: 'enviada', label: 'Enviadas', count: 10 },
    ];

    it('renders all options with their respective counts', () => {
        render(
            <StatusFilterTabs
                value="all"
                onValueChange={jest.fn()}
                options={options}
                urlParamKey="status"
            />
        );

        expect(screen.getByText('Todas')).toBeInTheDocument();
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('Pendentes')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('Enviadas')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('triggers onValueChange and updates URL search params when clicked', () => {
        const handleValueChange = jest.fn();
        render(
            <StatusFilterTabs
                value="all"
                onValueChange={handleValueChange}
                options={options}
                urlParamKey="status"
            />
        );

        const pendenteBtn = screen.getByRole('tab', { name: /Pendentes/i });
        fireEvent.click(pendenteBtn);

        expect(handleValueChange).toHaveBeenCalledWith('pendente');
        expect(mockReplace).toHaveBeenCalledWith('/dashboard/tiss?status=pendente', { scroll: false });
    });

    it('removes query param from URL when all is selected', () => {
        mockSearchParams = new URLSearchParams('status=pendente');
        const handleValueChange = jest.fn();

        render(
            <StatusFilterTabs
                value="pendente"
                onValueChange={handleValueChange}
                options={options}
                urlParamKey="status"
            />
        );

        const allBtn = screen.getByRole('tab', { name: /Todas/i });
        fireEvent.click(allBtn);

        expect(handleValueChange).toHaveBeenCalledWith('all');
        expect(mockReplace).toHaveBeenCalledWith('/dashboard/tiss', { scroll: false });
    });
});

describe('F2: HistoryDrawer Component', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
    });

    it('fetches audit trail when drawer is open and displays events', async () => {
        const mockAuditData = {
            data: [
                {
                    id: 'audit-001',
                    action: 'STATUS_CHANGED',
                    user_name: 'Dr. Lucas Silva',
                    created_at: '2026-09-30T14:30:00Z',
                    metadata: {
                        previous_state: 'DRAFT',
                        new_state: 'VALID',
                        reason: 'Validação de lote pré-fechamento',
                    },
                },
            ],
        };

        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => mockAuditData,
        });

        render(
            <HistoryDrawer
                open={true}
                onOpenChange={jest.fn()}
                entityType="tiss_batch"
                entityId="batch-123"
                title="Histórico do Lote"
            />
        );

        expect(global.fetch).toHaveBeenCalledWith('/api/tiss/audit?entityType=tiss_batch&entityId=batch-123&limit=50');
        expect(await screen.findByText('Status Changed')).toBeInTheDocument();
        expect(await screen.findByText('Dr. Lucas Silva')).toBeInTheDocument();
        expect(await screen.findByText('Validação de lote pré-fechamento')).toBeInTheDocument();
    });

    it('renders empty state when there are no events', async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ data: [] }),
        });

        render(
            <HistoryDrawer
                open={true}
                onOpenChange={jest.fn()}
                entityType="tiss_glosa"
                entityId="glosa-empty"
                title="Histórico da Glosa"
            />
        );

        expect(await screen.findByText('Nenhum evento registrado')).toBeInTheDocument();
    });
});
