/** @jest-environment jsdom */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import {
    useFaturamentoPremium,
    clearFaturamentoPremiumCache,
} from '@/lib/tiss/use-faturamento-premium';

function Probe({ id }: { id: string }) {
    const { isPremium, isLoading } = useFaturamentoPremium();
    return (
        <div data-testid={id}>
            {isLoading ? 'loading' : isPremium ? 'premium' : 'legacy'}
        </div>
    );
}

describe('useFaturamentoPremium — deduplicação e cache TTL em memória', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
        clearFaturamentoPremiumCache();
        jest.clearAllMocks();
    });

    afterAll(() => {
        global.fetch = originalFetch;
    });

    it('deduplica chamadas simultâneas e reutiliza cache em memória sem refazer fetch dentro do TTL', async () => {
        const fetchMock = jest.fn().mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ success: true, data: { faturamento_premium: true } }),
        });
        global.fetch = fetchMock as any;

        const { getByTestId, unmount } = render(
            <>
                <Probe id="probe-1" />
                <Probe id="probe-2" />
            </>
        );

        await waitFor(() => {
            expect(getByTestId('probe-1').textContent).toBe('premium');
            expect(getByTestId('probe-2').textContent).toBe('premium');
        });

        expect(fetchMock).toHaveBeenCalledTimes(1);
        expect(fetchMock).toHaveBeenCalledWith('/api/tiss/settings/premium');

        unmount();

        // Nova montagem dentro do TTL (5 min) não deve disparar novo fetch
        const secondRender = render(<Probe id="probe-3" />);
        expect(secondRender.getByTestId('probe-3').textContent).toBe('premium');
        expect(fetchMock).toHaveBeenCalledTimes(1);
        secondRender.unmount();
    });

    it('invalida o cache quando o evento clinic-switched é disparado', async () => {
        const fetchMock = jest
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ success: true, data: { faturamento_premium: true } }),
            })
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ success: true, data: { faturamento_premium: false } }),
            });
        global.fetch = fetchMock as any;

        const first = render(<Probe id="probe-a" />);
        await waitFor(() => {
            expect(first.getByTestId('probe-a').textContent).toBe('premium');
        });
        expect(fetchMock).toHaveBeenCalledTimes(1);
        first.unmount();

        act(() => {
            window.dispatchEvent(new Event('clinic-switched'));
        });

        const second = render(<Probe id="probe-b" />);
        await waitFor(() => {
            expect(second.getByTestId('probe-b').textContent).toBe('legacy');
        });
        expect(fetchMock).toHaveBeenCalledTimes(2);
        second.unmount();
    });
});

