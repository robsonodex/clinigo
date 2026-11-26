import { withAxiomRouteHandler as withAxiom, AxiomRequest } from 'next-axiom'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/auth/verify-token'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Buscar dados do perfil
export const GET = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        // Verificação criptográfica local do JWT primeiro (imune a oscilação de rede / rotação concorrente)
        const { user: authUser } = await getVerifiedUser(supabase, request)

        if (!authUser) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const PROFILE_SELECT = `
                *,
                clinic:clinics!users_clinic_id_fkey(
                    id,
                    name,
                    slug,
                    logo_url,
                    primary_color,
                    plan_type,
                    is_active,
                    payment_confirmed,
                    is_demo,
                    approval_status,
                    trial_ends_at,
                    council_label,
                    professional_label
                ),
                doctor:doctors!doctors_user_id_fkey(crm, crm_state, specialty, consultation_price, consultation_duration)
            `

        // Buscar dados completos do usuário com joins explícitos
        const { data: user, error: userError } = await supabase
            .from('users')
            .select(PROFILE_SELECT)
            .eq('id', authUser.id)
            .maybeSingle()

        let profileData: any = user

        // Fallback com cliente seguro quando a sessão do cliente não enxerga a linha (RLS / token em renovação)
        if (userError || !profileData) {
            if (userError) {
                console.warn('Falha no join completo do perfil, executando fallback com service role:', userError.message)
            }
            const serviceRole = createServiceRoleClient()
            const { data: fallbackUser, error: fallbackError } = await serviceRole
                .from('users')
                .select(PROFILE_SELECT)
                .eq('id', authUser.id)
                .maybeSingle()

            if (fallbackError) {
                return NextResponse.json({ error: fallbackError.message }, { status: 500 })
            }
            if (!fallbackUser) {
                return NextResponse.json(
                    { error: 'Perfil de usuário não encontrado', code: 'PROFILE_NOT_FOUND' },
                    { status: 404 }
                )
            }
            profileData = fallbackUser
        }

        // Suporte a Impersonation Multi-Perfil (somente quando usuário real é SUPER_ADMIN)
        const SUPER_ADMIN_EMAILS = (
            process.env.SUPER_ADMIN_EMAILS || 'robsonfenriz@gmail.com,contato@clinigo.app'
        ).split(',').map(e => e.trim().toLowerCase())
        const isRealSuperAdmin =
            SUPER_ADMIN_EMAILS.includes((authUser.email || '').toLowerCase()) ||
            profileData?.role === 'SUPER_ADMIN'

        const impersonationActive = request.cookies.get('impersonation_active')?.value === 'true'
        const impersonationClinicId = request.cookies.get('impersonation_clinic_id')?.value
        const impersonationTargetUserId = request.cookies.get('impersonation_target_user_id')?.value
        const impersonationTargetRole = request.cookies.get('impersonation_target_role')?.value
        const impersonationTargetName = request.cookies.get('impersonation_target_name')?.value
        const skipImpersonation = request.nextUrl.searchParams.get('raw') === '1'

        if (isRealSuperAdmin && impersonationActive && impersonationClinicId && !skipImpersonation) {
            const serviceRole = createServiceRoleClient() as any
            let mirroredProfile: any = null

            if (impersonationTargetUserId) {
                const { data: targetUser } = await serviceRole
                    .from('users')
                    .select(PROFILE_SELECT)
                    .eq('id', impersonationTargetUserId)
                    .eq('clinic_id', impersonationClinicId)
                    .maybeSingle()
                mirroredProfile = targetUser || null
            }

            if (!mirroredProfile) {
                const desiredRole =
                    impersonationTargetRole &&
                    ['CLINIC_ADMIN', 'DOCTOR', 'RECEPTIONIST', 'FINANCIAL', 'READONLY'].includes(impersonationTargetRole)
                        ? impersonationTargetRole
                        : 'CLINIC_ADMIN'
                const { data: roleUser } = await serviceRole
                    .from('users')
                    .select(PROFILE_SELECT)
                    .eq('clinic_id', impersonationClinicId)
                    .eq('role', desiredRole)
                    .limit(1)
                    .maybeSingle()
                mirroredProfile = roleUser || null
            }

            if (mirroredProfile) {
                profileData = {
                    ...mirroredProfile,
                    is_impersonating: true,
                    real_role: 'SUPER_ADMIN',
                }
            } else {
                const { data: impClinic } = await serviceRole
                    .from('clinics')
                    .select('id, name, slug, logo_url, primary_color, plan_type, is_active, payment_confirmed, is_demo, approval_status, trial_ends_at, council_label, professional_label')
                    .eq('id', impersonationClinicId)
                    .maybeSingle()

                profileData = {
                    ...profileData,
                    clinic_id: impersonationClinicId,
                    clinic: impClinic || null,
                    role: impersonationTargetRole || 'CLINIC_ADMIN',
                    full_name: impersonationTargetName || impClinic?.name || 'Administração',
                    is_impersonating: true,
                    real_role: 'SUPER_ADMIN',
                }
            }
        }

        // Normalização dos dados de médico com retrocompatibilidade para crm_uf
        let doctorObj: any = null
        if (Array.isArray(profileData?.doctor) && profileData.doctor.length > 0) {
            doctorObj = profileData.doctor[0]
        } else if (profileData?.doctor && !Array.isArray(profileData?.doctor)) {
            doctorObj = profileData.doctor
        }

        const doctorData = doctorObj ? {
            ...doctorObj,
            crm_uf: doctorObj.crm_state || '',
        } : null

        return NextResponse.json({
            user: {
                ...profileData,
                doctor: doctorData,
                name: profileData?.full_name || '',
            }
        })
    } catch (error) {
        request.log.error('profile', { error: error instanceof Error ? error.message : String(error) })
        console.error('Error fetching profile:', error)
        return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 })
    }
})

