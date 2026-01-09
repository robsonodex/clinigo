import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { z } from 'zod'

// Validation schema
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    full_name: z.string().min(3),
    clinic_name: z.string().optional(), // Optional, verified later
})

// Error message constants
const EMAIL_ALREADY_EXISTS_ERROR = 'Este e-mail já está vinculado a uma clínica cadastrada. Por favor, use outro e-mail ou recupere sua senha.'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password, full_name, clinic_name } = registerSchema.parse(body)

        // Use Service Role to bypass RLS and create everything
        const supabaseAdmin = createServiceRoleClient()

        // ============================================
        // EMAIL UNIQUENESS CHECK (BEFORE ANY CREATION)
        // ============================================

        // 1. Check if email exists in users table (linked to clinics)
        const { data: existingUser } = await (supabaseAdmin as any)
            .from('users')
            .select('id, email, clinic_id')
            .eq('email', email.toLowerCase())
            .maybeSingle()

        if (existingUser) {
            console.log('[Register] Email already exists in users table:', email)
            return NextResponse.json(
                { success: false, error: { message: EMAIL_ALREADY_EXISTS_ERROR } },
                { status: 400 }
            )
        }

        // 2. Check if email exists in auth.users (Supabase Auth)
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers({
            perPage: 1,
        })

        // Search for existing email in auth
        const { data: existingAuthUser } = await supabaseAdmin.auth.admin.getUserById('')
            .catch(() => ({ data: null }))

        // Alternative: Try to get user by email directly
        try {
            const { data: usersByEmail } = await (supabaseAdmin as any)
                .from('users')
                .select('id')
                .ilike('email', email)
                .limit(1)

            if (usersByEmail && usersByEmail.length > 0) {
                console.log('[Register] Email found via ilike search:', email)
                return NextResponse.json(
                    { success: false, error: { message: EMAIL_ALREADY_EXISTS_ERROR } },
                    { status: 400 }
                )
            }
        } catch (e) {
            // Continue if check fails
        }

        // 3. Check if email exists in clinics table (as contact email)
        const { data: existingClinic } = await (supabaseAdmin as any)
            .from('clinics')
            .select('id, name')
            .eq('email', email.toLowerCase())
            .eq('is_active', true)
            .maybeSingle()

        if (existingClinic) {
            console.log('[Register] Email already exists in clinics table:', email)
            return NextResponse.json(
                { success: false, error: { message: EMAIL_ALREADY_EXISTS_ERROR } },
                { status: 400 }
            )
        }

        // ============================================
        // CREATE AUTH USER
        // ============================================
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name }
        })

        if (authError) {
            console.error('Auth create error:', authError)
            // Check if error is about existing user
            if (authError.message?.includes('already') || authError.message?.includes('exists')) {
                return NextResponse.json(
                    { success: false, error: { message: EMAIL_ALREADY_EXISTS_ERROR } },
                    { status: 400 }
                )
            }
            return NextResponse.json({ success: false, error: { message: authError.message } }, { status: 400 })
        }

        if (!authUser.user) {
            return NextResponse.json({ success: false, error: { message: 'Failed to create user' } }, { status: 500 })
        }

        // ============================================
        // CREATE CLINIC
        // ============================================
        const baseName = clinic_name || `Clínica de ${full_name}`
        const slug = baseName.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
            .replace(/^-+|-+$/g, '') // Trim hyphens

        // Ensure unique slug
        let finalSlug = slug
        for (let i = 0; i < 3; i++) {
            const { data: existing } = await (supabaseAdmin as any).from('clinics').select('id').eq('slug', finalSlug).single()
            if (!existing) break
            finalSlug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`
        }

        const { data: clinic, error: clinicError } = await (supabaseAdmin as any)
            .from('clinics')
            .insert({
                name: baseName,
                slug: finalSlug,
                email: email, // Contact email
                plan_type: 'BASIC',
            })
            .select()
            .single()

        if (clinicError) {
            // Rollback auth user
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
            return NextResponse.json({ success: false, error: { message: 'Erro ao criar clínica: ' + clinicError.message } }, { status: 400 })
        }

        // ============================================
        // CREATE USER PROFILE
        // ============================================
        const { error: profileError } = await (supabaseAdmin as any)
            .from('users')
            .insert({
                id: authUser.user.id,
                email: email,
                full_name: full_name,
                role: 'CLINIC_ADMIN',
                clinic_id: clinic?.id,
                is_active: true
            })

        if (profileError) {
            // Rollback Logic
            await (supabaseAdmin as any).from('clinics').delete().eq('id', clinic?.id)
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
            return NextResponse.json({ success: false, error: { message: 'Erro ao criar perfil: ' + profileError.message } }, { status: 400 })
        }

        // ============================================
        // SEND WELCOME EMAIL (Non-blocking)
        // ============================================
        try {
            const { sendRegistrationWelcomeEmail } = await import('@/lib/services/email')
            sendRegistrationWelcomeEmail(email, full_name, baseName)
        } catch (mailError) {
            console.error('Failed to trigger welcome email (async):', mailError)
        }

        return NextResponse.json({ success: true, message: 'Conta criada com sucesso!' })

    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ success: false, error: { message: error.errors[0].message } }, { status: 400 })
        }
        console.error('[Register] Unexpected error:', error)
        return NextResponse.json({ success: false, error: { message: 'Erro interno no servidor' } }, { status: 500 })
    }
}


