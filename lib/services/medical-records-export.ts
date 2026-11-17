import ExcelJS from 'exceljs'

export interface RawMedicalRecordRow {
    id: string
    clinic_id?: string | null
    patient_id?: string | null
    doctor_id?: string | null
    appointment_id?: string | null
    chief_complaint?: string | null
    history_present_illness?: string | null
    present_illness?: string | null
    physical_examination?: string | null
    physical_exam?: string | null
    treatment_plan?: string | null
    prescription?: string | null
    follow_up_instructions?: string | null
    signed_at?: string | null
    signed_by_patient?: boolean | null
    signature_url?: string | null
    created_at: string
    updated_at?: string | null
    patient?:
        | { id?: string | null; full_name?: string | null; cpf?: string | null }
        | Array<{ id?: string | null; full_name?: string | null; cpf?: string | null }>
        | null
    doctor?:
        | {
              id?: string | null
              specialty?: string | null
              crm?: string | null
              crm_state?: string | null
              user?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null
          }
        | Array<{
              id?: string | null
              specialty?: string | null
              crm?: string | null
              crm_state?: string | null
              user?: { full_name?: string | null } | Array<{ full_name?: string | null }> | null
          }>
        | null
    appointment?:
        | {
              id?: string | null
              appointment_date?: string | null
              appointment_time?: string | null
              status?: string | null
              session_status?: string | null
              digital_signature_at?: string | null
              digital_signature_signer?: string | null
          }
        | Array<{
              id?: string | null
              appointment_date?: string | null
              appointment_time?: string | null
              status?: string | null
              session_status?: string | null
              digital_signature_at?: string | null
              digital_signature_signer?: string | null
          }>
        | null
}

export interface ParsedEvolutionRow {
    record_id: string
    effective_date_iso: string
    data_atendimento: string
    horario: string
    paciente: string
    cpf_paciente: string
    profissional: string
    especialidade: string
    status_sessao: string
    modelo_ficha: string
    objetivo_queixa: string
    procedimentos_evolucao: string
    resposta_paciente: string
    desempenho_observado: string
    nivel_ajuda: string
    indicadores_interpretacao: string
    comparacao_anteriores: string
    conduta_plano: string
    intercorrencias: string
    orientacoes_familia: string
    detalhes_adicionais: string
    assinatura_status: string
    assinado_em: string
    assinado_por: string
    registrado_em: string
}

export interface MedicalRecordFilterOptions {
    clinicId: string | null
    startDate?: string
    endDate?: string
    doctorId?: string
    patientIds?: string[]
    includeFullContent?: boolean
    sortOrder?: 'asc' | 'desc'
}

const BRT_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
})

const BRT_DATETIME_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
})

function unwrapSingle<T>(value: T | T[] | null | undefined): T | null {
    if (!value) return null
    return Array.isArray(value) ? value[0] || null : value
}

/**
 * Converte timestamp ISO ou YYYY-MM-DD para data YYYY-MM-DD no fuso de Brasília.
 */
export function toSaoPauloDate(value: string | null | undefined): string {
    if (!value) return ''
    if (/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
        return value.trim()
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        return value.slice(0, 10)
    }
    return BRT_DATE_FORMATTER.format(parsed)
}

export function formatDateBr(value: string | null | undefined): string {
    const isoDate = toSaoPauloDate(value)
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return ''
    const [year, month, day] = isoDate.split('-')
    return `${day}/${month}/${year}`
}

export function formatDateTimeBr(value: string | null | undefined): string {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return BRT_DATETIME_FORMATTER.format(parsed)
}

export function getEffectiveRecordDate(record: RawMedicalRecordRow): string {
    const appt = unwrapSingle(record.appointment)
    if (appt?.appointment_date) {
        return toSaoPauloDate(appt.appointment_date)
    }
    return toSaoPauloDate(record.created_at)
}

export function parseFollowUpInstructions(raw: string | null | undefined): Record<string, unknown> {
    if (!raw || typeof raw !== 'string') return {}
    const trimmed = raw.trim()
    if (!trimmed.startsWith('{')) return {}
    try {
        const parsed = JSON.parse(trimmed)
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
        return {}
    }
}

function asCleanString(value: unknown): string {
    if (value === null || value === undefined) return ''
    return typeof value === 'string' ? value.trim() : String(value).trim()
}

function formatLabeledEntries(entries: Array<[string, string]>): string {
    return entries
        .filter(([, value]) => Boolean(value))
        .map(([label, value]) => `${label}: ${value}`)
        .join('\n')
}

