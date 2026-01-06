import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server' // For getting session if needed, but here we are public
import { z } from 'zod'

// Validation schema
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    full_name: z.string().min(3),
    clinic_name: z.string().optional(), // Optional, verified later
})

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { email, password, full_name, clinic_name } = registerSchema.parse(body)

        // Use Service Role to bypass RLS and create everything
        const supabaseAdmin = createServiceRoleClient()

        // 1. Create Auth User
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto confirm for ease of use in Demo/SaaS MVP (or false if prod requires)
            user_metadata: { full_name }
        })

        if (authError) {
            console.error('Auth create error:', authError)
            return NextResponse.json({ success: false, error: { message: authError.message } }, { status: 400 })
        }

        if (!authUser.user) {
            return NextResponse.json({ success: false, error: { message: 'Failed to create user' } }, { status: 500 })
        }

        // 2. Create Clinic
        // Generate a slug from clinic name or full user name
        const baseName = clinic_name || `Clínica de ${full_name}`
        const slug = baseName.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove accents
            .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphen
            .replace(/^-+|-+$/g, '') // Trim hyphens

        // Ensure unique slug (simple append random if exists logic could be added, but for now rely on timestamp if needed? OR just UUID)
        // Let's try to insert, if conflict, append random 4 digits.
        let finalSlug = slug

        // Simple check loop (limit 3 attempts)
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
                plan_type: 'FREE', // Start with Free
            })
            .select()
            .single()

        if (clinicError) {
            // Rollback auth user?
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
            return NextResponse.json({ success: false, error: { message: 'Erro ao criar clínica: ' + clinicError.message } }, { status: 400 })
        }

        // 3. Create User Profile
        // Note: 'users' table is linked to auth.users by ID.
        const { error: profileError } = await (supabaseAdmin as any)
            .from('users')
            .insert({
                id: authUser.user.id,
                email: email,
                full_name: full_name,
                role: 'CLINIC_ADMIN', // They are the admin of their own clinic
                clinic_id: clinic?.id,
                is_active: true
            })

        if (profileError) {
            // Rollback Logic (Delete Clinic, Delete Auth)
            await (supabaseAdmin as any).from('clinics').delete().eq('id', clinic?.id)
            await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
            return NextResponse.json({ success: false, error: { message: 'Erro ao criar perfil: ' + profileError.message } }, { status: 400 })
        }

        // 4. Send Welcome Email (Non-blocking)
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
        return NextResponse.json({ success: false, error: { message: 'Erro interno no servidor' } }, { status: 500 })
    }
}
