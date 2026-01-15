import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(req: NextRequest) {
    try {
        // Init Admin Client
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        const email = 'admin@demo.clinigo.app'
        const targetId = '7d355240-67a0-47cc-813f-803582461dea'
        const password = 'Demo@2026'

        // 1. Check if user exists
        const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

        const existingUser = users.find(u => u.email === email || u.id === targetId)

        if (!existingUser) {
            // Create User
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name: 'Demo Admin', role: 'CLINIC_ADMIN' }
            })

            if (createError) throw createError

            return NextResponse.json({
                message: 'User created successfully',
                action: 'CREATED',
                user: newUser
            })
        }

        // 2. Update Password
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            {
                password: password,
                email_confirm: true,
                user_metadata: { full_name: 'Demo Admin', role: 'CLINIC_ADMIN' }
            }
        )

        if (updateError) throw updateError

        return NextResponse.json({
            message: 'User password reset successfully',
            action: 'UPDATED',
            user: updatedUser
        })

    } catch (error: any) {
        return NextResponse.json({
            error: error.message || 'Unknown error',
            details: error
        }, { status: 500 })
    }
}