/**
 * Normaliza um registro de medical_records (World Sensory ou modelo padrão)
 * para colunas legíveis em planilha.
 */
export function extractStructuredEvolution(record: RawMedicalRecordRow): ParsedEvolutionRow {
    const patient = unwrapSingle(record.patient)
    const doctor = unwrapSingle(record.doctor)
    const doctorUser = unwrapSingle(doctor?.user)
    const appt = unwrapSingle(record.appointment)

    const effectiveDateIso = getEffectiveRecordDate(record)
    const custom = parseFollowUpInstructions(record.follow_up_instructions)
    const rawWs = custom.worldSensoryData
    const ws = rawWs && typeof rawWs === 'object' ? (rawWs as Record<string, unknown>) : null

    const hasWorldSensoryFields = Boolean(
        ws && Object.values(ws).some((v) => asCleanString(v).length > 0)
    )

    const professionType = asCleanString(custom.professionType)
    const modeloFicha = hasWorldSensoryFields
        ? 'World Sensory'
        : professionType === 'PSICOLOGO'
          ? 'Psicologia'
          : professionType === 'TERAPEUTA'
            ? 'Terapia / Funcional'
            : professionType === 'MEDICO'
              ? 'Médico'
              : 'Padrão'

    const objetivoQueixa = hasWorldSensoryFields
        ? asCleanString(ws?.objetivo_sessao) || asCleanString(record.chief_complaint)
        : asCleanString(record.chief_complaint) || asCleanString(custom.objetivos_sessao)

    const procedimentosEvolucao = hasWorldSensoryFields
        ? asCleanString(ws?.procedimentos_realizados) ||
          asCleanString(record.history_present_illness) ||
          asCleanString(record.present_illness)
        : asCleanString(custom.evolucao_psicologica) ||
          asCleanString(custom.evolucao_funcional) ||
          asCleanString(record.history_present_illness) ||
          asCleanString(record.present_illness)

    const condutaPlano = hasWorldSensoryFields
        ? asCleanString(ws?.conduta) ||
          asCleanString(record.treatment_plan) ||
          asCleanString(record.prescription)
        : asCleanString(record.treatment_plan) || asCleanString(record.prescription)

    const orientacoesFamilia = hasWorldSensoryFields
        ? asCleanString(ws?.orientacoes_contato_familia)
        : asCleanString(custom.plano_casa) || asCleanString(custom.participacao_acompanhante)

    const extraEntries: Array<[string, string]> = [
        ['Hipótese Diagnóstica', asCleanString(custom.diagnosis_text)],
        ['Demanda', asCleanString(custom.demanda)],
        ['Avaliação Comportamental', asCleanString(custom.avaliacao_comportamental)],
        ['Testes Aplicados', asCleanString(custom.testes_aplicados)],
        ['Foco Terapêutico', asCleanString(custom.foco_terapeutico)],
        ['Fatores de Risco', asCleanString(custom.fatores_risco)],
        ['Atividades Realizadas', asCleanString(custom.atividades_realizadas)],
        ['Objetivos da Sessão', hasWorldSensoryFields ? '' : asCleanString(custom.objetivos_sessao)],
        ['Barreiras', asCleanString(custom.barreiras)],
        ['Nível de Independência', asCleanString(custom.nivel_independencia)],
        ['Participação Acompanhante', hasWorldSensoryFields ? asCleanString(custom.participacao_acompanhante) : ''],
        ['Escala de Dor', custom.escala_dor !== undefined && custom.escala_dor !== null ? asCleanString(custom.escala_dor) : ''],
        [
            'Exame Físico',
            hasWorldSensoryFields
                ? ''
                : asCleanString(record.physical_exam) || asCleanString(record.physical_examination),
        ],
        ['Alergias', asCleanString(custom.allergies)],
        ['Histórico Familiar', asCleanString(custom.family_history)],
        [
            'Sinais Vitais',
            formatLabeledEntries([
                ['Peso', asCleanString(custom.weight)],
                ['Altura', asCleanString(custom.height)],
                ['PA', asCleanString(custom.blood_pressure)],
                ['FC', asCleanString(custom.heart_rate)],
                ['Temp', asCleanString(custom.temperature)],
                ['SpO2', asCleanString(custom.oxygen_saturation)],
            ]),
        ],
    ]

    if (!record.follow_up_instructions?.trim().startsWith('{') && asCleanString(record.follow_up_instructions)) {
        extraEntries.push(['Instruções de Acompanhamento', asCleanString(record.follow_up_instructions)])
    }

    const signedAtRaw = appt?.digital_signature_at || record.signed_at || null
    const assinaturaStatus = signedAtRaw
        ? 'Assinado Digitalmente'
        : record.signed_by_patient
          ? 'Assinado pelo Paciente'
          : 'Não assinado'

    const statusSessao = [appt?.session_status, appt?.status].filter(Boolean).join(' / ')

    return {
        record_id: record.id,
        effective_date_iso: effectiveDateIso,
        data_atendimento: formatDateBr(effectiveDateIso),
        horario: appt?.appointment_time ? appt.appointment_time.slice(0, 5) : '',
        paciente: asCleanString(patient?.full_name) || 'Paciente não identificado',
        cpf_paciente: asCleanString(patient?.cpf),
        profissional: asCleanString(doctorUser?.full_name) || 'Profissional não identificado',
        especialidade: asCleanString(doctor?.specialty),
        status_sessao: statusSessao,
        modelo_ficha: modeloFicha,
        objetivo_queixa: objetivoQueixa,
        procedimentos_evolucao: procedimentosEvolucao,
        resposta_paciente: asCleanString(ws?.resposta_paciente_geral),
        desempenho_observado: asCleanString(ws?.desempenho_observado),
        nivel_ajuda: asCleanString(ws?.nivel_ajuda_necessario),
        indicadores_interpretacao: asCleanString(ws?.interpretacao_dados_indicam),
        comparacao_anteriores: asCleanString(ws?.interpretacao_comparacao_anteriores),
        conduta_plano: condutaPlano,
        intercorrencias: asCleanString(ws?.intercorrencias),
        orientacoes_familia: orientacoesFamilia,
        detalhes_adicionais: formatLabeledEntries(extraEntries),
        assinatura_status: assinaturaStatus,
        assinado_em: formatDateTimeBr(signedAtRaw),
        assinado_por: asCleanString(appt?.digital_signature_signer),
        registrado_em: formatDateTimeBr(record.created_at),
    }
}

