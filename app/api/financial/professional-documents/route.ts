import { type NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/financial/professional-documents
 * Lista documentos financeiros e notas fiscais mensais dos profissionais
 */
export async function GET(request: NextRequest) {
    try {
        let userId = request.headers.get('x-user-id')
        let userRole = request.headers.get('x-user-role')
        let userClinicId = request.headers.get('x-clinic-id')

        const authClient = await createClient()
        if (!userId) {
            const { data: { user } } = await authClient.auth.getUser()
            if (user) {
                userId = user.id
                const { data: profile } = await authClient
                    .from('users')
                    .select('role, clinic_id')
                    .eq('id', user.id)
                    .single()
                if (profile) {
                    userRole = (profile as any).role
                    userClinicId = (profile as any).clinic_id
                }
            }
        }

        if (!userId || !userClinicId) {
            return NextResponse.json({ error: 'Não autorizado ou clínica não identificada' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const monthReference = searchParams.get('month_reference') // 'YYYY-MM'
        const doctorId = searchParams.get('doctor_id')
        const status = searchParams.get('status')
        const year = searchParams.get('year')

        // Administradores e recepção usam service role para evitar RLS restritivo; doutores usam client seguro
        const isAdmin = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'].includes(userRole || '')
        const supabase: any = isAdmin ? createServiceRoleClient() : authClient

        // Se for DOCTOR não admin, descobre o doctor_id dele
        let targetDoctorId = doctorId
        if (!isAdmin && userRole === 'DOCTOR') {
            const { data: doctorRecord } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', userId)
                .single()
            if (doctorRecord) {
                targetDoctorId = (doctorRecord as any).id
            } else {
                return NextResponse.json({ error: 'Perfil de profissional não encontrado' }, { status: 404 })
            }
        }

        let query = supabase
            .from('professional_financial_documents')
            .select(`
                *,
                doctor:doctors (
                    id,
                    specialty,
                    crm,
                    user:users (
                        id,
                        full_name,
                        email,
                        avatar_url,
                        phone
                    )
                )
            `)
            .eq('clinic_id', userClinicId)

        if (monthReference) {
            query = query.eq('month_reference', monthReference)
        }
        if (year) {
            query = query.eq('year', parseInt(year, 10))
        }
        if (targetDoctorId) {
            query = query.eq('doctor_id', targetDoctorId)
        }
        if (status && status !== 'ALL') {
            query = query.eq('status', status)
        }

        query = query.order('created_at', { ascending: false })

        const { data: documents, error } = await query

        if (error) {
            console.error('Erro ao buscar documentos financeiros:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        // Se a requisição for para um mês específico e o solicitante for admin,
        // retornamos também a lista de todos os profissionais ativos da clínica para saber quem ainda não tem demonstrativo
        let allDoctors: any[] = []
        if (isAdmin) {
            const { data: doctorsData } = await supabase
                .from('doctors')
                .select(`
                    id,
                    specialty,
                    crm,
                    is_active,
                    user:users (
                        id,
                        full_name,
                        email,
                        avatar_url,
                        phone
                    )
                `)
                .eq('clinic_id', userClinicId)
                .order('id', { ascending: true })

            allDoctors = (doctorsData || []).filter(d => d.is_active !== false)
        }

        return NextResponse.json({
            success: true,
            documents: documents || [],
            doctors: allDoctors
        })
    } catch (err: any) {
        console.error('Erro na rota GET professional-documents:', err)
        return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
    }
}

/**
 * POST /api/financial/professional-documents
 * Anexar Demonstrativo Financeiro (Clínica) ou Anexar Nota Fiscal (Profissional)
 */
export async function POST(request: NextRequest) {
    try {
        let userId = request.headers.get('x-user-id')
        let userRole = request.headers.get('x-user-role')
        let userClinicId = request.headers.get('x-clinic-id')

        const authClient = await createClient()
        if (!userId) {
            const { data: { user } } = await authClient.auth.getUser()
            if (user) {
                userId = user.id
                const { data: profile } = await authClient
                    .from('users')
                    .select('role, clinic_id')
                    .eq('id', user.id)
                    .single()
                if (profile) {
                    userRole = (profile as any).role
                    userClinicId = (profile as any).clinic_id
                }
            }
        }

        if (!userId || !userClinicId) {
            return NextResponse.json({ error: 'Não autorizado ou clínica não identificada' }, { status: 401 })
        }

        const isAdmin = ['SUPER_ADMIN', 'CLINIC_ADMIN', 'RECEPTIONIST'].includes(userRole || '')
        const supabase: any = createServiceRoleClient()

        const formData = await request.formData()
        const action = (formData.get('action') as string) || 'UPLOAD_STATEMENT'
        let doctorId = formData.get('doctor_id') as string
        const monthReference = formData.get('month_reference') as string // 'YYYY-MM'
        const file = formData.get('file') as File | null

        if (!monthReference || !monthReference.includes('-')) {
            return NextResponse.json({ error: 'Mês de referência inválido (formato esperado: YYYY-MM)' }, { status: 400 })
        }

        // Se for DOCTOR fazendo upload da própria NF
        if (!isAdmin) {
            const { data: doctorRecord } = await supabase
                .from('doctors')
                .select('id')
                .eq('user_id', userId)
                .single()
            if (!doctorRecord) {
                return NextResponse.json({ error: 'Perfil de médico/terapeuta não encontrado' }, { status: 403 })
            }
            doctorId = (doctorRecord as any).id
        }

        if (!doctorId) {
            return NextResponse.json({ error: 'Profissional (doctor_id) não informado' }, { status: 400 })
        }

        const [yearStr, monthStr] = monthReference.split('-')
        const year = parseInt(yearStr, 10)
        const month = parseInt(monthStr, 10)

        // Upload de arquivo para o Storage (se fornecido)
        let fileUrl = ''
        let fileName = ''
        if (file && typeof file === 'object' && file.size > 0) {
            const fileExt = (file.name.split('.').pop() || 'pdf').toLowerCase()
            const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
            const storagePath = `${userClinicId}/${doctorId}/${monthReference}/${action}_${Date.now()}_${sanitizedName}`
            
            const arrayBuffer = await file.arrayBuffer()
            const buffer = Buffer.from(arrayBuffer)

            const { error: uploadError } = await supabase.storage
                .from('financial-documents')
                .upload(storagePath, buffer, {
                    contentType: file.type || 'application/octet-stream',
                    upsert: true
                })

            if (uploadError) {
                console.error('Erro ao fazer upload do documento:', uploadError)
                return NextResponse.json({ error: 'Erro ao salvar arquivo no servidor de storage' }, { status: 500 })
            }

            const { data: publicData } = supabase.storage
                .from('financial-documents')
                .getPublicUrl(storagePath)

            fileUrl = publicData?.publicUrl || storagePath
            fileName = file.name
        }

        if (action === 'UPLOAD_STATEMENT') {
            // Apenas administradores e recepção podem anexar demonstrativo financeiro
            if (!isAdmin) {
                return NextResponse.json({ error: 'Apenas a administração da clínica pode anexar demonstrativos' }, { status: 403 })
            }

            const statementAmount = parseFloat((formData.get('statement_amount') as string) || '0')
            const statementGrossAmount = parseFloat((formData.get('statement_gross_amount') as string) || '0')
            const statementDeductions = parseFloat((formData.get('statement_deductions') as string) || '0')
            const statementNotes = (formData.get('statement_notes') as string) || ''

            const recordData: any = {
                clinic_id: userClinicId,
                doctor_id: doctorId,
                month_reference: monthReference,
                year,
                month,
                statement_amount: statementAmount,
                statement_gross_amount: statementGrossAmount,
                statement_deductions: statementDeductions,
                statement_notes: statementNotes,
                statement_uploaded_at: new Date().toISOString(),
                statement_uploaded_by: userId,
                updated_at: new Date().toISOString()
            }

            if (fileUrl) {
                recordData.statement_file_url = fileUrl
                recordData.statement_file_name = fileName
            }

            // Se ainda não tinha NF, status fica aguardando NF
            const { data: existing } = await supabase
                .from('professional_financial_documents')
                .select('id, status, invoice_file_url')
                .eq('clinic_id', userClinicId)
                .eq('doctor_id', doctorId)
                .eq('month_reference', monthReference)
                .single()

            if (!existing || existing.status === 'PENDING_INVOICE' || existing.status === 'NO_STATEMENT') {
                recordData.status = 'PENDING_INVOICE'
            }

            const { data: saved, error: saveErr } = await supabase
                .from('professional_financial_documents')
                .upsert(recordData, { onConflict: 'clinic_id,doctor_id,month_reference' })
                .select()
                .single()

            if (saveErr) {
                console.error('Erro ao salvar demonstrativo:', saveErr)
                return NextResponse.json({ error: saveErr.message }, { status: 500 })
            }

            return NextResponse.json({
                success: true,
                message: 'Demonstrativo financeiro anexado com sucesso!',
                document: saved
            })
        } else if (action === 'UPLOAD_INVOICE') {
            // Upload de Nota Fiscal pelo profissional (ou admin auxiliando)
            const invoiceNumber = (formData.get('invoice_number') as string) || ''
            const invoiceAmount = parseFloat((formData.get('invoice_amount') as string) || '0')
            const invoiceIssueDate = (formData.get('invoice_issue_date') as string) || null

            if (!fileUrl) {
                // Se não enviou arquivo novo, checa se já tinha um
                const { data: existing } = await supabase
                    .from('professional_financial_documents')
                    .select('invoice_file_url')
                    .eq('clinic_id', userClinicId)
                    .eq('doctor_id', doctorId)
                    .eq('month_reference', monthReference)
                    .single()

                if (!(existing as any)?.invoice_file_url) {
                    return NextResponse.json({ error: 'É necessário anexar o arquivo da Nota Fiscal (PDF ou XML)' }, { status: 400 })
                }
            }

            const updateData: any = {
                clinic_id: userClinicId,
                doctor_id: doctorId,
                month_reference: monthReference,
                year,
                month,
                invoice_number: invoiceNumber,
                invoice_amount: invoiceAmount,
                invoice_issue_date: invoiceIssueDate || new Date().toISOString().split('T')[0],
                invoice_uploaded_at: new Date().toISOString(),
                invoice_uploaded_by: userId,
                status: 'INVOICE_SENT',
                rejection_reason: null, // Limpa motivo caso tenha sido rejeitada anteriormente
                updated_at: new Date().toISOString()
            }

            if (fileUrl) {
                updateData.invoice_file_url = fileUrl
                updateData.invoice_file_name = fileName
            }

            const { data: saved, error: saveErr } = await supabase
                .from('professional_financial_documents')
                .upsert(updateData, { onConflict: 'clinic_id,doctor_id,month_reference' })
                .select()
                .single()

            if (saveErr) {
                console.error('Erro ao salvar nota fiscal:', saveErr)
                return NextResponse.json({ error: saveErr.message }, { status: 500 })
            }

            // Disparo de notificação in-app para os administradores e setor financeiro da clínica
            try {
                const { data: doctorInfo } = await supabase
                    .from('doctors')
                    .select('specialty, user:user_id(full_name)')
                    .eq('id', doctorId)
                    .single()

                const doctorName = (doctorInfo as any)?.user?.full_name || 'Profissional'
                const doctorSpecialty = (doctorInfo as any)?.specialty ? ` (${(doctorInfo as any).specialty})` : ''
                const periodLabel = monthReference ? ` referente a ${monthStr}/${yearStr}` : ''
                const notificationTitle = 'Nota Fiscal Anexada'
                const notificationMessage = `${doctorName}${doctorSpecialty} anexou a nota fiscal${periodLabel}.`

                // Buscar admins e financeiro exclusivamente da mesma clínica (isolamento multi-tenant)
                const { data: adminUsers } = await supabase
                    .from('users')
                    .select('id')
                    .eq('clinic_id', userClinicId)
                    .in('role', ['CLINIC_ADMIN', 'FINANCIAL', 'SUPER_ADMIN'])

                if (adminUsers && adminUsers.length > 0) {
                    const notificationsToInsert = adminUsers.map((u: any) => ({
                        user_id: u.id,
                        clinic_id: userClinicId,
                        title: notificationTitle,
                        message: notificationMessage,
                        type: 'FINANCIAL_INVOICE',
                        read: false,
                        link: '/dashboard/financial/notas-demonstrativos',
                        metadata: {
                            doctor_id: doctorId,
                            month_reference: monthReference,
                            document_id: (saved as any)?.id,
                            action: 'UPLOAD_INVOICE'
                        }
                    }))

                    const { error: notifErr } = await supabase
                        .from('notifications')
                        .insert(notificationsToInsert)

                    if (notifErr) {
                        console.error('Aviso ao registrar notificações financeiras:', notifErr)
                    }
                }
            } catch (notifException) {
                console.error('Erro no fluxo de notificação de nota fiscal:', notifException)
            }

            return NextResponse.json({
                success: true,
                message: 'Nota Fiscal enviada com sucesso para conferência!',
                document: saved
            })
        } else {
            return NextResponse.json({ error: 'Ação não reconhecida' }, { status: 400 })
        }
    } catch (err: any) {
        console.error('Erro no POST professional-documents:', err)
        return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
    }
}
