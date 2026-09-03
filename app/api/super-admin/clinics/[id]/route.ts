/**
 * DELETE /api/super-admin/clinics/[id]
 * Delete a clinic (SUPER_ADMIN only)
 * WARNING: This will cascade delete all related data
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { PLANS, type PlanType } from '@/lib/constants/plans'

interface RouteParams {
    params: Promise<{ id: string }>
}

export async function GET(request: NextRequest) {
    return NextResponse.json({ message: 'Route exists. Use DELETE to remove checking.' })
}

export async function OPTIONS(request: NextRequest) {
    return new NextResponse(null, {
        status: 200,
        headers: {
            'Allow': 'DELETE, GET, PATCH, OPTIONS',
            'Access-Control-Allow-Methods': 'DELETE, GET, PATCH, OPTIONS',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id, x-user-role, x-clinic-id, x-plan-type'
        },
    })
}

/**
 * PATCH /api/super-admin/clinics/[id]
 * Activate a clinic plan manually (removes trial status)
 * SUPER_ADMIN only
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    try {
        const { id: clinicId } = await params
        const body = await request.json()
        const { action } = body

        // Check SUPER_ADMIN access
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData || (userData as { role: string }).role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden - Super Admin only' }, { status: 403 })
        }

        const serviceSupabase = createServiceRoleClient()

        if (action === 'activate_plan') {
            // Get current clinic data
            const { data: clinic } = await serviceSupabase
                .from('clinics')
                .select('name, approval_status, plan_type')
                .eq('id', clinicId)
                .single()

            if (!clinic) {
                return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
            }

            const planType = body.plan_type || (clinic as any).plan_type || 'BASICO'

            // Activate the clinic: remove trial, set active
            const { error: updateError } = await serviceSupabase
                .from('clinics')
                .update({
                    approval_status: 'active',
                    trial_ends_at: null,
                    is_active: true,
                    plan_type: planType,
                    plan_limits: PLANS[planType as PlanType]?.limits || PLANS.BASICO.limits,
                })
                .eq('id', clinicId)

            if (updateError) {
                console.error('[PATCH clinics/[id]] Update error:', updateError)
                return NextResponse.json({ error: 'Failed to activate clinic' }, { status: 500 })
            }

            // Audit log
            await serviceSupabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'TRIAL_MANUALLY_ACTIVATED',
                resource_type: 'CLINIC',
                resource_id: clinicId,
                metadata: {
                    clinic_name: (clinic as any).name,
                    previous_status: (clinic as any).approval_status,
                    new_status: 'active',
                    plan_type: planType,
                    activated_at: new Date().toISOString(),
                },
                created_at: new Date().toISOString(),
            })

            return NextResponse.json({
                success: true,
                message: `Clínica "${(clinic as any).name}" ativada com sucesso. Trial removido.`,
            })
        }

        // ============================================
        // BLOCK CLINIC (manual by super admin)
        // ============================================
        if (action === 'block_clinic') {
            const reason = body.reason || 'Bloqueio manual pelo administrador'

            const { data: clinic } = await serviceSupabase
                .from('clinics')
                .select('name, is_active')
                .eq('id', clinicId)
                .single()

            if (!clinic) {
                return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
            }

            if (!(clinic as any).is_active) {
                return NextResponse.json({ error: 'Clínica já está bloqueada' }, { status: 400 })
            }

            const { error: updateError } = await serviceSupabase
                .from('clinics')
                .update({
                    is_active: false,
                    blocked_at: new Date().toISOString(),
                    blocked_reason: reason,
                    blocked_by: user.id,
                    updated_at: new Date().toISOString(),
                } as any)
                .eq('id', clinicId)

            if (updateError) {
                console.error('[PATCH clinics/[id]] Block error:', updateError)
                return NextResponse.json({ error: 'Failed to block clinic' }, { status: 500 })
            }

            // Notify clinic
            await serviceSupabase.from('billing_notifications').insert({
                clinic_id: clinicId,
                type: 'ACCESS_BLOCKED',
                title: '⚠️ Acesso ao sistema bloqueado',
                message: `O acesso da sua clínica ao CliniGo foi suspenso. Motivo: ${reason}. Entre em contato para regularizar sua situação.`,
                priority: 'URGENT',
            } as any)

            // Audit log
            await serviceSupabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'CLINIC_BLOCKED',
                resource_type: 'CLINIC',
                resource_id: clinicId,
                metadata: {
                    clinic_name: (clinic as any).name,
                    reason,
                    blocked_at: new Date().toISOString(),
                },
                created_at: new Date().toISOString(),
            })

            return NextResponse.json({
                success: true,
                message: `Clínica "${(clinic as any).name}" bloqueada com sucesso.`,
            })
        }

        // ============================================
        // MARK PAID (manual by super admin)
        // ============================================
        if (action === 'mark_paid') {
            const { data: clinic } = await serviceSupabase
                .from('clinics')
                .select('name, is_active, subscription_due_date')
                .eq('id', clinicId)
                .single()

            if (!clinic) {
                return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
            }

            const dueDateStr = (clinic as any).subscription_due_date;
            const currentDueDate = dueDateStr ? new Date(dueDateStr) : new Date();
            const newDueDate = new Date();
            
            // Se o vencimento for no futuro, incrementa a partir do vencimento.
            // Se for no passado (atrasado), incrementa a partir de hoje.
            if (currentDueDate > new Date()) {
                newDueDate.setTime(currentDueDate.getTime());
            }
            newDueDate.setMonth(newDueDate.getMonth() + 1);

            const { error: updateError } = await serviceSupabase
                .from('clinics')
                .update({
                    payment_confirmed: true,
                    payment_confirmed_at: new Date().toISOString(),
                    payment_status: 'ACTIVE',
                    is_active: true,
                    approval_status: 'active',
                    last_payment_date: new Date().toISOString(),
                    subscription_due_date: newDueDate.toISOString(),
                    blocked_at: null,
                    blocked_reason: null,
                    blocked_by: null,
                    updated_at: new Date().toISOString()
                } as any)
                .eq('id', clinicId)

            if (updateError) {
                console.error('[PATCH clinics/[id]] Mark Paid error:', updateError)
                return NextResponse.json({ error: 'Failed to mark as paid' }, { status: 500 })
            }

            // Audit log
            await serviceSupabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'MANUAL_PAYMENT_CONFIRMATION',
                resource_type: 'CLINIC',
                resource_id: clinicId,
                metadata: {
                    clinic_name: (clinic as any).name,
                    new_due_date: newDueDate.toISOString(),
                    marked_at: new Date().toISOString(),
                },
                created_at: new Date().toISOString(),
            })

            // Fix for Issue: Ensure manual payments appear in the clinic's payment history
            try {
                await serviceSupabase.from('payment_logs').insert({
                    clinic_id: clinicId,
                    payment_id: `manual_${Date.now()}`,
                    payment_method: 'MANUAL',
                    amount: 0,
                    status: 'APPROVED',
                    mercadopago_status: 'approved',
                    raw_webhook_data: { source: 'super_admin_manual' },
                    email_sent: false,
                })
            } catch (logError) {
                console.error('[PATCH clinics/[id]] Payment log error:', logError)
            }

            return NextResponse.json({
                success: true,
                message: `Pagamento da clínica "${(clinic as any).name}" confirmado. Renovada até ${newDueDate.toLocaleDateString('pt-BR')}.`,
            })
        }

        // ============================================
        // UNBLOCK CLINIC (manual by super admin)
        // ============================================
        if (action === 'unblock_clinic') {
            const { data: clinic } = await serviceSupabase
                .from('clinics')
                .select('name, is_active')
                .eq('id', clinicId)
                .single()

            if (!clinic) {
                return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })
            }

            if ((clinic as any).is_active) {
                return NextResponse.json({ error: 'Clínica já está ativa' }, { status: 400 })
            }

            const { error: updateError } = await serviceSupabase
                .from('clinics')
                .update({
                    is_active: true,
                    blocked_at: null,
                    blocked_reason: null,
                    blocked_by: null,
                    updated_at: new Date().toISOString(),
                } as any)
                .eq('id', clinicId)

            if (updateError) {
                console.error('[PATCH clinics/[id]] Unblock error:', updateError)
                return NextResponse.json({ error: 'Failed to unblock clinic' }, { status: 500 })
            }

            // Notify clinic
            await serviceSupabase.from('billing_notifications').insert({
                clinic_id: clinicId,
                type: 'ACCESS_RESTORED',
                title: '✅ Acesso ao sistema restaurado',
                message: 'O acesso da sua clínica ao CliniGo foi restaurado. Obrigado por regularizar sua situação!',
                priority: 'HIGH',
            } as any)

            // Audit log
            await serviceSupabase.from('audit_logs').insert({
                user_id: user.id,
                action: 'CLINIC_UNBLOCKED',
                resource_type: 'CLINIC',
                resource_id: clinicId,
                metadata: {
                    clinic_name: (clinic as any).name,
                    unblocked_at: new Date().toISOString(),
                },
                created_at: new Date().toISOString(),
            })

            return NextResponse.json({
                success: true,
                message: `Clínica "${(clinic as any).name}" desbloqueada com sucesso.`,
            })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('[PATCH clinics/[id]] Error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    console.log('[DELETE /api/super-admin/clinics/[id]] HIT')
    try {
        const { id: clinicId } = await params
        console.log('[DELETE /api/super-admin/clinics/[id]] clinicId:', clinicId)

        // Check SUPER_ADMIN access
        const supabase = await createClient()
        const {
            data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            )
        }

        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData || (userData as { role: string }).role !== 'SUPER_ADMIN') {
            return NextResponse.json(
                { error: 'Forbidden - Super Admin only' },
                { status: 403 }
            )
        }

        // Get clinic name for audit log
        const { data: clinic } = await supabase
            .from('clinics')
            .select('name')
            .eq('id', clinicId)
            .single()

        const clinicData = clinic as { name: string } | null
        if (!clinicData) {
            return NextResponse.json(
                { error: 'Clinic not found' },
                { status: 404 }
            )
        }

        // Use service role client to delete (bypasses RLS)  
        const serviceSupabase = createServiceRoleClient()

        // STEP 1: Get all user IDs from this clinic
        const { data: clinicUsers, error: usersError } = await serviceSupabase
            .from('users')
            .select('id')
            .eq('clinic_id', clinicId)

        if (usersError) {
            console.error('Error fetching clinic users:', usersError)
        }

        // STEP 2: Delete users from auth.users (using Admin API)
        // This frees up the emails for re-registration
        if (clinicUsers && clinicUsers.length > 0) {
            for (const clinicUser of clinicUsers) {
                try {
                    // Delete from auth.users using the service role client
                    const { error: authDeleteError } = await serviceSupabase.auth.admin.deleteUser(
                        clinicUser.id
                    )

                    if (authDeleteError) {
                        console.error(`Failed to delete auth user ${clinicUser.id}:`, authDeleteError)
                    }
                } catch (err) {
                    console.error(`Error deleting auth user ${clinicUser.id}:`, err)
                }
            }
        }

        // STEP 3: Delete clinic (CASCADE will handle related records in public schema)
        const { error: deleteError } = await serviceSupabase
            .from('clinics')
            .delete()
            .eq('id', clinicId)

        if (deleteError) {
            console.error('Error deleting clinic:', deleteError)
            return NextResponse.json(
                { error: 'Failed to delete clinic' },
                { status: 500 }
            )
        }

        // Log deletion in audit_logs
        await serviceSupabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'CLINIC_DELETED',
            resource_type: 'CLINIC',
            resource_id: clinicId,
            metadata: {
                clinic_name: clinicData.name,
                deleted_at: new Date().toISOString(),
            },
            created_at: new Date().toISOString(),
        })

        return NextResponse.json({
            success: true,
            message: `Clínica "${clinicData.name}" deletada com sucesso`,
        })
    } catch (error) {
        console.error('Error deleting clinic:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}
