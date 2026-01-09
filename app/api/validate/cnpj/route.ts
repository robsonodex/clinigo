import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateCNPJ, cleanCNPJ } from '@/lib/utils/cnpj'

/**
 * GET /api/validate/cnpj
 * Validate CNPJ format and check if it's already registered
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const cnpj = searchParams.get('cnpj')

        if (!cnpj) {
            return NextResponse.json(
                { error: 'CNPJ é obrigatório' },
                { status: 400 }
            )
        }

        const cleanedCNPJ = cleanCNPJ(cnpj)

        // Validate CNPJ format
        const isValid = validateCNPJ(cleanedCNPJ)

        if (!isValid) {
            return NextResponse.json({
                valid: false,
                exists: false,
                error: 'CNPJ inválido',
            })
        }

        const supabase = await createClient()

        // Check if CNPJ exists
        const { data, error } = await supabase
            .from('clinics')
            .select('cnpj')
            .eq('cnpj', cleanedCNPJ)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking CNPJ:', error)
            return NextResponse.json(
                { error: 'Erro ao verificar CNPJ' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            valid: true,
            exists: !!data,
            cnpj: cleanedCNPJ,
        })
    } catch (error) {
        console.error('Unexpected error in CNPJ validation:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

