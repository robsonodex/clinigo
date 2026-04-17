import { POST } from '@/app/api/tiss/eligibility/route'
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Mocks globais para next/server (evita ReferenceError: Request is not defined)
jest.mock('next/server', () => {
  return {
    NextRequest: class MockNextRequest {
      url: string;
      method: string;
      _body: any;
      constructor(url: string, options: { method: string, body?: string }) {
        this.url = url;
        this.method = options.method;
        this._body = options.body ? JSON.parse(options.body) : {};
      }
      async json() { return this._body; }
    },
    NextResponse: {
      json: jest.fn().mockImplementation((body, init) => {
        return {
          status: init?.status || 200,
          json: async () => body
        }
      })
    }
  }
})

// Mocking the Supabase server client
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

describe('TISS 800 API - Eligibility Check', () => {
  let mockSupabase: any

  beforeEach(() => {
    // Arrange: Reset mocks before each test
    jest.clearAllMocks()
    
    mockSupabase = {
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } })
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            role: 'RECEPTIONIST',
            clinic_id: 'test-clinic-id',
            clinics: { plan_type: 'AVANCADO', is_active: true }
          },
          error: null
        }),
        insert: jest.fn().mockReturnThis()
      })
    }

    ;(createClient as jest.Mock).mockResolvedValue(mockSupabase)
  })

  it('should return 401 if user is not authenticated', async () => {
    // Arrange
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })
    const request = new NextRequest('http://localhost/api/tiss/eligibility', { method: 'POST' })

    // Act
    const response = await POST(request)
    const json = await response.json()

    // Assert
    expect(response.status).toBe(401)
    expect(json.error).toBe('Não autorizado')
  })

  it('should return 403 if role is below RECEPTIONIST', async () => {
    // Arrange
    mockSupabase.from().single.mockResolvedValue({
      data: {
        role: 'STAFF', // Below RECEPTIONIST (20 < 40)
        clinic_id: 'test-clinic-id',
        clinics: { plan_type: 'AVANCADO', is_active: true }
      },
      error: null
    })
    
    const request = new NextRequest('http://localhost/api/tiss/eligibility', {
      method: 'POST',
      body: JSON.stringify({ health_insurance_id: '123', card_number: '12345' })
    })

    // Act
    const response = await POST(request)
    const json = await response.json()

    // Assert
    expect(response.status).toBe(403)
    expect(json.error).toMatch(/Nível de acesso insuficiente/)
  })

  it('should return 403 if plan is below AVANCADO', async () => {
    // Arrange
    mockSupabase.from().single.mockResolvedValue({
      data: {
        role: 'CLINIC_ADMIN',
        clinic_id: 'test-clinic-id',
        clinics: { plan_type: 'BASIC', is_active: true } // Below AVANCADO (40 < 50)
      },
      error: null
    })
    
    const request = new NextRequest('http://localhost/api/tiss/eligibility', {
      method: 'POST',
      body: JSON.stringify({ health_insurance_id: '123', card_number: '12345' })
    })

    // Act
    const response = await POST(request)
    const json = await response.json()

    // Assert
    expect(response.status).toBe(403)
    expect(json.error).toMatch(/requer no mínimo o plano AVANÇADO/)
  })

  it('should process eligible card correctly and register in DB', async () => {
    // Arrange
    const insertMock = jest.fn().mockResolvedValue({ data: { id: 'test-log-id', status: 'ELIGIBLE' }, error: null })
    mockSupabase.from = jest.fn((table) => {
      if (table === 'users') {
        return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({
            data: { role: 'RECEPTIONIST', clinic_id: 'test-clinic', clinics: { plan_type: 'AVANCADO', is_active: true } }, error: null
        })}
      }
      if (table === 'tiss_eligibility_checks') {
        return { insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), single: insertMock }) }
      }
    })

    const payload = {
      health_insurance_id: 'test-insurance-id',
      card_number: '012345678912', // NOT ending in 00 or 99 -> ELIGIBLE
      card_validity: '2099-12-31'
    }

    const request = new NextRequest('http://localhost/api/tiss/eligibility', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    // Act
    const response = await POST(request)
    const json = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.data.status).toBe('ELIGIBLE')
    expect(insertMock).toHaveBeenCalled()
  })

  it('should process ineligible card (ending in 00)', async () => {
    // Arrange
    const insertMock = jest.fn().mockResolvedValue({ data: { id: 'test', status: 'INELIGIBLE' }, error: null })
    mockSupabase.from = jest.fn((table) => {
      if (table === 'users') return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: { role: 'RECEPTIONIST', clinic_id: 'test-clinic', clinics: { plan_type: 'AVANCADO', is_active: true } }, error: null }) }
      if (table === 'tiss_eligibility_checks') return { insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnThis(), single: insertMock }) }
    })

    const request = new NextRequest('http://localhost/api/tiss/eligibility', {
      method: 'POST',
      body: JSON.stringify({ health_insurance_id: 'test', card_number: '99999900' })
    })

    // Act
    const response = await POST(request)
    const json = await response.json()

    // Assert
    expect(response.status).toBe(200)
    expect(json.success).toBe(false)
    expect(json.data.status).toBe('INELIGIBLE')
    expect(insertMock).toHaveBeenCalled()
  })
})
