/**
 * Typed Supabase Client
 * Wrapper com tipos estritos para todas as queries
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import type {
    StrictUser,
    StrictClinic,
    UserWithClinic,
    PlanType
} from '@/types/core'

export type TypedSupabaseClient = SupabaseClient<Database>

// ============================================================================
// CLINIC QUERIES
// ============================================================================

export async function getClinic(
    supabase: TypedSupabaseClient,
    clinicId: string
): Promise<StrictClinic> {
    const { data, error } = await supabase
        .from('clinics')
        .select('id, name, plan_type, plan_limits, is_active, logo_url, primary_color, created_at, updated_at')
        .eq('id', clinicId)
        .single()

    if (error) throw new Error(`Failed to fetch clinic: ${error.message}`)
    if (!data) throw new Error('Clinic not found')

    return data as StrictClinic
}

export async function getClinicBySlug(
    supabase: TypedSupabaseClient,
    slug: string
): Promise<StrictClinic> {
    const { data, error } = await supabase
        .from('clinics')
        .select('id, name, plan_type, plan_limits, is_active, logo_url, primary_color, created_at, updated_at')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()

    if (error) throw new Error(`Failed to fetch clinic: ${error.message}`)
    if (!data) throw new Error('Clinic not found')

    return data as StrictClinic
}

export async function updateClinicPlan(
    supabase: TypedSupabaseClient,
    clinicId: string,
    planType: PlanType
): Promise<void> {
    const { error } = await supabase
        .from('clinics')
        .update({ plan_type: planType } as any)
        .eq('id', clinicId)

    if (error) throw new Error(`Failed to update clinic plan: ${error.message}`)
}

// ============================================================================
// USER QUERIES
// ============================================================================

export async function getUser(
    supabase: TypedSupabaseClient,
    userId: string
): Promise<StrictUser> {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, clinic_id, role, is_active, created_at, updated_at')
        .eq('id', userId)
        .single()

    if (error) throw new Error(`Failed to fetch user: ${error.message}`)
    if (!data) throw new Error('User not found')

    return data as StrictUser
}

export async function getUserWithClinic(
    supabase: TypedSupabaseClient,
    userId: string
): Promise<UserWithClinic> {
    const { data, error } = await supabase
        .from('users')
        .select(`
      id,
      email,
      full_name,
      clinic_id,
      role,
      is_active,
      created_at,
      updated_at,
      clinics (
        id,
        name,
        plan_type,
        plan_limits,
        is_active,
        logo_url,
        primary_color,
        created_at,
        updated_at
      )
    `)
        .eq('id', userId)
        .single()

    if (error) throw new Error(`Failed to fetch user with clinic: ${error.message}`)
    if (!data) throw new Error('User not found')

    // Flatten nested clinic
    const clinic = Array.isArray(data.clinics) ? data.clinics[0] : data.clinics

    return {
        ...data,
        clinic: clinic as StrictClinic
    } as UserWithClinic
}

// ============================================================================
// PLAN VALIDATION
// ============================================================================

export async function getUserPlan(
    supabase: TypedSupabaseClient,
    userId: string
): Promise<PlanType> {
    const user = await getUserWithClinic(supabase, userId)
    return user.clinic.plan_type
}

export async function validatePlanAccess(
    supabase: TypedSupabaseClient,
    userId: string,
    requiredPlan: PlanType
): Promise<boolean> {
    const userPlan = await getUserPlan(supabase, userId)

    const planTiers = {
        'BASIC': 1,
        'PRO': 2,
        'ENTERPRISE': 3
    }

    return planTiers[userPlan] >= planTiers[requiredPlan]
}

// ============================================================================
// APPOINTMENTS
// ============================================================================

export async function getClinicAppointments(
    supabase: TypedSupabaseClient,
    clinicId: string,
    limit: number = 50
) {
    const { data, error } = await supabase
        .from('appointments')
        .select(`
      *,
      doctor:doctors(id, full_name, crm),
      patient:patients(id, full_name, phone, email)
    `)
        .eq('clinic_id', clinicId)
        .order('appointment_date', { ascending: false })
        .limit(limit)

    if (error) throw new Error(`Failed to fetch appointments: ${error.message}`)

    return data
}

// ============================================================================
// CONSULTATIONS
// ============================================================================

export async function getConsultation(
    supabase: TypedSupabaseClient,
    consultationId: string
) {
    const { data, error } = await supabase
        .from('consultations')
        .select(`
      *,
      doctor:doctors(id, full_name),
      patient:patients(id, full_name),
      clinic:clinics(id, name, plan_type)
    `)
        .eq('id', consultationId)
        .single()

    if (error) throw new Error(`Failed to fetch consultation: ${error.message}`)
    if (!data) throw new Error('Consultation not found')

    return data
}

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

export async function getActiveSubscription(
    supabase: TypedSupabaseClient,
    clinicId: string
) {
    const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('status', 'ACTIVE')
        .single()

    if (error && error.code !== 'PGRST116') { // Not found é ok
        throw new Error(`Failed to fetch subscription: ${error.message}`)
    }

    return data
}

// ============================================================================
// TYPE-SAFE AUDIT LOG
// ============================================================================

export async function logAuditEvent(
    supabase: TypedSupabaseClient,
    params: {
        action: 'CREATE' | 'UPDATE' | 'DELETE' | 'EXPORT' | 'ACCESS'
        tableName: string
        recordId?: string
        oldData?: Record<string, any>
        newData?: Record<string, any>
        metadata?: Record<string, any>
    }
) {
    const { error } = await supabase.rpc('log_audit_event', {
        p_action: params.action,
        p_table_name: params.tableName,
        p_record_id: params.recordId || null,
        p_old_data: params.oldData || null,
        p_new_data: params.newData || null,
        p_metadata: params.metadata || {}
    })

    if (error) {
        console.error('Failed to log audit event:', error)
    }
}

// ============================================================================
// HELPER: Extract clinic_id from auth context
// ============================================================================

export async function getCurrentUserClinicId(
    supabase: TypedSupabaseClient
): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
        throw new Error('Not authenticated')
    }

    const userData = await getUser(supabase, user.id)
    return userData.clinic_id
}

