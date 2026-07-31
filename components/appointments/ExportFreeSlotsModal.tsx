'use client'

import React, { useState, useMemo } from 'react'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import {
    Calendar as CalendarIcon,
    Clock,
    Copy,
    Check,
    Share2,
    Printer,
    Sparkles,
    Stethoscope,
    AlertCircle,
    ExternalLink,
    Filter
} from 'lucide-react'
import {
    format,
    addDays,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameDay,
    parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const TIME_SLOTS = Array.from({ length: 15 }, (_, i) => {
    const hour = i + 8 // 08:00 to 22:00
    return `${String(hour).padStart(2, '0')}:00`
})

interface ExportFreeSlotsModalProps {
    isOpen: boolean
    onClose: () => void
    selectedDate: Date
    doctorsList: any[]
    schedulesData: any[]
    appointments: any[]
    currentDoctorFilter?: string[]
}

export function ExportFreeSlotsModal({
    isOpen,
    onClose,
    selectedDate,
    doctorsList = [],
    schedulesData = [],
    appointments = [],
    currentDoctorFilter = ['all'],
}: ExportFreeSlotsModalProps) {
    const [period, setPeriod] = useState<'today' | 'tomorrow' | 'week' | 'next7days'>('today')
    const [doctorFilter, setDoctorFilter] = useState<string>('all')
    const [copied, setCopied] = useState(false)

    // Calculate days range based on period
    const periodDays = useMemo(() => {
        const base = new Date(selectedDate)
        if (period === 'today') {
            return [base]
        }
        if (period === 'tomorrow') {
            return [addDays(base, 1)]
        }
        if (period === 'next7days') {
            return Array.from({ length: 7 }, (_, i) => addDays(base, i))
        }
        if (period === 'week') {
            const start = startOfWeek(base, { weekStartsOn: 1 }) // Monday to Saturday
            const end = endOfWeek(base, { weekStartsOn: 1 })
            return eachDayOfInterval({ start, end }).filter(d => d.getDay() !== 0) // exclude Sunday
        }
        return [base]
    }, [selectedDate, period])

    // Compute free slots grouped by Day -> Doctor -> Slots
    const freeSlotsReport = useMemo(() => {
        const activeDoctors = doctorsList.filter((d: any) => {
            if (!d || !d.id) return false
            if (doctorFilter !== 'all' && d.id !== doctorFilter) return false
            return true
        })

        const daysResult: Array<{
            date: Date
            dateFormatted: string
            dayName: string
            doctors: Array<{
                id: string
                name: string
                specialty: string
                freeSlots: string[]
            }>
        }> = []

        for (const day of periodDays) {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayOfWeek = day.getDay()

            const doctorsForDay: Array<{
                id: string
                name: string
                specialty: string
                freeSlots: string[]
            }> = []

            for (const doctor of activeDoctors) {
                const docName = doctor.user?.full_name || doctor.full_name || 'Profissional'
                const docSpecialty = doctor.specialty || 'Especialista'

                // Check doctor schedule configuration for this day of week
                const docSchedules = (schedulesData || []).filter(
                    (s: any) => s.doctor_id === doctor.id && s.day_of_week === dayOfWeek && s.is_active !== false
                )

                const freeSlots: string[] = []

                for (const time of TIME_SLOTS) {
                    const timeMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1])

                    // Check if time is within schedule hours (if schedules are defined)
                    let isWithinSchedule = true
                    if (docSchedules.length > 0) {
                        isWithinSchedule = docSchedules.some((s: any) => {
                            const startMin = parseInt(s.start_time.split(':')[0]) * 60 + parseInt(s.start_time.split(':')[1])
                            const endMin = parseInt(s.end_time.split(':')[0]) * 60 + parseInt(s.end_time.split(':')[1])
                            return timeMinutes >= startMin && timeMinutes < endMin
                        })
                    }

                    if (!isWithinSchedule) continue

                    // Check if there is an existing non-cancelled appointment at this time
                    const hasAppointment = (appointments || []).some(
                        (a: any) =>
                            a.appointment_date === dateStr &&
                            a.appointment_time?.substring(0, 5) === time &&
                            a.doctor?.id === doctor.id &&
                            a.status !== 'CANCELLED'
                    )

                    if (!hasAppointment) {
                        freeSlots.push(time)
                    }
                }

                if (freeSlots.length > 0) {
                    doctorsForDay.push({
                        id: doctor.id,
                        name: docName,
                        specialty: docSpecialty,
                        freeSlots,
                    })
                }
            }

            if (doctorsForDay.length > 0) {
                daysResult.push({
                    date: day,
                    dateFormatted: format(day, "dd/MM/yyyy", { locale: ptBR }),
                    dayName: format(day, "EEEE", { locale: ptBR }),
                    doctors: doctorsForDay,
                })
            }
        }

        return daysResult
    }, [periodDays, doctorsList, doctorFilter, schedulesData, appointments])

    // Total count of free slots across report
    const totalFreeSlotsCount = useMemo(() => {
        return freeSlotsReport.reduce((acc, day) => {
            return acc + day.doctors.reduce((docAcc, doc) => docAcc + doc.freeSlots.length, 0)
        }, 0)
    }, [freeSlotsReport])

    // Build plain text for Clipboard / WhatsApp
    const formattedTextForSharing = useMemo(() => {
        if (freeSlotsReport.length === 0) {
            return 'Nenhum horário livre encontrado para o período selecionado.'
        }

        let text = `🏥 *HORÁRIOS LIVRES DISPONÍVEIS*\n`
        text += `📌 *Agenda de Atendimentos*\n\n`

        for (const dayItem of freeSlotsReport) {
            text += `📅 *${dayItem.dayName.toUpperCase()} (${dayItem.dateFormatted})*\n`

            for (const doc of dayItem.doctors) {
                text += `👨‍⚕️ *${doc.name}* (${doc.specialty})\n`
                text += `⏰ Horários: ${doc.freeSlots.join(' | ')}\n\n`
            }
        }

        text += `✨ *Entre em contato para agendar seu horário!*`
        return text
    }, [freeSlotsReport])

    const handleCopyText = async () => {
        try {
            await navigator.clipboard.writeText(formattedTextForSharing)
            setCopied(true)
            toast.success('Horários livres copiados com sucesso!')
            setTimeout(() => setCopied(false), 2500)
        } catch (err) {
            toast.error('Erro ao copiar texto para a área de transferência.')
        }
    }

    const handleWhatsAppShare = () => {
        const encodedText = encodeURIComponent(formattedTextForSharing)
        window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank')
    }

    const handlePrint = () => {
        const printWindow = window.open('', '_blank')
        if (!printWindow) {
            toast.error('Por favor, permita pop-ups para imprimir o relatório.')
            return
        }

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Horários Livres Disponíveis - Agenda</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1e293b; }
                    h1 { font-size: 22px; color: #059669; border-bottom: 2px solid #10b981; padding-bottom: 8px; margin-bottom: 16px; }
                    .period { font-size: 14px; color: #64748b; margin-bottom: 20px; font-weight: 600; }
                    .day-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
                    .day-title { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 12px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
                    .doc-box { margin-bottom: 12px; }
                    .doc-name { font-weight: 600; color: #0369a1; font-size: 14px; }
                    .doc-specialty { font-size: 12px; color: #64748b; }
                    .slots { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
                    .slot-pill { background: #dcfce7; color: #15803d; border: 1px solid #86efac; padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: 600; }
                    .footer { margin-top: 30px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
                </style>
            </head>
            <body>
                <h1>🟢 Relatório de Horários Livres para Atendimento</h1>
                <div class="period">Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} | Total de vagas: ${totalFreeSlotsCount}</div>
                ${freeSlotsReport.map(day => `
                    <div class="day-box">
                        <div class="day-title">📅 ${day.dayName.toUpperCase()} — ${day.dateFormatted}</div>
                        ${day.doctors.map(doc => `
                            <div class="doc-box">
                                <div class="doc-name">👨‍⚕️ ${doc.name} <span class="doc-specialty">(${doc.specialty})</span></div>
                                <div class="slots">
                                    ${doc.freeSlots.map(slot => `<span class="slot-pill">${slot}</span>`).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
                <div class="footer">Sistema Clinigo — Relatório impresso de vagas da agenda</div>
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `

        printWindow.document.write(htmlContent)
        printWindow.document.close()
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl w-[95vw] p-4 md:p-6 rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
                <DialogHeader className="space-y-1 text-left border-b pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                            <Share2 className="h-5 w-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-lg md:text-xl font-bold">
                                Exportar Horários Livres
                            </DialogTitle>
                            <DialogDescription className="text-xs md:text-sm text-muted-foreground">
                                Compartilhe vagas disponíveis no WhatsApp, copie para texto ou imprima.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Controls Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 border-b bg-slate-50/50 dark:bg-slate-900/40 p-3 rounded-xl">
                    {/* Período */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <CalendarIcon className="h-3.5 w-3.5 text-emerald-600" />
                            Período de Seleção:
                        </label>
                        <Select value={period} onValueChange={(val: any) => setPeriod(val)}>
                            <SelectTrigger className="h-10 text-sm font-medium rounded-xl min-h-[44px]">
                                <SelectValue placeholder="Selecione o período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="today">Hoje ({format(selectedDate, 'dd/MM')})</SelectItem>
                                <SelectItem value="tomorrow">Amanhã ({format(addDays(selectedDate, 1), 'dd/MM')})</SelectItem>
                                <SelectItem value="week">Esta Semana (Seg-Sáb)</SelectItem>
                                <SelectItem value="next7days">Próximos 7 Dias</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Profissional */}
                    <div className="space-y-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                            Profissional:
                        </label>
                        <Select value={doctorFilter} onValueChange={(val) => setDoctorFilter(val)}>
                            <SelectTrigger className="h-10 text-sm font-medium rounded-xl min-h-[44px]">
                                <SelectValue placeholder="Todos os Profissionais" />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                <SelectItem value="all">Todos os Profissionais</SelectItem>
                                {doctorsList.filter((d: any) => d && d.id).map((doctor: any) => (
                                    <SelectItem key={doctor.id} value={doctor.id}>
                                        {doctor.user?.full_name || doctor.full_name || 'Profissional'}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Free Slots Report Preview Container */}
                <div className="flex-1 overflow-y-auto py-3 space-y-4 pr-1 scrollbar-thin">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            Vagas Encontradas:
                        </span>
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold px-2.5 py-0.5">
                            {totalFreeSlotsCount} horários vagos
                        </Badge>
                    </div>

                    {freeSlotsReport.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed rounded-xl bg-slate-50/50 dark:bg-slate-900/20">
                            <AlertCircle className="h-8 w-8 text-amber-500 mb-2 animate-pulse" />
                            <p className="font-semibold text-slate-800 dark:text-slate-200">
                                Nenhum horário livre encontrado
                            </p>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                Não há vagas abertas para os filtros selecionados ou todos os horários já foram preenchidos.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {freeSlotsReport.map((dayItem) => (
                                <div key={dayItem.dateFormatted} className="border rounded-xl p-3.5 bg-white dark:bg-slate-900 shadow-sm space-y-3">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <div className="flex items-center gap-2">
                                            <CalendarIcon className="h-4 w-4 text-emerald-600" />
                                            <span className="font-bold text-sm text-slate-800 dark:text-slate-100 capitalize">
                                                {dayItem.dayName}, {dayItem.dateFormatted}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-3 pl-1">
                                        {dayItem.doctors.map((doc) => (
                                            <div key={doc.id} className="space-y-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-xs text-sky-700 dark:text-sky-400 flex items-center gap-1">
                                                        👨‍⚕️ {doc.name}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        ({doc.specialty})
                                                    </span>
                                                </div>

                                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                    {doc.freeSlots.map((slot) => (
                                                        <Badge
                                                            key={slot}
                                                            variant="secondary"
                                                            className="bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-semibold text-xs px-2.5 py-1 min-h-[32px] flex items-center gap-1"
                                                        >
                                                            <Clock className="h-3 w-3 text-emerald-600" />
                                                            {slot}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Action Buttons */}
                <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-3 mt-1">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="w-full sm:w-auto h-11 text-sm font-semibold rounded-xl min-h-[44px]"
                    >
                        Fechar
                    </Button>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto ml-auto">
                        {/* Imprimir */}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrint}
                            disabled={totalFreeSlotsCount === 0}
                            className="h-11 text-sm font-semibold rounded-xl gap-2 min-h-[44px] border-slate-300"
                        >
                            <Printer className="h-4 w-4" />
                            <span>Imprimir / PDF</span>
                        </Button>

                        {/* WhatsApp Direct Share */}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleWhatsAppShare}
                            disabled={totalFreeSlotsCount === 0}
                            className="h-11 text-sm font-semibold rounded-xl gap-2 min-h-[44px] border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-200"
                        >
                            <Share2 className="h-4 w-4 text-emerald-600" />
                            <span>Enviar no WhatsApp</span>
                        </Button>

                        {/* Copiar para Área de Transferência */}
                        <Button
                            type="button"
                            onClick={handleCopyText}
                            disabled={totalFreeSlotsCount === 0}
                            className={cn(
                                "h-11 text-sm font-semibold rounded-xl gap-2 min-h-[44px] transition-all duration-200 text-white shadow-sm",
                                copied ? "bg-green-600 hover:bg-green-700" : "bg-emerald-600 hover:bg-emerald-700"
                            )}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4" />
                                    <span>Copiado!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4" />
                                    <span>Copiar Horários</span>
                                </>
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