export function filterAndSortMedicalRecords(
    records: RawMedicalRecordRow[],
    options: Pick<MedicalRecordFilterOptions, 'startDate' | 'endDate' | 'doctorId' | 'patientIds' | 'sortOrder'>
): RawMedicalRecordRow[] {
    const { startDate, endDate, doctorId, patientIds, sortOrder = 'desc' } = options
    const patientSet = patientIds ? new Set(patientIds) : null

    const filtered = records.filter((rec) => {
        if (doctorId && rec.doctor_id !== doctorId) return false
        if (patientSet && (!rec.patient_id || !patientSet.has(rec.patient_id))) return false

        if (startDate || endDate) {
            const effectiveDate = getEffectiveRecordDate(rec)
            if (!effectiveDate) return false
            if (startDate && effectiveDate < startDate) return false
            if (endDate && effectiveDate > endDate) return false
        }
        return true
    })

    return filtered.sort((a, b) => {
        const dateA = getEffectiveRecordDate(a)
        const dateB = getEffectiveRecordDate(b)
        if (dateA !== dateB) {
            return sortOrder === 'asc'
                ? dateA.localeCompare(dateB)
                : dateB.localeCompare(dateA)
        }
        const createdA = a.created_at || ''
        const createdB = b.created_at || ''
        return sortOrder === 'asc'
            ? createdA.localeCompare(createdB)
            : createdB.localeCompare(createdA)
    })
}

export interface MedicalRecordsAuthContext {
    userId: string
    clinicId: string | null
    userRole: string | null
}

/**
 * Resolve contexto autenticado via headers do middleware ou sessão Supabase.
 */
export async function resolveMedicalRecordsAuth(
    request: { headers: { get: (name: string) => string | null } },
    supabase: any
): Promise<MedicalRecordsAuthContext | null> {
    let userId = request.headers.get('x-user-id')
    let clinicId = request.headers.get('x-clinic-id')
    let userRole = request.headers.get('x-user-role')

    if (!userId || !clinicId) {
        const {
            data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
            return null
        }
        userId = user.id
        const { data: profile } = await supabase
            .from('users')
            .select('clinic_id, role')
            .eq('id', user.id)
            .maybeSingle()

        const metadata = (user.user_metadata || {}) as Record<string, unknown>
        clinicId = clinicId || profile?.clinic_id || (metadata.clinic_id as string | undefined) || null
        userRole = userRole || profile?.role || (metadata.role as string | undefined) || null
    }

    if (!userId) return null

    return {
        userId,
        clinicId: clinicId || null,
        userRole: userRole || null,
    }
}

