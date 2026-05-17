// @ts-nocheck
/**
 * API: Feature Flags & Platform Settings
 * GET  /api/super-admin/feature-flags — Lista flags
 * POST /api/super-admin/feature-flags — CRUD de flags e settings
 */
import { type NextRequest } from 'next/server'
import { successResponse, handleApiError, ForbiddenError, BadRequestError } from '@/lib/utils/responses'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAILS = (
    process.env.SUPER_ADMIN_EMAILS || 'robsonfenriz@gmail.com,contato@clinigo.app'
).split(',').map(e => e.trim().toLowerCase())

async function verifySuperAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new ForbiddenError('Not authenticated')
    const isWhitelisted = SUPER_ADMIN_EMAILS.includes((user.email || '').toLowerCase())
    if (!isWhitelisted) {
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
        if (profile?.role !== 'SUPER_ADMIN') throw new ForbiddenError('Super admin only')
    }
    return user
}

export async function GET() {
    try {
        await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient()

        // Flags
        let flags: any[] = []
        try {
            const { data } = await supabaseAdmin.from('feature_flags').select('*').order('flag_key')
            flags = data || []
        } catch { }

        // Settings
        let settings: any[] = []
        try {
            const { data } = await supabaseAdmin.from('platform_settings').select('*').order('key')
            settings = data || []
        } catch { }

        // Overrides
        let overrides: any[] = []
        try {
            const { data } = await supabaseAdmin
                .from('clinic_feature_overrides')
                .select('*, clinics:clinic_id(name), feature_flags:flag_id(flag_key, description)')
            overrides = data || []
        } catch { }

        return successResponse({ flags, settings, overrides })
    } catch (error) {
        return handleApiError(error)
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await verifySuperAdmin()
        const supabaseAdmin = createServiceRoleClient()
        const body = await request.json()
        const { action } = body

        switch (action) {
            case 'toggle_flag': {
                const { flag_id, enabled } = body
                if (!flag_id) throw new BadRequestError('flag_id é obrigatório')
                const { error } = await supabaseAdmin
                    .from('feature_flags')
                    .update({ is_enabled: enabled, updated_by: user.id })
                    .eq('id', flag_id)
                if (error) throw new Error('Erro ao atualizar flag')
                return successResponse({ message: `Flag ${enabled ? 'ativada' : 'desativada'}` })
            }

            case 'create_flag': {
                const { flag_key, description, is_enabled, rollout_percentage, allowed_plans } = body
                if (!flag_key) throw new BadRequestError('flag_key é obrigatório')
                const { error } = await supabaseAdmin.from('feature_flags').insert({
                    flag_key, description: description || '',
                    is_enabled: is_enabled ?? false,
                    rollout_percentage: rollout_percentage ?? 100,
                    allowed_plans: allowed_plans || [],
                    created_by: user.id, updated_by: user.id,
                })
                if (error) throw new Error('Erro ao criar flag: ' + error.message)
                return successResponse({ message: 'Flag criada' }, { status: 201 })
            }

            case 'delete_flag': {
                const { flag_id } = body
                if (!flag_id) throw new BadRequestError('flag_id é obrigatório')
                await supabaseAdmin.from('clinic_feature_overrides').delete().eq('flag_id', flag_id)
                const { error } = await supabaseAdmin.from('feature_flags').delete().eq('id', flag_id)
                if (error) throw new Error('Erro ao excluir flag')
                return successResponse({ message: 'Flag excluída' })
            }

            case 'update_setting': {
                const { key, value } = body
                if (!key) throw new BadRequestError('key é obrigatório')
                const { error } = await supabaseAdmin
                    .from('platform_settings')
                    .upsert({ key, value: JSON.stringify(value), updated_by: user.id }, { onConflict: 'key' })
                if (error) throw new Error('Erro ao salvar setting: ' + error.message)
                return successResponse({ message: 'Configuração salva' })
            }

            case 'add_override': {
                const { flag_id, clinic_id, is_enabled } = body
                if (!flag_id || !clinic_id) throw new BadRequestError('flag_id e clinic_id obrigatórios')
                const { error } = await supabaseAdmin.from('clinic_feature_overrides').upsert({
                    flag_id, clinic_id, is_enabled: is_enabled ?? true,
                }, { onConflict: 'flag_id,clinic_id' })
                if (error) throw new Error('Erro ao adicionar override: ' + error.message)
                return successResponse({ message: 'Override salvo' })
            }

            case 'remove_override': {
                const { override_id } = body
                if (!override_id) throw new BadRequestError('override_id é obrigatório')
                const { error } = await supabaseAdmin.from('clinic_feature_overrides').delete().eq('id', override_id)
                if (error) throw new Error('Erro ao remover override')
                return successResponse({ message: 'Override removido' })
            }

            default:
                throw new BadRequestError(`Ação desconhecida: ${action}`)
        }
    } catch (error) {
        return handleApiError(error)
    }
}
