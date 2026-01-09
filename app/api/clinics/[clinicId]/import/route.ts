/**
 * CSV Import API - Enterprise Feature
 * POST /api/clinics/[clinicId]/import
 * 
 * Accepts multipart/form-data with:
 * - file: CSV file
 * - type: 'patients' | 'doctors'
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { importPatients, importDoctors } from '@/lib/services/csv-import'
import { hasFeature } from '@/lib/constants/plan-features'
import { type PlanType } from '@/lib/constants/plans'

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ clinicId: string }> }
) {
    try {
        const { clinicId } = await params
        const supabase = await createClient()

        // Verify authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json(
                { error: 'Não autorizado' },
                { status: 401 }
            )
        }

        // Get user role and verify access
        const { data: profile } = await supabase
            .from('users')
            .select('role, clinic_id')
            .eq('id', user.id)
            .single()

        // Type-safe extraction for profile
        const profileData = profile as { role?: string; clinic_id?: string } | null

        if (!profileData) {
            return NextResponse.json(
                { error: 'Perfil não encontrado' },
                { status: 404 }
            )
        }

        // Only CLINIC_ADMIN or SUPER_ADMIN can import
        const isSuperAdmin = user.email === 'robsonfenriz@gmail.com'
        if (profileData.role !== 'CLINIC_ADMIN' && !isSuperAdmin) {
            return NextResponse.json(
                { error: 'Apenas administradores podem importar dados' },
                { status: 403 }
            )
        }

        // Verify clinic access (unless super admin)
        if (!isSuperAdmin && profileData.clinic_id !== clinicId) {
            return NextResponse.json(
                { error: 'Acesso negado a esta clínica' },
                { status: 403 }
            )
        }

        // Get clinic plan
        const { data: clinic } = await supabase
            .from('clinics')
            .select('plan_type')
            .eq('id', clinicId)
            .single()

        // Type-safe extraction for clinic
        const clinicData = clinic as { plan_type?: string } | null

        if (!clinicData) {
            return NextResponse.json(
                { error: 'Clínica não encontrada' },
                { status: 404 }
            )
        }

        // Check if plan supports bulk import (PRO+ feature)
        const planType = (clinicData.plan_type || 'BASIC') as PlanType
        if (!hasFeature(planType, 'crm') && !isSuperAdmin) {
            return NextResponse.json(
                {
                    error: 'Importação em massa requer plano PRO ou superior',
                    code: 'PLAN_REQUIRED',
                    required_plan: 'PRO'
                },
                { status: 403 }
            )
        }

        // Parse multipart form data
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const importType = formData.get('type') as string | null

        if (!file) {
            return NextResponse.json(
                { error: 'Arquivo CSV é obrigatório' },
                { status: 400 }
            )
        }

        if (!importType || !['patients', 'doctors'].includes(importType)) {
            return NextResponse.json(
                { error: 'Tipo de importação inválido. Use: patients ou doctors' },
                { status: 400 }
            )
        }

        // Validate file type
        if (!file.name.endsWith('.csv')) {
            return NextResponse.json(
                { error: 'Apenas arquivos CSV são aceitos' },
                { status: 400 }
            )
        }

        // Read file content
        const csvContent = await file.text()

        // Process import
        let result
        if (importType === 'patients') {
            result = await importPatients(csvContent, clinicId)
        } else {
            result = await importDoctors(csvContent, clinicId)
        }

        // Log the import action (silently fail if audit_logs has type issues)
        try {
            await (supabase.from('audit_logs') as any).insert({
                user_id: user.id,
                clinic_id: clinicId,
                action: `IMPORT_${importType.toUpperCase()}`,
                details: JSON.stringify({
                    total: result.total,
                    imported: result.imported,
                    updated: result.updated,
                    failed: result.failed,
                    file_name: file.name
                }),
                ip_address: request.headers.get('x-forwarded-for') || 'unknown'
            })
        } catch (logError) {
            console.warn('Audit log failed:', logError)
        }

        return NextResponse.json({
            success: result.success,
            message: result.success
                ? `Importação concluída! ${result.imported} novos, ${result.updated} atualizados`
                : `Importação com erros: ${result.failed} falhas`,
            data: result
        })

    } catch (error) {
        console.error('CSV Import Error:', error)
        return NextResponse.json(
            { error: 'Erro interno ao processar importação' },
            { status: 500 }
        )
    }
}