/**
 * Busca IDs de pacientes da clínica cujo nome corresponde ao termo pesquisado.
 */
export async function resolveMatchingPatientIds(
    supabase: any,
    params: { search: string; clinicId: string | null; userRole: string | null }
): Promise<string[]> {
    let patientSearchQuery = supabase
        .from('patients')
        .select('id')
        .ilike('full_name', `%${params.search}%`)
        .limit(100)

    if (params.clinicId && params.userRole !== 'SUPER_ADMIN') {
        patientSearchQuery = patientSearchQuery.eq('clinic_id', params.clinicId)
    }

    const { data: matchedPatients, error } = await patientSearchQuery
    if (error) {
        throw new Error(`Failed to search patients: ${error.message}`)
    }

    return (matchedPatients || []).map((p: { id?: string }) => p.id).filter(Boolean) as string[]
}

const LIST_SELECT = `
    id,
    patient_id,
    doctor_id,
    created_at,
    chief_complaint,
    diagnosis,
    treatment_plan,
    signed_by_patient,
    signed_at,
    signature_url,
    patient:patients(
        id,
        full_name
    ),
    doctor:doctors(
        id,
        specialty,
        user:users(
            full_name
        )
    ),
    appointment:appointments(
        id,
        appointment_date,
        appointment_time
    )
`

const EXPORT_SELECT = `
    id,
    clinic_id,
    patient_id,
    doctor_id,
    appointment_id,
    chief_complaint,
    history_present_illness,
    present_illness,
    physical_examination,
    physical_exam,
    treatment_plan,
    prescription,
    follow_up_instructions,
    signed_at,
    signed_by_patient,
    created_at,
    updated_at,
    patient:patients(
        id,
        full_name,
        cpf
    ),
    doctor:doctors(
        id,
        specialty,
        crm,
        crm_state,
        user:users(
            full_name
        )
    ),
    appointment:appointments(
        id,
        appointment_date,
        appointment_time,
        status,
        session_status,
        digital_signature_at,
        digital_signature_signer
    )
`

/**
 * Busca paginada de prontuários/evoluções da clínica e aplica filtro
 * pela data efetiva do atendimento (appointment_date || created_at em BRT).
 */
export async function fetchFilteredClinicMedicalRecords(
    supabase: any,
    options: MedicalRecordFilterOptions
): Promise<RawMedicalRecordRow[]> {
    const batchSize = 1000
    const allRows: RawMedicalRecordRow[] = []
    let from = 0

    while (true) {
        let query = supabase
            .from('medical_records')
            .select(options.includeFullContent ? EXPORT_SELECT : LIST_SELECT)
            .order('created_at', { ascending: false })
            .range(from, from + batchSize - 1)

        if (options.clinicId) {
            query = query.eq('clinic_id', options.clinicId)
        }
        if (options.doctorId) {
            query = query.eq('doctor_id', options.doctorId)
        }
        if (options.patientIds && options.patientIds.length > 0) {
            query = query.in('patient_id', options.patientIds)
        }

        const { data, error } = await query
        if (error) {
            throw new Error(error.message || 'Erro ao consultar evoluções no banco')
        }

        const rows = (data || []) as RawMedicalRecordRow[]
        allRows.push(...rows)

        if (rows.length < batchSize) break
        from += batchSize
    }

    return filterAndSortMedicalRecords(allRows, {
        startDate: options.startDate,
        endDate: options.endDate,
        doctorId: options.doctorId,
        patientIds: options.patientIds,
        sortOrder: options.sortOrder || 'desc',
    })
}