// PATCH - Atualizar dados do perfil
export const PATCH = withAxiom(async (request: AxiomRequest) => {
    try {
        const supabase = await createClient()
        const { user: authUser } = await getVerifiedUser(supabase, request)

        if (!authUser) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        const body = await request.json()
        const {
            name,
            full_name,
            phone,
            cpf,
            bio,
            gender,
            birth_date,
            address_street,
            address_number,
            address_complement,
            address_neighborhood,
            address_city,
            address_state,
            address_zipcode,
        } = body

        // Sanitização do nome (limite de 100 caracteres, remoção de caracteres de controle e tags)
        const rawName = name !== undefined ? name : full_name
        let sanitizedFullName: string | undefined = undefined

        if (rawName !== undefined) {
            sanitizedFullName = String(rawName)
                .trim()
                .replace(/[\u0000-\u001F\u007F-\u009F<>]/g, '')
                .slice(0, 100)

            if (sanitizedFullName.length < 2) {
                return NextResponse.json(
                    { error: 'O nome deve ter no mínimo 2 caracteres' },
                    { status: 400 }
                )
            }
        }

        const updatePayload: Record<string, any> = {
            updated_at: new Date().toISOString(),
        }

        if (sanitizedFullName !== undefined) {
            updatePayload.full_name = sanitizedFullName
        }
        if (phone !== undefined) updatePayload.phone = phone
        if (cpf !== undefined) updatePayload.cpf = cpf
        if (bio !== undefined) updatePayload.bio = bio
        if (gender !== undefined) updatePayload.gender = gender
        if (birth_date !== undefined) updatePayload.birth_date = birth_date
        if (address_street !== undefined) updatePayload.address_street = address_street
        if (address_number !== undefined) updatePayload.address_number = address_number
        if (address_complement !== undefined) updatePayload.address_complement = address_complement
        if (address_neighborhood !== undefined) updatePayload.address_neighborhood = address_neighborhood
        if (address_city !== undefined) updatePayload.address_city = address_city
        if (address_state !== undefined) updatePayload.address_state = address_state
        if (address_zipcode !== undefined) updatePayload.address_zipcode = address_zipcode

        // Atualizar dados do usuário no banco (tabela users)
        const serviceRole = createServiceRoleClient()
        let updatedUser: any = null

        const { data: directUpdated, error: updateError } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', authUser.id)
            .select()
            .single()

        if (updateError) {
            console.warn('Fallback to service role for user profile update:', updateError.message)
            const { data: adminUpdated, error: adminError } = await serviceRole
                .from('users')
                .update(updatePayload)
                .eq('id', authUser.id)
                .select()
                .single()

            if (adminError) {
                console.error('Error updating users table via admin:', adminError)
                return NextResponse.json({ error: adminError.message }, { status: 500 })
            }
            updatedUser = adminUpdated
        } else {
            updatedUser = directUpdated
        }

        // Sincronizar metadados do auth.users se o nome foi alterado
        if (sanitizedFullName) {
            try {
                await serviceRole.auth.admin.updateUserById(authUser.id, {
                    user_metadata: { full_name: sanitizedFullName }
                })
            } catch (authSyncErr) {
        request.log.error('profile', { error: authSyncErr instanceof Error ? authSyncErr.message : String(authSyncErr) })
                console.warn('Non-blocking: could not sync auth user_metadata:', authSyncErr)
            }
        }

        return NextResponse.json({
            success: true,
            user: {
                ...updatedUser,
                name: updatedUser?.full_name || '',
            }
        })
    } catch (error) {
        request.log.error('profile', { error: error instanceof Error ? error.message : String(error) })
        console.error('Error updating profile:', error)
        return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
    }
})
