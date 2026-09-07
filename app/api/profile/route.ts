import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Buscar dados do perfil
export async function GET() {
    try {
        const supabase = await createClient()
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
        }

        // Buscar dados completos do usuário com joins explícitos
        const { data: user, error: userError } = await supabase
            .from('users')
            .select(`
                *,
                clinic:clinics!users_clinic_id_fkey(id, name, plan_type),
                doctor:doctors!doctors_user_id_fkey(crm, crm_state, specialty, consultation_price, consultation_duration)
            `)
            .eq('id', authUser.id)
            .single()

        let profileData = user

        // Fallback defensivo: se houver erro no join, busca apenas os dados essenciais do usuario
        if (userError) {
            console.warn('Falha no join completo do perfil, executando fallback basico:', userError.message)
            const { data: basicUser, error: basicError } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single()

            if (basicError) {
                return NextResponse.json({ error: basicError.message }, { status: 500 })
            }
            profileData = basicUser
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
        console.error('Error fetching profile:', error)
        return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 })
    }
}

// PATCH - Atualizar dados do perfil
export async function PATCH(request: Request) {
    try {
        const supabase = await createClient()
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (authError || !authUser) {
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
        console.error('Error updating profile:', error)
        return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 })
    }
}
