'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
import { 
    Loader2, 
    ArrowLeft, 
    Save, 
    Printer, 
    FileText,
    Brain,
    ActivitySquare,
    Stethoscope,
    Trash2,
    History,
    AlertCircle,
    Paperclip,
    PenLine
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Slider } from '@/components/ui/slider'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SignDocumentModal } from '@/components/pep/SignDocumentModal'
import { SignatureBadge } from '@/components/pep/SignatureBadge'
import { useAuth as useAuthContext } from '@/lib/hooks/use-auth'

// html2pdf import handle
const generatePDF = async (element: HTMLElement, filename: string) => {
    const html2pdf = (await import('html2pdf.js')).default;
    const opt = {
        margin:       10,
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
}

const PROFESSIONS = [
    { id: 'MEDICO', label: 'Médico', icon: Stethoscope },
    { id: 'PSICOLOGO', label: 'Psicologia', icon: Brain },
    { id: 'TERAPEUTA', label: 'Terapia / Funcional', icon: ActivitySquare },
]

export default function ProntuarioPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: appointmentId } = React.use(params)
    const { toast } = useToast()
    const router = useRouter()
    const { supabase } = useAuth()

    const printableRef = useRef<HTMLDivElement>(null)

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const [showSignModal, setShowSignModal] = useState(false)
    const [signatureData, setSignatureData] = useState<any>(null)
    const [pendingSign, setPendingSign] = useState(false)

    // Context Data
    const [appointment, setAppointment] = useState<any>(null)
    const [patient, setPatient] = useState<any>(null)
    const [clinic, setClinic] = useState<any>(null)
    const [doctor, setDoctor] = useState<any>(null)
    
    // Historico Rápido
    const [lastRecord, setLastRecord] = useState<any>(null)

    const [recordId, setRecordId] = useState<string | null>(null)
    const [professionType, setProfessionType] = useState('MEDICO')

    // Open sign modal after save completes and recordId is set
    React.useEffect(() => {
        if (pendingSign && recordId && !isSaving) {
            setPendingSign(false)
            setShowSignModal(true)
        }
    }, [pendingSign, recordId, isSaving])

    const [formData, setFormData] = useState({
        // == GERAL / MÉDICO ==
        chief_complaint: '',
        history_present_illness: '',
        physical_exam: '',
        diagnosis_text: '', // CID-10
        treatment_plan: '', // Receituário Digital/Conduta
        
        // Sinais vitais / Seguranca
        weight: '',
        height: '',
        blood_pressure: '',
        heart_rate: '',
        temperature: '',
        oxygen_saturation: '',
        allergies: '',
        family_history: '',
        
        // == PSICOLOGIA ==
        demanda: '',
        avaliacao_comportamental: '',
        testes_aplicados: '',
        evolucao_psicologica: '',
        fatores_risco: '',
        foco_terapeutico: '',
        contrato_frequencia: '',
        // Estado mental checks
        estado_mental_humor: '',
        estado_mental_orientacao: '',
        estado_mental_memoria: '',
        estado_mental_sensopercepcao: '',

        // == TERAPIA / TO / FISIO ==
        evolucao_funcional: '',
        atividades_realizadas: '',
        barreiras: '',
        plano_casa: '',
        objetivos_sessao: '', // SMART
        nivel_independencia: '',
        participacao_acompanhante: ''
    })

    const [escalaDor, setEscalaDor] = useState<number[]>([0])

    useEffect(() => {
        if (appointmentId) {
            loadInitialData()
        }
    }, [appointmentId])

    const loadInitialData = async () => {
        setIsLoading(true)
        try {
            // 1. Fetch Appointment Context
            const { data: appt, error: apptError } = await supabase
                .from('appointments')
                .select(`id, appointment_date, appointment_time, checked_in_at, clinic_id, doctor_id, patient_id`)
                .eq('id', appointmentId)
                .single()

            if (apptError || !appt) throw new Error('Agendamento não encontrado')
            setAppointment(appt)

            // Verifica bloqueio de 24h
            let referenceTime = new Date().getTime()
            if (appt.checked_in_at) {
                referenceTime = new Date(appt.checked_in_at).getTime()
            } else if (appt.appointment_date) {
                referenceTime = new Date(`${appt.appointment_date}T${appt.appointment_time || '00:00:00'}`).getTime()
            }
            const hoursDiff = (new Date().getTime() - referenceTime) / (1000 * 60 * 60)
            if (hoursDiff > 48) {
                setIsLocked(true)
            }

            // 2. Fetch Patient, Clinic, Doctor
            const [patientRes, clinicRes, doctorRes] = await Promise.all([
                supabase.from('patients').select('*').eq('id', appt.patient_id).single(),
                supabase.from('clinics').select('id, name, logo_url').eq('id', appt.clinic_id).single(),
                supabase.from('doctors').select('id, user:user_id(full_name), specialty').eq('id', appt.doctor_id).single()
            ])

            if (patientRes.data) setPatient(patientRes.data)
            if (clinicRes.data) setClinic(clinicRes.data)
            if (doctorRes.data) setDoctor(doctorRes.data)

            // 3. Fetch Last Record (Historico)
            const { data: previousRecord } = await supabase
                .from('medical_records')
                .select('*')
                .eq('patient_id', appt.patient_id)
                .neq('appointment_id', appt.id) // excluding current
                .order('created_at', { ascending: false })
                .limit(1)
                .single()
                
            if (previousRecord) setLastRecord(previousRecord)

            // 4. Fetch This Medical Record (if any)
            const { data: record } = await supabase
                .from('medical_records')
                .select('*')
                .eq('appointment_id', appt.id)
                .single()

            if (record) {
                setRecordId(record.id)
                
                let customData: any = {}
                try {
                    if (record.follow_up_instructions) {
                        customData = JSON.parse(record.follow_up_instructions)
                    }
                } catch(e) {}
                
                if (customData.professionType) {
                    setProfessionType(customData.professionType)
                }

                if (customData.escala_dor !== undefined) {
                    setEscalaDor([Number(customData.escala_dor)])
                }

                setFormData({
                    chief_complaint: record.chief_complaint || '',
                    history_present_illness: record.history_present_illness || '',
                    physical_exam: record.physical_exam || record.physical_examination || '',
                    treatment_plan: record.treatment_plan || record.prescription || '',
                    
                    diagnosis_text: customData.diagnosis_text || '',
                    weight: customData.weight || '',
                    height: customData.height || '',
                    blood_pressure: customData.blood_pressure || '',
                    heart_rate: customData.heart_rate || '',
                    temperature: customData.temperature || '',
                    oxygen_saturation: customData.oxygen_saturation || '',
                    allergies: customData.allergies || '',
                    family_history: customData.family_history || '',
                    
                    demanda: customData.demanda || '',
                    avaliacao_comportamental: customData.avaliacao_comportamental || '',
                    testes_aplicados: customData.testes_aplicados || '',
                    evolucao_psicologica: customData.evolucao_psicologica || '',
                    fatores_risco: customData.fatores_risco || '',
                    foco_terapeutico: customData.foco_terapeutico || '',
                    contrato_frequencia: customData.contrato_frequencia || '',
                    estado_mental_humor: customData.estado_mental_humor || '',
                    estado_mental_orientacao: customData.estado_mental_orientacao || '',
                    estado_mental_memoria: customData.estado_mental_memoria || '',
                    estado_mental_sensopercepcao: customData.estado_mental_sensopercepcao || '',

                    evolucao_funcional: customData.evolucao_funcional || '',
                    atividades_realizadas: customData.atividades_realizadas || '',
                    barreiras: customData.barreiras || '',
                    plano_casa: customData.plano_casa || '',
                    objetivos_sessao: customData.objetivos_sessao || '',
                    nivel_independencia: customData.nivel_independencia || '',
                    participacao_acompanhante: customData.participacao_acompanhante || ''
                })

                // Load signature data if signed
                if (record.signed_at) {
                    setIsLocked(true)
                    // Fetch signature details
                    try {
                        const sigRes = await fetch(`/api/pep/sign/verify?record_id=${record.id}`)
                        const sigData = await sigRes.json()
                        if (sigData.signer_name) {
                            setSignatureData({
                                signerName: sigData.signer_name,
                                crm: sigData.crm,
                                crmState: sigData.crm_state,
                                signedAt: sigData.signed_at,
                                signedPdfUrl: '', // Will be resolved from storage
                            })
                        }
                    } catch (e) {
                        // Even if fetch fails, we know it's signed from signed_at
                        setSignatureData({
                            signerName: 'Médico',
                            crm: '',
                            crmState: '',
                            signedAt: record.signed_at,
                        })
                    }
                }
            }

        } catch (error: any) {
            console.error('Error fetching data:', error)
            toast({
                title: 'Erro ao carregar',
                description: error.message || 'Não foi possível carregar os dados.',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleChange = (field: keyof typeof formData, value: string) => {
        if (isLocked) {
             toast({ title: 'Bloqueado', description: 'O prazo de 48h para evolução expirou.', variant: 'destructive'})
             return
        }
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSave = async () => {
        if (isLocked) {
            toast({ title: 'Bloqueado', description: 'O prazo de 48h para evolução expirou. Não é mais possível alterar este registro.', variant: 'destructive' })
            return
        }
        if (!appointment || !patient) return
        setIsSaving(true)
        try {
            const customDataPayload = JSON.stringify({
                professionType,
                escala_dor: escalaDor[0],
                // Médico
                diagnosis_text: formData.diagnosis_text,
                weight: formData.weight,
                height: formData.height,
                blood_pressure: formData.blood_pressure,
                heart_rate: formData.heart_rate,
                temperature: formData.temperature,
                oxygen_saturation: formData.oxygen_saturation,
                allergies: formData.allergies,
                family_history: formData.family_history,
                // Psi
                demanda: formData.demanda,
                avaliacao_comportamental: formData.avaliacao_comportamental,
                testes_aplicados: formData.testes_aplicados,
                evolucao_psicologica: formData.evolucao_psicologica,
                fatores_risco: formData.fatores_risco,
                foco_terapeutico: formData.foco_terapeutico,
                contrato_frequencia: formData.contrato_frequencia,
                estado_mental_humor: formData.estado_mental_humor,
                estado_mental_orientacao: formData.estado_mental_orientacao,
                estado_mental_memoria: formData.estado_mental_memoria,
                estado_mental_sensopercepcao: formData.estado_mental_sensopercepcao,
                // Fisio/TO
                evolucao_funcional: formData.evolucao_funcional,
                atividades_realizadas: formData.atividades_realizadas,
                barreiras: formData.barreiras,
                plano_casa: formData.plano_casa,
                objetivos_sessao: formData.objetivos_sessao,
                nivel_independencia: formData.nivel_independencia,
                participacao_acompanhante: formData.participacao_acompanhante,
            })

            const payload = {
                clinic_id: appointment.clinic_id,
                appointment_id: appointment.id,
                patient_id: patient.id,
                doctor_id: appointment.doctor_id,
                chief_complaint: formData.chief_complaint,
                history_present_illness: formData.history_present_illness,
                physical_exam: formData.physical_exam,
                treatment_plan: formData.treatment_plan,
                follow_up_instructions: customDataPayload,
                updated_at: new Date().toISOString()
            }

            let savedRecord
            if (recordId) {
                const { data, error } = await supabase.from('medical_records').update(payload).eq('id', recordId).select().single()
                if (error) throw error
                savedRecord = data
            } else {
                const { data, error } = await supabase.from('medical_records').insert(payload).select().single()
                if (error) throw error
                savedRecord = data
                setRecordId(savedRecord.id)
            }

            toast({ title: 'Sucesso', description: 'Prontuário estruturado com sucesso!' })
        } catch (error: any) {
            console.error('Error saving record:', error)
            toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive'})
        } finally {
            setIsSaving(false)
        }
    }

    const handleGeneratePDF = async () => {
        if (!printableRef.current) return
        setIsGeneratingPDF(true)
        try {
            await handleSave()
            const filename = `Prontuario_${patient?.full_name?.replace(/\s+/g, '_') || 'Paciente'}_${format(new Date(), 'ddMMyyyy')}.pdf`
            await generatePDF(printableRef.current, filename)
            toast({ title: 'PDF Gerado', description: 'O download foi iniciado na sua máquina.' })
        } catch (error: any) {
            toast({ title: 'Erro ao gerar PDF', description: 'Falha ao processar o arquivo.', variant: 'destructive' })
        } finally {
            setIsGeneratingPDF(false)
        }
    }

    const calculateIMC = () => {
        if (!formData.weight || !formData.height) return '--'
        const w = parseFloat(formData.weight.replace(',', '.'))
        const h = parseFloat(formData.height.replace(',', '.'))
        if (w > 0 && h > 0) return (w / (h * h)).toFixed(1)
        return '--'
    }

    // Snippets / Atalhos
    const insertAnamneseTemplate = () => {
        handleChange('history_present_illness', 'O paciente relata que [descrever sintomas] iniciou há [tempo], de forma [aguda/insidiosa]. Avaliou fatores de melhora/piora como [xxx]. Nega irradiação.\n\nSintomas associados: Nega febre, nega náuseas.')
        handleChange('physical_exam', 'Paciente Lúcido, Orientado no Tempo e Espaço (LOTE). Eupneico, acianótico, anictérico.\nACV: RCR, em 2T, BNT, sem sopros.\nAR: MV+, bilateralmente, sem RA.\nABD: Plano, flácido, indolor à palpação, RHA+. \nEXT: Sem edemas.')
    }

    const insertTerapiaTemplate = () => {
        const template = `* Data e horário do atendimento: \n* Objetivo terapêutico: \n* Estratégias/intervenções utilizadas: \n* Desempenho do paciente: \n* Intercorrências: \n* Orientações aos responsáveis: `
        if (professionType === 'PSICOLOGO') {
            handleChange('evolucao_psicologica', template)
        } else if (professionType === 'TERAPEUTA') {
            handleChange('atividades_realizadas', template)
        } else {
             handleChange('history_present_illness', template)
        }
    }
    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => router.back()} className="px-2">
                        <ArrowLeft className="w-5 h-5 mr-1" />
                        Voltar
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">Prontuário Clínico</h1>
                </div>
                
                <div className="flex items-center gap-3">
                    {/* Botão de Histórico */}
                    {lastRecord && (
                        <Sheet>
                            <SheetTrigger asChild>
                                <Button variant="secondary" className="mr-2">
                                    <History className="w-4 h-4 mr-2" /> Histórico Rápido
                                </Button>
                            </SheetTrigger>
                            <SheetContent className="sm:max-w-[450px] overflow-y-auto w-full">
                                <SheetHeader>
                                    <SheetTitle>Última Consulta</SheetTitle>
                                    <SheetDescription>
                                        Criado em {format(new Date(lastRecord.created_at), 'dd/MM/yyyy HH:mm')}
                                    </SheetDescription>
                                </SheetHeader>
                                <div className="mt-6 space-y-4 text-sm text-slate-700">
                                    {lastRecord.chief_complaint && (
                                        <div><StrongLabel>Queixa:</StrongLabel> {lastRecord.chief_complaint}</div>
                                    )}
                                    {lastRecord.history_present_illness && (
                                        <div><StrongLabel>Evolução (HDA):</StrongLabel> {lastRecord.history_present_illness}</div>
                                    )}
                                    {lastRecord.treatment_plan && (
                                        <div><StrongLabel>Conduta:</StrongLabel> {lastRecord.treatment_plan}</div>
                                    )}
                                    <Button variant="outline" className="w-full mt-4" onClick={() => router.push(`/dashboard/prontuarios/${lastRecord.appointment_id || lastRecord.id}`)}>
                                        Visualizar Prontuário Completo
                                    </Button>
                                </div>
                            </SheetContent>
                        </Sheet>
                    )}

                    <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 rounded-md border">
                        <Label htmlFor="prof-selector" className="text-sm font-medium whitespace-nowrap">Área:</Label>
                        <Select value={professionType} onValueChange={setProfessionType}>
                            <SelectTrigger id="prof-selector" className="h-8 border-0 bg-transparent shadow-none focus:ring-0">
                                <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                                {PROFESSIONS.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        <div className="flex items-center gap-2">
                                            <p.icon className="w-4 h-4" />
                                            <span>{p.label}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button variant="outline" onClick={handleGeneratePDF} disabled={isGeneratingPDF}>
                        {isGeneratingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                        Imprimir
                    </Button>
                </div>
            </div>

            {/* Este é o ref que será impresso/exportado para PDF */}
            <div ref={printableRef} className="bg-white border rounded-lg shadow-sm overflow-hidden text-slate-800 printable-area relative">
                
                {/* Header (Visão Clinica) */}
                
                {isLocked && (
                    <div className="bg-red-50 p-4 border-b-2 border-red-200 text-red-800 flex items-center justify-center gap-2 print:hidden">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold text-sm">Prontuário bloqueado para edição (Prazo de 48h expirado). Disponível apenas para visualização ou impressão.</span>
                    </div>
                )}
                
                <div className="p-8 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 print:border-b-2 print:border-black">
                    <div className="flex items-center gap-4">
                        {clinic?.logo_url ? (
                            <img src={clinic.logo_url} alt="Logo" className="w-auto h-16 object-contain" crossOrigin="anonymous" />
                        ) : (
                            <div className="w-16 h-16 bg-slate-200 flex items-center justify-center font-bold text-slate-400">LOGO</div>
                        )}
                        <div>
                            <h2 className="font-bold text-xl text-slate-900">{clinic?.name || 'Sistema Integrado'}</h2>
                            <p className="text-sm text-slate-500">
                                {PROFESSIONS.find(p => p.id === professionType)?.label} - Evolução Clínica
                            </p>
                        </div>
                    </div>
                    
                    <div className="text-sm text-right space-y-1">
                        <p><span className="text-slate-500 mr-2">Paciente:</span> <span className="font-bold">{patient?.full_name}</span></p>
                        <p><span className="text-slate-500 mr-2">Identificação:</span> <span>{patient?.cpf}</span></p>
                        <p><span className="text-slate-500 mr-2">Data do Atendimento:</span> <span>{format(new Date(appointment?.appointment_date || new Date()), 'dd/MM/yyyy')}</span></p>
                    </div>
                </div>

                {/* FORMULÁRIO */}
                <div className="p-8">
                    
                    {/* Alertas de Alergia Global */}
                    {(professionType === 'MEDICO' || professionType === 'TERAPEUTA') && (
                        <div className="mb-6 space-y-2 p-4 bg-red-50 border border-red-200 rounded-md">
                            <Label className="text-red-700 font-bold flex items-center gap-2">
                                <AlertCircle className="w-4 h-4" /> Alergias Conhecidas (Medicamentos / Ocupacional)
                            </Label>
                            <Input 
                                className="border-red-300 focus-visible:ring-red-400 bg-white" 
                                placeholder="Descreva as alergias. Ex: Dipirona, Latex (Deixe em branco se nega alergias)" 
                                value={formData.allergies} 
                                onChange={e => handleChange('allergies', e.target.value)} 
                            />
                        </div>
                    )}

                    <div className="space-y-8">
                        
                        {/* ======================================================= */}
                        {/* MÉDICO */}
                        {/* ======================================================= */}
                        {professionType === 'MEDICO' && (
                            <>
                                {/* Sinais Vitais (Somente visual/médico) */}
                                <div className="space-y-3">
                                    <h3 className="font-bold text-sm uppercase text-slate-500 tracking-wide border-b pb-1">Sinais Vitais e Antropometria</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 p-4 bg-slate-50 border rounded-md hide-print-border">
                                        <div>
                                            <Label className="text-xs">Peso (kg)</Label>
                                            <Input placeholder="70" value={formData.weight} onChange={e => handleChange('weight', e.target.value)} />
                                        </div>
                                        <div>
                                            <Label className="text-xs">Altura (m)</Label>
                                            <Input placeholder="1.75" value={formData.height} onChange={e => handleChange('height', e.target.value)} />
                                        </div>
                                        <div className="flex flex-col justify-center">
                                            <Label className="text-xs text-slate-500">IMC Calculado</Label>
                                            <div className="font-bold text-lg text-primary">{calculateIMC()}</div>
                                        </div>
                                        <div>
                                            <Label className="text-xs">PA (mmHg)</Label>
                                            <Input placeholder="120/80" value={formData.blood_pressure} onChange={e => handleChange('blood_pressure', e.target.value)} />
                                        </div>
                                        <div>
                                            <Label className="text-xs">FC (bpm)</Label>
                                            <Input placeholder="80" value={formData.heart_rate} onChange={e => handleChange('heart_rate', e.target.value)} />
                                        </div>
                                        <div>
                                            <Label className="text-xs">O2 / Temp.</Label>
                                            <Input placeholder="98% / 36.5°" value={formData.temperature} onChange={e => handleChange('temperature', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <h3 className="font-bold text-sm uppercase text-slate-500 tracking-wide border-b pb-1 flex-1">Anamnese e Evolução</h3>
                                        {/* Botão Atalho */}
                                        <Button variant="ghost" size="sm" onClick={insertAnamneseTemplate} className="print:hidden text-xs text-primary">Inserir Modelo Padrão</Button>
                                    </div>

                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label>Queixa Principal</Label>
                                            <Textarea className="min-h-[80px] print-friendly-textarea" value={formData.chief_complaint} onChange={(e) => handleChange('chief_complaint', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Antecedentes Pessoais (Comorbidades/Cirurgias)</Label>
                                            <Textarea className="min-h-[80px] print-friendly-textarea" value={formData.family_history} onChange={(e) => handleChange('family_history', e.target.value)} />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>História da Doença Atual (HDA) / Evolução</Label>
                                        <Textarea className="min-h-[120px] print-friendly-textarea" value={formData.history_present_illness} onChange={(e) => handleChange('history_present_illness', e.target.value)} />
                                    </div>
                                    
                                    <div className="space-y-2">
                                        <Label>Exame Físico</Label>
                                        <Textarea className="min-h-[100px] print-friendly-textarea" value={formData.physical_exam} onChange={(e) => handleChange('physical_exam', e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="font-bold text-sm uppercase text-slate-500 tracking-wide border-b pb-1 mt-6">Conclusão e Diagnóstico</h3>
                                    <div className="grid md:grid-cols-3 gap-6">
                                        <div className="md:col-span-1 space-y-2">
                                            <Label>CID-10 / Hipótese Diagnóstica</Label>
                                            <Input className="print-friendly-textarea" placeholder="Busca ou Código CID" value={formData.diagnosis_text} onChange={(e) => handleChange('diagnosis_text', e.target.value)} />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <Label className="flex items-center gap-2">Receita Médica / Prescrição Digital <FileText className="w-3 h-3 text-primary"/></Label>
                                            <Textarea className="min-h-[120px] print-friendly-textarea font-mono text-sm bg-blue-50/30" placeholder="Insira a prescrição de medicamentos separadamente aqui..." value={formData.treatment_plan} onChange={(e) => handleChange('treatment_plan', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}


                        {/* ======================================================= */}
                        {/* PSICOLOGIA */}
                        {/* ======================================================= */}
                        {professionType === 'PSICOLOGO' && (
                            <>
                                <h3 className="font-bold text-sm uppercase text-slate-500 tracking-wide border-b pb-1">Segurança e Contrato</h3>
                                <div className="grid md:grid-cols-2 gap-6 p-4 bg-red-50 border rounded-md hide-print-border">
                                    <div className="space-y-2">
                                        <Label className="text-red-800 font-bold">Fatores de Risco (Extermínio / Violência)</Label>
                                        <Input className="bg-white" placeholder="Sinalizações críticas" value={formData.fatores_risco} onChange={(e) => handleChange('fatores_risco', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-800 font-bold">Registro de Frequência / Atrasos</Label>
                                        <Select value={formData.contrato_frequencia} onValueChange={(v) => handleChange('contrato_frequencia', v)}>
                                            <SelectTrigger className="bg-white"><SelectValue placeholder="Regular / Presente" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Presente - Regular">Presente - Regular</SelectItem>
                                                <SelectItem value="Acesso Remoto">Acesso Remoto</SelectItem>
                                                <SelectItem value="Atraso Tolerável">Atraso Tolerável</SelectItem>
                                                <SelectItem value="Sessão Extra">Sessão Extra de Reposição</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="space-y-3 p-4 bg-slate-50 border rounded-md hide-print-border">
                                    <Label className="font-bold">Exame Rápido do Estado Mental</Label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                        <div>
                                            <Label className="text-xs text-muted-foreground mb-2 block">Humor e Afeto</Label>
                                            <Select value={formData.estado_mental_humor} onValueChange={(v) => handleChange('estado_mental_humor', v)}>
                                                <SelectTrigger className="bg-white"><SelectValue placeholder="Avaliar" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Eutímico">Eutímico</SelectItem>
                                                    <SelectItem value="Ansioso">Ansioso</SelectItem>
                                                    <SelectItem value="Deprimido">Deprimido</SelectItem>
                                                    <SelectItem value="Lábil">Lábil/Oscilante</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground mb-2 block">Orientação (LOTE)</Label>
                                            <Select value={formData.estado_mental_orientacao} onValueChange={(v) => handleChange('estado_mental_orientacao', v)}>
                                                <SelectTrigger className="bg-white"><SelectValue placeholder="Avaliar" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Orientado">Orientado (Tempo/Espaço)</SelectItem>
                                                    <SelectItem value="Desorientado Parcial">Des. Parcial</SelectItem>
                                                    <SelectItem value="Desorientado Total">Des. Total</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground mb-2 block">Atenção e Memória</Label>
                                            <Select value={formData.estado_mental_memoria} onValueChange={(v) => handleChange('estado_mental_memoria', v)}>
                                                <SelectTrigger className="bg-white"><SelectValue placeholder="Avaliar" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Preservada">Preservada (Atenção/Curta/Longa)</SelectItem>
                                                    <SelectItem value="Flutuante">Memória Flutuante</SelectItem>
                                                    <SelectItem value="Déficit Moderado">Déficit Moderado</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label className="text-xs text-muted-foreground mb-2 block">Sensopercepção</Label>
                                            <Select value={formData.estado_mental_sensopercepcao} onValueChange={(v) => handleChange('estado_mental_sensopercepcao', v)}>
                                                <SelectTrigger className="bg-white"><SelectValue placeholder="Avaliar" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Sem alterações">Sem alterações</SelectItem>
                                                    <SelectItem value="Alucinações Visuais">Alucinações Visuais</SelectItem>
                                                    <SelectItem value="Alucinações Auditivas">Alucinações Auditivas</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6 mt-4">
                                    <div className="space-y-2">
                                        <Label>Foco Terapêutico (Queixa Trabalhada Hoje)</Label>
                                        <Input className="print-friendly-textarea" value={formData.foco_terapeutico} onChange={(e) => handleChange('foco_terapeutico', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Demanda Inicial / Motivo Base</Label>
                                        <Input className="print-friendly-textarea text-slate-500" value={formData.demanda} onChange={(e) => handleChange('demanda', e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <Label>Evolução Psicológica (Registro Subjetivo e Comportamental)</Label>
                                        <Button variant="ghost" size="sm" onClick={insertTerapiaTemplate} className="print:hidden text-xs text-primary h-6 px-2">Inserir Template Padrão</Button>
                                    </div>
                                    <Textarea className="min-h-[150px] print-friendly-textarea" placeholder="Descreva os progressos, elaborações, mecanismos de defesa..." value={formData.evolucao_psicologica} onChange={(e) => handleChange('evolucao_psicologica', e.target.value)} />
                                </div>

                                <div className="space-y-2">
                                    <Label>Testes ou Instrumentos Aplicados (Se houver)</Label>
                                    <Textarea className="min-h-[80px] print-friendly-textarea" value={formData.testes_aplicados} onChange={(e) => handleChange('testes_aplicados', e.target.value)} />
                                </div>
                            </>
                        )}


                        {/* ======================================================= */}
                        {/* TERAPIA OCUPACIONAL / FISIO / FONO */}
                        {/* ======================================================= */}
                        {professionType === 'TERAPEUTA' && (
                            <>
                                <h3 className="font-bold text-sm uppercase text-slate-500 tracking-wide border-b pb-1">Métricas de Foco Funcional e Dor</h3>
                                <div className="grid md:grid-cols-3 gap-6 p-4 bg-slate-50 border rounded-md hide-print-border">
                                    <div className="space-y-2">
                                        <Label className="font-bold">Objetivo SMART da Sessão</Label>
                                        <Input className="bg-white" placeholder="Aumentar amplitude, manter foco verbal..." value={formData.objetivos_sessao} onChange={(e) => handleChange('objetivos_sessao', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold">Nível de Independência</Label>
                                        <Select value={formData.nivel_independencia} onValueChange={(v) => handleChange('nivel_independencia', v)}>
                                            <SelectTrigger className="bg-white"><SelectValue placeholder="Selecione Categoria" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Supervisão">Supervisão (Verbal)</SelectItem>
                                                <SelectItem value="Ajuda Leve">Ajuda Física Leve</SelectItem>
                                                <SelectItem value="Ajuda Moderada">Ajuda Física Moderada</SelectItem>
                                                <SelectItem value="Totalmente Dependente">Totalmente Dependente</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-4 pt-1">
                                        <Label className="font-bold flex justify-between">Escala de Dor Visual (EVA) <span className="font-mono bg-primary text-white px-2 rounded">{escalaDor[0]}</span></Label>
                                        <Slider
                                            min={0}
                                            max={10}
                                            step={1}
                                            value={escalaDor}
                                            onValueChange={setEscalaDor}
                                            className="cursor-pointer"
                                        />
                                        <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                                            <span>I</span><span>I</span><span>I</span><span>I</span><span>I</span><span>I</span><span>I</span><span>I</span><span>I</span><span>I</span><span>I</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2 mt-4">
                                    <div className="flex justify-between items-end">
                                        <Label>Atividades Realizadas e Resposta Motora/Sensorial</Label>
                                        <Button variant="ghost" size="sm" onClick={insertTerapiaTemplate} className="print:hidden text-xs text-primary h-6 px-2">Inserir Template Padrão</Button>
                                    </div>
                                    <Textarea className="min-h-[120px] print-friendly-textarea" placeholder="Descreva os exercícios de resistência, cognição, fono ou dinâmicas TO..." value={formData.atividades_realizadas} onChange={(e) => handleChange('atividades_realizadas', e.target.value)} />
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>Evolução Funcional (Progresso do SMART)</Label>
                                        <Textarea className="min-h-[100px] print-friendly-textarea" value={formData.evolucao_funcional} onChange={(e) => handleChange('evolucao_funcional', e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Barreiras Observadas (Dor intensa, fadigabilidade)</Label>
                                        <Textarea className="min-h-[100px] print-friendly-textarea" value={formData.barreiras} onChange={(e) => handleChange('barreiras', e.target.value)} />
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-2 border-l-4 border-amber-400 pl-3">
                                        <Label className="flex items-center gap-2">Participação de Acompanhantes <AlertCircle className="w-3 h-3 text-amber-500"/></Label>
                                        <Textarea className="min-h-[80px] print-friendly-textarea border-amber-200" placeholder="Pais ou filhos participaram?" value={formData.participacao_acompanhante} onChange={(e) => handleChange('participacao_acompanhante', e.target.value)} />
                                    </div>
                                    <div className="space-y-2 border-l-4 border-indigo-400 pl-3">
                                        <Label className="flex items-center gap-2">Orientação para Casa / Exercícios Previstos</Label>
                                        <Textarea className="min-h-[80px] print-friendly-textarea border-indigo-200" value={formData.plano_casa} onChange={(e) => handleChange('plano_casa', e.target.value)} />
                                    </div>
                                </div>
                            </>
                        )}
                        
                    </div>
                </div>

                {/* Subfooter e Assinatura Digital */}
                <div className="p-8 pt-4 pb-16 mt-6 printable-signature">
                    {signatureData ? (
                        <SignatureBadge
                            signerName={signatureData.signerName}
                            crm={signatureData.crm}
                            crmState={signatureData.crmState}
                            signedAt={signatureData.signedAt}
                            recordId={recordId || ''}
                            signedPdfUrl={signatureData.signedPdfUrl}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-center mt-12 bg-white p-4">
                            <div className="w-full border-b border-slate-500 mb-2"></div>
                            <p className="font-bold text-sm text-slate-800">{doctor?.user?.full_name}</p>
                            <p className="text-xs text-slate-500 mt-1">{PROFESSIONS.find(p => p.id === professionType)?.label} - Especialidade: {doctor?.specialty || 'Não definida'}</p>
                            <p className="text-[10px] text-slate-400 mt-4 border px-2 py-1 bg-slate-50 inline-block rounded">
                                Assinado Eletronicamente via Plataforma - {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                        </div>
                    )}
                </div>

                {/* PRINT CSS Hacks */}
                <style dangerouslySetInnerHTML={{__html: `
                    @media print {
                        .print-friendly-textarea {
                            border: 0 !important;
                            resize: none !important;
                            background: transparent !important;
                            box-shadow: none !important;
                            height: auto !important;
                            overflow: visible !important;
                            padding: 0 !important;
                            min-height: 20px !important;
                        }
                        .hide-print-border {
                            border: 0 !important;
                            background: transparent !important;
                            padding: 0 !important;
                        }
                        /* Oculta dropdown icons dos selects */
                        .hide-print-border select, .hide-print-border button {
                            border: 0 !important;
                            appearance: none !important;
                            padding-left: 0 !important;
                        }
                    }
                `}} />
            </div>

            {/* Ações / Upload Info */}
            <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-4 border rounded-lg shadow-sm gap-4">
                <div className="flex items-center text-sm text-slate-500 gap-2">
                    <Paperclip className="w-4 h-4" /> 
                    <span>Anexos fotográficos em breve na v2 (Arquitetura em desenvolvimento)</span>
                </div>
                <div className="flex gap-3 flex-wrap">
                    <Button variant="outline" onClick={handleGeneratePDF} disabled={isGeneratingPDF}>
                        {isGeneratingPDF ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                        Exportar PDF
                    </Button>
                    {!signatureData && (
                        <Button variant="outline" className="text-primary border-primary/30 hover:bg-primary/5" onClick={async () => {
                            if (!recordId) {
                                // Save first, then pendingSign will open modal via useEffect
                                setPendingSign(true)
                                await handleSave()
                            } else {
                                setShowSignModal(true)
                            }
                        }} disabled={isSaving}>
                            <PenLine className="w-4 h-4 mr-2" />
                            ✍ Assinar Digitalmente
                        </Button>
                    )}
                    {!isLocked && (
                        <Button onClick={handleSave} disabled={isSaving}>
                            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Terminar Consulta (Salvar)
                        </Button>
                    )}
                </div>
            </div>

            {/* Sign Document Modal */}
            {recordId && (
                <SignDocumentModal
                    open={showSignModal}
                    onOpenChange={setShowSignModal}
                    recordId={recordId}
                    onSuccess={(data) => {
                        setSignatureData({
                            signerName: data.signer_name,
                            crm: data.crm,
                            crmState: data.crm_state,
                            signedAt: data.signed_at,
                            signedPdfUrl: data.signed_pdf_url,
                        })
                        setIsLocked(true)
                    }}
                />
            )}

            
        </div>
    )
}

function StrongLabel({ children }: { children: React.ReactNode }) {
    return <span className="font-semibold text-slate-900">{children}</span>
}
