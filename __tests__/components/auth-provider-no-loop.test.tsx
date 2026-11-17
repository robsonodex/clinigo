/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, waitFor } from '@testing-library/react'

const mockGetSession = jest.fn()
const mockGetUser = jest.fn()
const mockOnAuthStateChange = jest.fn()
const mockMaybeSingle = jest.fn()

jest.mock('next/navigation', () => ({
    useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}))

jest.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        auth: {
            getSession: mockGetSession,
            getUser: mockGetUser,
            onAuthStateChange: mockOnAuthStateChange,
            signInWithPassword: jest.fn(),
            signOut: jest.fn(),
        },
        from: jest.fn(() => ({
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: mockMaybeSingle,
        })),
    }),
}))

import { AuthProvider, useAuthContext, clearAuthCache } from '@/components/providers/AuthProvider'

function ConsumerProbe({ onRender }: { onRender: (user: any, profile: any) => void }) {
    const { user, profile } = useAuthContext()
    onRender(user, profile)
    return null
}

describe('AuthProvider anti-loop stability', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        clearAuthCache()
        mockOnAuthStateChange.mockReturnValue({
            data: { subscription: { unsubscribe: jest.fn() } },
        })
        // Simula getSession retornando uma NOVA referência de objeto `user` a cada chamada
        mockGetSession.mockImplementation(async () => ({
            data: {
                session: {
                    user: {
                        id: 'user-loop-test-1',
                        email: 'admin@clinica.com',
                        updated_at: '2026-11-17T12:00:00Z',
                        user_metadata: { role: 'CLINIC_ADMIN', clinic_id: 'clinic-1' },
                    },
                },
            },
        }))
        mockMaybeSingle.mockResolvedValue({
            data: {
                id: 'user-loop-test-1',
                email: 'admin@clinica.com',
                full_name: 'Admin Teste',
                role: 'CLINIC_ADMIN',
                clinic_id: 'clinic-1',
                clinics: { id: 'clinic-1', name: 'Clínica Teste' },
            },
            error: null,
        })
    })

    it('executa loadSession e onAuthStateChange uma única vez sem loop infinito', async () => {
        const renderSpy = jest.fn()

        render(
            React.createElement(
                AuthProvider,
                null,
                React.createElement(ConsumerProbe, { onRender: renderSpy })
            )
        )

        await waitFor(() => {
            expect(mockMaybeSingle).toHaveBeenCalledTimes(1)
        })

        // Aguarda alguns ticks para garantir que não dispare novos ciclos
        await new Promise(resolve => setTimeout(resolve, 100))

        expect(mockGetSession).toHaveBeenCalledTimes(1)
        expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1)
        expect(mockMaybeSingle).toHaveBeenCalledTimes(1)
        expect(renderSpy.mock.calls.length).toBeLessThanOrEqual(4)
    })
})