const EXCEL_COLUMNS: Array<{ header: string; key: keyof ParsedEvolutionRow; width: number; wrap?: boolean }> = [
    { header: 'Data Atendimento', key: 'data_atendimento', width: 16 },
    { header: 'Horário', key: 'horario', width: 10 },
    { header: 'Paciente', key: 'paciente', width: 32 },
    { header: 'CPF Paciente', key: 'cpf_paciente', width: 16 },
    { header: 'Profissional', key: 'profissional', width: 30 },
    { header: 'Especialidade', key: 'especialidade', width: 22 },
    { header: 'Status Sessão', key: 'status_sessao', width: 20 },
    { header: 'Modelo Ficha', key: 'modelo_ficha', width: 16 },
    { header: 'Objetivo da Sessão / Queixa', key: 'objetivo_queixa', width: 42, wrap: true },
    { header: 'Procedimentos / Evolução', key: 'procedimentos_evolucao', width: 52, wrap: true },
    { header: 'Resposta do Paciente', key: 'resposta_paciente', width: 36, wrap: true },
    { header: 'Desempenho Observado', key: 'desempenho_observado', width: 38, wrap: true },
    { header: 'Nível de Ajuda Necessário', key: 'nivel_ajuda', width: 28, wrap: true },
    { header: 'Indicadores (Interpretação)', key: 'indicadores_interpretacao', width: 38, wrap: true },
    { header: 'Comparação Sessões Anteriores', key: 'comparacao_anteriores', width: 38, wrap: true },
    { header: 'Conduta / Plano Terapêutico', key: 'conduta_plano', width: 42, wrap: true },
    { header: 'Intercorrências', key: 'intercorrencias', width: 30, wrap: true },
    { header: 'Orientações à Família', key: 'orientacoes_familia', width: 38, wrap: true },
    { header: 'Detalhes Complementares', key: 'detalhes_adicionais', width: 38, wrap: true },
    { header: 'Assinatura', key: 'assinatura_status', width: 20 },
    { header: 'Assinado em', key: 'assinado_em', width: 18 },
    { header: 'Assinado por', key: 'assinado_por', width: 28 },
    { header: 'Registrado em (BRT)', key: 'registrado_em', width: 18 },
    { header: 'ID Prontuário', key: 'record_id', width: 38 },
]

export async function buildMedicalRecordsExcelBuffer(params: {
    clinicName: string
    periodLabel: string
    records: RawMedicalRecordRow[]
    generatedAt?: Date
}): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'CliniGo'
    workbook.created = params.generatedAt || new Date()

    const parsedRows = params.records.map(extractStructuredEvolution)

    // Aba 1: Evoluções completas
    const sheet = workbook.addWorksheet('Evoluções', {
        views: [{ state: 'frozen', ySplit: 1 }],
    })

    sheet.columns = EXCEL_COLUMNS.map((col) => ({
        header: col.header,
        key: col.key,
        width: col.width,
    }))

    const headerRow = sheet.getRow(1)
    headerRow.height = 28
    headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1E293B' },
        }
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
        cell.border = {
            bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        }
    })

    sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: EXCEL_COLUMNS.length },
    }

    const byMonth = new Map<string, number>()
    const byDoctor = new Map<string, number>()

    parsedRows.forEach((row, index) => {
        const excelRow = sheet.addRow(row)
        const monthKey = row.effective_date_iso ? row.effective_date_iso.slice(0, 7) : 'Sem data'
        byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + 1)
        byDoctor.set(row.profissional, (byDoctor.get(row.profissional) || 0) + 1)

        excelRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const colDef = EXCEL_COLUMNS[colNumber - 1]
            cell.alignment = {
                vertical: 'top',
                horizontal: 'left',
                wrapText: Boolean(colDef?.wrap),
            }
            if (index % 2 === 1) {
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF8FAFC' },
                }
            }
        })
    })

    // Aba 2: Resumo gerencial do arquivo exportado
    const summarySheet = workbook.addWorksheet('Resumo')
    summarySheet.columns = [
        { header: 'Indicador', key: 'label', width: 38 },
        { header: 'Valor', key: 'value', width: 32 },
    ]
    const summaryHeader = summarySheet.getRow(1)
    summaryHeader.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
    })

    summarySheet.addRow({ label: 'Clínica', value: params.clinicName })
    summarySheet.addRow({ label: 'Período Exportado', value: params.periodLabel })
    summarySheet.addRow({
        label: 'Gerado em (BRT)',
        value: formatDateTimeBr((params.generatedAt || new Date()).toISOString()),
    })
    summarySheet.addRow({ label: 'Total de Evoluções Exportadas', value: parsedRows.length })
    summarySheet.addRow({ label: '', value: '' })
    summarySheet.addRow({ label: 'Distribuição por Mês', value: 'Quantidade' }).font = { bold: true }

    Array.from(byMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([month, total]) => {
            const [y, m] = month.split('-')
            summarySheet.addRow({ label: m && y ? `${m}/${y}` : month, value: total })
        })

    summarySheet.addRow({ label: '', value: '' })
    summarySheet.addRow({ label: 'Distribuição por Profissional', value: 'Quantidade' }).font = { bold: true }

    Array.from(byDoctor.entries())
        .sort(([, a], [, b]) => b - a)
        .forEach(([doctorName, total]) => {
            summarySheet.addRow({ label: doctorName, value: total })
        })

    const rawBuffer = await workbook.xlsx.writeBuffer()
    return Buffer.isBuffer(rawBuffer) ? rawBuffer : Buffer.from(rawBuffer as ArrayBuffer)
}
