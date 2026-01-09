import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET /api/validate/slug
 * Check if a clinic slug is available
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const slug = searchParams.get('slug')

        if (!slug) {
            return NextResponse.json(
                { error: 'Slug é obrigatório' },
                { status: 400 }
            )
        }

        // Validate slug format
        const slugRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/
        if (!slugRegex.test(slug) || slug.length < 3 || slug.length > 50) {
            return NextResponse.json(
                {
                    available: false,
                    error: 'Slug inválido. Use apenas letras minúsculas, números e hífens (3-50 caracteres).'
                },
                { status: 200 }
            )
        }

        const supabase = await createClient()

        // Check if slug exists
        const { data, error } = await supabase
            .from('clinics')
            .select('slug')
            .eq('slug', slug)
            .single()

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            console.error('Error checking slug:', error)
            return NextResponse.json(
                { error: 'Erro ao verificar slug' },
                { status: 500 }
            )
        }

        return NextResponse.json({
            available: !data,
            slug: slug,
        })
    } catch (error) {
        console.error('Unexpected error in slug validation:', error)
        return NextResponse.json(
            { error: 'Erro interno do servidor' },
            { status: 500 }
        )
    }
}

