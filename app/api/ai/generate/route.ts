import { NextRequest, NextResponse } from 'next/server'
import { generateAIResponse } from '@/lib/services/ai'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const body = await req.json()
        const { prompt, systemPrompt, temperature, reasoning, metadata } = body

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
        }

        // Get clinic_id from user metadata or profile
        // Assuming user has clinic_id in metadata or we fetch profile
        // For simplicity, fetching profile
        const { data: profile } = await supabase
            .from('profiles')
            .select('clinic_id, id')
            .eq('user_id', user.id)
            .single()

        const clinicId = profile?.clinic_id
        const doctorId = profile?.id

        if (!clinicId || !doctorId) {
            return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
        }

        const response = await generateAIResponse(prompt, {
            clinicId,
            doctorId,
            interactionType: metadata?.type || 'GENERAL_QUERY',
            systemPrompt,
            temperature,
            reasoning
        })

        return NextResponse.json({
            content: response,
            success: true
        })

    } catch (error: any) {
        console.error('AI API Error:', error)
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        )
    }
}
