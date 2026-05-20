'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Loader2, FileDown, Receipt, FileText, Download } from 'lucide-react'
import { toast } from 'sonner'
import { format, endOfMonth, startOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { jsPDF } from 'jspdf'

interface PatientReimbursementProps {
    patientId: string
    clinicId: string
    patientName: string
    patientCpf?: string
}

export function PatientReimbursement({ patientId, clinicId, patientName, patientCpf }: PatientReimbursementProps) {
    const [doctors, setDoctors] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const supabase = createClient()

    // Form state
    const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
    const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
    const [sessionValue, setSessionValue] = useState<string>('')
    const [isModalOpen, setIsModalOpen] = useState(false)

    const [reimbursementRules, setReimbursementRules] = useState<any[]>([])
    const [activeRule, setActiveRule] = useState<any | null>(null)

    useEffect(() => {
        const loadData = async () => {
            // Buscar regras de reembolso do paciente
            const { data: rules } = await supabase
                .from('patient_reimbursement_rules')
                .select('*')
                .eq('patient_id', patientId)
                .eq('is_active', true)

            const activeRules = rules || []
            setReimbursementRules(activeRules)

            // Buscar médicos
            const { data: docs } = await supabase
                .from('doctors')
                .select('id, specialty, crm, crm_state, consultation_price, users(full_name)')
                .eq('clinic_id', clinicId)
            
            if (docs) {
                setDoctors(docs)
                if (docs.length > 0) {
                    const firstDocId = docs[0].id
                    setSelectedDoctorId(firstDocId)

                    // Verificar regra de reembolso correspondente
                    const doc = docs[0]
                    const docSpecialty = (doc.specialty || '').trim().toLowerCase()
                    const rule = activeRules.find(r => {
                        const ruleTherapy = (r.therapy_type || '').trim().toLowerCase()
                        return ruleTherapy === docSpecialty || docSpecialty.includes(ruleTherapy) || ruleTherapy.includes(docSpecialty)
                    })

                    if (rule) {
                        setActiveRule(rule)
                        setSessionValue((rule.billing_amount || rule.reimbursement_amount || 0).toString())
                    } else if (doc.consultation_price) {
                        setActiveRule(null)
                        setSessionValue(doc.consultation_price.toString())
                    }
                }
            }
        }
        if (clinicId && patientId) loadData()
    }, [clinicId, patientId])

    const handleDoctorChange = (docId: string) => {
        setSelectedDoctorId(docId)
        const doc = doctors.find(d => d.id === docId)
        if (!doc) return

        const docSpecialty = (doc.specialty || '').trim().toLowerCase()
        const rule = reimbursementRules.find(r => {
            const ruleTherapy = (r.therapy_type || '').trim().toLowerCase()
            return ruleTherapy === docSpecialty || docSpecialty.includes(ruleTherapy) || ruleTherapy.includes(docSpecialty)
        })

        if (rule) {
            setActiveRule(rule)
            setSessionValue((rule.billing_amount || rule.reimbursement_amount || 0).toString())
        } else {
            setActiveRule(null)
            if (doc.consultation_price) {
                setSessionValue(doc.consultation_price.toString())
            } else {
                setSessionValue('')
            }
        }
    }

    const generatePDF = async () => {
        if (!selectedDoctorId || !selectedMonth || !sessionValue) {
            toast.error('Preencha todos os campos obrigatórios')
            return
        }

        setIsGenerating(true)
        try {
            // Parse month
            const [yearStr, monthStr] = selectedMonth.split('-')
            const startDate = new Date(parseInt(yearStr), parseInt(monthStr) - 1, 1)
            const endDate = endOfMonth(startDate)

            // Fetch appointments for this patient, doctor, and month
            const { data: appointments, error } = await supabase
                .from('appointments')
                .select('*')
                .eq('patient_id', patientId)
                .eq('doctor_id', selectedDoctorId)
                .in('status', ['COMPLETED', 'CONFIRMED'])
                .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
                .lte('appointment_date', format(endDate, 'yyyy-MM-dd'))
                .order('appointment_date', { ascending: true })

            if (error) throw error

            if (!appointments || appointments.length === 0) {
                toast.error('Nenhuma sessão encontrada para este período e profissional.')
                setIsGenerating(false)
                return
            }

            // Fetch Clinic Info
            const { data: clinic } = await supabase.from('clinics').select('name, cnpj, address').eq('id', clinicId).single()
            const doctor = doctors.find(d => d.id === selectedDoctorId)

            const doc = new jsPDF()
            const pageWidth = doc.internal.pageSize.width
            let yPos = 20

            // Header
            doc.setFontSize(18)
            doc.setFont('helvetica', 'bold')
            doc.text('RECIBO / RELATÓRIO DE REEMBOLSO', pageWidth / 2, yPos, { align: 'center' })
            yPos += 15

            // Clinic Info
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            if (clinic) {
                doc.text(`Clínica: ${clinic.name}`, 20, yPos)
                if (clinic.cnpj) doc.text(`CNPJ: ${clinic.cnpj}`, 20, yPos + 6)
                yPos += 15
            }

            // Professional Info
            doc.setFont('helvetica', 'bold')
            doc.text('DADOS DO PROFISSIONAL', 20, yPos)
            yPos += 6
            doc.setFont('helvetica', 'normal')
            doc.text(`Nome: ${doctor?.users?.full_name}`, 20, yPos)
            doc.text(`Especialidade: ${doctor?.specialty || 'Não informada'}`, 20, yPos + 6)
            if (doctor?.crm) {
                doc.text(`Registro (CRM/CRP): ${doctor.crm} ${doctor.crm_state ? '- ' + doctor.crm_state : ''}`, 20, yPos + 12)
                yPos += 18
            } else {
                yPos += 12
            }

            // Patient Info
            doc.setFont('helvetica', 'bold')
            doc.text('DADOS DO PACIENTE', 20, yPos)
            yPos += 6
            doc.setFont('helvetica', 'normal')
            doc.text(`Nome: ${patientName}`, 20, yPos)
            if (patientCpf) {
                doc.text(`CPF: ${patientCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}`, 20, yPos + 6)
                yPos += 12
            } else {
                yPos += 6
            }

            // Statement Text
            yPos += 5
            doc.setFont('helvetica', 'normal')
            const valuePerSession = parseFloat(sessionValue.replace(',', '.'))
            const totalValue = valuePerSession * appointments.length

            const statementText = `Declaro para os devidos fins de reembolso ou declaração de imposto de renda, que o(a) paciente supracitado(a) realizou e pagou por ${appointments.length} sessão(ões) de ${doctor?.specialty || 'atendimento em saúde'} no mês de ${format(startDate, 'MMMM/yyyy', { locale: ptBR })}, totalizando o valor de R$ ${totalValue.toFixed(2).replace('.', ',')}.`
            
            const splitText = doc.splitTextToSize(statementText, pageWidth - 40)
            doc.text(splitText, 20, yPos)
            yPos += (splitText.length * 6) + 10

            // Table of Sessions
            doc.setFont('helvetica', 'bold')
            doc.text('DETALHAMENTO DAS SESSÕES', 20, yPos)
            yPos += 8

            // Table Header
            doc.setFontSize(9)
            doc.setFillColor(240, 240, 240)
            doc.rect(20, yPos, pageWidth - 40, 8, 'F')
            doc.text('Data', 25, yPos + 5)
            doc.text('Procedimento', 65, yPos + 5)
            doc.text('Valor (R$)', pageWidth - 45, yPos + 5)
            yPos += 8

            // Table Rows
            doc.setFont('helvetica', 'normal')
            appointments.forEach((apt, index) => {
                const isEven = index % 2 === 0
                if (!isEven) {
                    doc.setFillColor(250, 250, 250)
                    doc.rect(20, yPos, pageWidth - 40, 8, 'F')
                }
                
                const aptDate = format(new Date(apt.appointment_date + 'T00:00:00'), 'dd/MM/yyyy')
                doc.text(aptDate, 25, yPos + 5)
                doc.text(`Sessão de ${doctor?.specialty || 'Atendimento'}`, 65, yPos + 5)
                doc.text(valuePerSession.toFixed(2).replace('.', ','), pageWidth - 45, yPos + 5)
                yPos += 8
            })

            // Total Row
            doc.setFont('helvetica', 'bold')
            doc.setFillColor(230, 230, 230)
            doc.rect(20, yPos, pageWidth - 40, 8, 'F')
            doc.text('TOTAL PAGO', 65, yPos + 5)
            doc.text(`R$ ${totalValue.toFixed(2).replace('.', ',')}`, pageWidth - 45, yPos + 5)
            
            yPos += 30

            // Signature Line
            doc.line(pageWidth / 2 - 40, yPos, pageWidth / 2 + 40, yPos)
            doc.setFontSize(10)
            doc.setFont('helvetica', 'normal')
            doc.text(doctor?.users?.full_name || 'Profissional Responsável', pageWidth / 2, yPos + 6, { align: 'center' })
            if (doctor?.crm) {
                doc.text(`${doctor.crm} ${doctor.crm_state ? '- ' + doctor.crm_state : ''}`, pageWidth / 2, yPos + 12, { align: 'center' })
            }
            doc.text(format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }), pageWidth / 2, yPos + 20, { align: 'center' })

            // Save PDF
            const fileName = `Reembolso_${patientName.replace(/\s+/g, '_')}_${format(startDate, 'MMM_yyyy')}.pdf`
            doc.save(fileName)
            
            toast.success('Relatório gerado com sucesso!')
            setIsModalOpen(false)

        } catch (error: any) {
            console.error('Error generating PDF:', error)
            toast.error('Erro ao gerar relatório: ' + error.message)
        } finally {
            setIsGenerating(false)
        }
    }

    return (
        <Card className="border-0 shadow-sm ring-1 ring-border/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" />
                    Documentos Financeiros e Reembolso
                </CardTitle>
                <CardDescription>
                    Gere relatórios de sessões e recibos para planos de saúde
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-6 border rounded-lg bg-muted/20">
                    <div className="flex-1">
                        <h4 className="font-medium text-lg flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-500" />
                            Relatório para Reembolso (Plano de Saúde)
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                            Gera um PDF contendo o detalhamento de todas as sessões realizadas pelo paciente em um determinado mês, com valores e dados do profissional. Padrão aceito pelos convênios.
                        </p>
                    </div>
                    
                    <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="shrink-0 group">
                                <FileDown className="w-4 h-4 mr-2 group-hover:-translate-y-1 transition-transform" />
                                Gerar Relatório
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Receipt className="w-5 h-5" />
                                    Gerar Relatório de Reembolso
                                </DialogTitle>
                                <DialogDescription>
                                    Selecione o período e o profissional para listar as sessões no documento.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="grid gap-4 py-4">
                                <div className="space-y-2">
                                    <Label>Período (Mês/Ano)</Label>
                                    <Input 
                                        type="month" 
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Profissional Responsável</Label>
                                    <Select value={selectedDoctorId} onValueChange={handleDoctorChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o profissional" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {doctors.map(doc => (
                                                <SelectItem key={doc.id} value={doc.id}>
                                                    {doc.users?.full_name} ({doc.specialty})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Valor cobrado por sessão (R$)</Label>
                                    <Input 
                                        type="number" 
                                        step="0.01"
                                        placeholder="Ex: 150.00"
                                        value={sessionValue}
                                        onChange={(e) => setSessionValue(e.target.value)}
                                    />
                                    {activeRule ? (
                                        <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1.5 flex items-center gap-1.5 mt-1.5">
                                            <span>🛡️</span>
                                            <span>Regra de Reembolso Ativa para {activeRule.therapy_type}: <strong>R$ {Number(activeRule.billing_amount).toFixed(2).replace('.', ',')}</strong> por sessão.</span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Nenhuma regra de reembolso específica para esta especialidade. Usando o valor padrão do terapeuta.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button onClick={generatePDF} disabled={isGenerating}>
                                    {isGenerating ? (
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4 mr-2" />
                                    )}
                                    Baixar PDF
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardContent>
        </Card>
    )
}
