'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import PatientSelector from '@/components/prontuarios/patient-selector'
import {
    ClipboardList,
    Brain,
    Activity,
    Mic,
    Shapes,
    HeartHandshake,
    Sparkles,
    GraduationCap,
    BookOpen,
    ChevronDown,
} from 'lucide-react'

interface SessionPlansDropdownProps {
    patientId?: string
    clinicId?: string
    variant?: 'default' | 'outline' | 'secondary' | 'ghost'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    className?: string
    align?: 'start' | 'end' | 'center'
}

export function SessionPlansDropdown({
    patientId,
    clinicId,
    variant = 'outline',
    size = 'default',
    className = '',
    align = 'start',
}: SessionPlansDropdownProps) {
    const router = useRouter()
    const [specialties, setSpecialties] = useState<string[]>([])
    const [loading, setLoading] = useState(true)
    const [hasAccess, setHasAccess] = useState(false)

    // Estado do modal de seleção de paciente quando não há patientId
    const [selectedSpecialtyTarget, setSelectedSpecialtyTarget] = useState<string | null>(null)
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null)
    const [isPatientModalOpen, setIsPatientModalOpen] = useState(false)

    useEffect(() => {
        let isMounted = true

        async function fetchActiveSpecialties() {
            try {
                const res = await fetch('/api/planos-sessao/modulos-ativos')
                if (!res.ok) {
                    if (isMounted) {
                        setHasAccess(false)
                        setSpecialties([])
                        setLoading(false)
                    }
                    return
                }

                const data = await res.json()
                if (isMounted) {
                    if (data.success && Array.isArray(data.specialties) && data.specialties.length > 0) {
                        setHasAccess(true)
                        setSpecialties(data.specialties)
                    } else {
                        setHasAccess(false)
                        setSpecialties([])
                    }
                    setLoading(false)
                }
            } catch (err) {
                if (isMounted) {
                    setHasAccess(false)
                    setSpecialties([])
                    setLoading(false)
                }
            }
        }

        fetchActiveSpecialties()

        return () => {
            isMounted = false
        }
    }, [clinicId])

    const handleSpecialtyClick = (e: React.MouseEvent, specialtyPath: string) => {
        if (!patientId) {
            e.preventDefault()
            setSelectedSpecialtyTarget(specialtyPath)
            setSelectedPatientId(null)
            setIsPatientModalOpen(true)
        }
    }

    const handleConfirmPatientSelection = () => {
        if (!selectedPatientId || !selectedSpecialtyTarget) return
        setIsPatientModalOpen(false)
        if (selectedSpecialtyTarget === 'psicomotricidade') {
            router.push(`/dashboard/pacientes/${selectedPatientId}/psicomotricidade`)
        } else {
            router.push(`/dashboard/pacientes/${selectedPatientId}/planos-sessao/${selectedSpecialtyTarget}`)
        }
    }

    // Se a clínica não tem acesso à Allowlist ou nenhuma especialidade está ativa, não renderiza absolutamente nada
    if (loading || !hasAccess || specialties.length === 0) {
        return null
    }

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        type="button"
                        variant={variant}
                        className={`h-9 px-3 text-xs gap-1.5 font-medium border-border/70 hover:bg-muted text-foreground rounded-md shadow-sm transition-colors ${className}`}
                    >
                        <ClipboardList className="h-4 w-4 text-purple-600" />
                        <span>Planos de Sessão</span>
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-0.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align={align}
                    className="w-64 p-1.5 rounded-lg bg-popover border border-border shadow-lg z-50"
                >
                    <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
                        Especialidades Clínicas
                    </DropdownMenuLabel>

                    {/* 1. Psicomotricidade */}
                    {specialties.includes('psicomotricidade') && (
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md p-2 hover:bg-muted">
                            <Link
                                href={patientId ? `/dashboard/pacientes/${patientId}/psicomotricidade` : '#'}
                                onClick={(e) => handleSpecialtyClick(e, 'psicomotricidade')}
                                className="flex items-start gap-2.5"
                            >
                                <Brain className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-xs text-foreground">Psicomotricidade</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Ficha Capa e 55 Objetivos Motores
                                    </p>
                                </div>
                            </Link>
                        </DropdownMenuItem>
                    )}

                    {/* 2. Fisioterapia */}
                    {specialties.includes('fisioterapia') && (
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md p-2 hover:bg-muted">
                            <Link
                                href={patientId ? `/dashboard/pacientes/${patientId}/planos-sessao/fisioterapia` : '#'}
                                onClick={(e) => handleSpecialtyClick(e, 'fisioterapia')}
                                className="flex items-start gap-2.5"
                            >
                                <Activity className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-xs text-foreground">Fisioterapia</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        14 Categorias Motoras (MOB, POS, EQU...)
                                    </p>
                                </div>
                            </Link>
                        </DropdownMenuItem>
                    )}

                    {/* 3. Fonoaudiologia */}
                    {specialties.includes('fonoaudiologia') && (
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md p-2 hover:bg-muted">
                            <Link
                                href={patientId ? `/dashboard/pacientes/${patientId}/planos-sessao/fonoaudiologia` : '#'}
                                onClick={(e) => handleSpecialtyClick(e, 'fonoaudiologia')}
                                className="flex items-start gap-2.5"
                            >
                                <Mic className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-xs text-foreground">Fonoaudiologia</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Linguagem, Fala, MO e CAA
                                    </p>
                                </div>
                            </Link>
                        </DropdownMenuItem>
                    )}

                    {/* 4. Intervenção Precoce (ABA) */}
                    {specialties.includes('intervencao_precoce_aba') && (
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md p-2 hover:bg-muted">
                            <Link
                                href={patientId ? `/dashboard/pacientes/${patientId}/planos-sessao/intervencao-precoce-aba` : '#'}
                                onClick={(e) => handleSpecialtyClick(e, 'intervencao-precoce-aba')}
                                className="flex items-start gap-2.5"
                            >
                                <Shapes className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-xs text-foreground">Intervenção Precoce (ABA)</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        DTT, NET e Comunicação Funcional
                                    </p>
                                </div>
                            </Link>
                        </DropdownMenuItem>
                    )}

                    {/* 5. Psicologia */}
                    {specialties.includes('psicologia') && (
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md p-2 hover:bg-muted">
                            <Link
                                href={patientId ? `/dashboard/pacientes/${patientId}/planos-sessao/psicologia` : '#'}
                                onClick={(e) => handleSpecialtyClick(e, 'psicologia')}
                                className="flex items-start gap-2.5"
                            >
                                <HeartHandshake className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-xs text-foreground">Psicologia</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Regulação, Emoções e Habilidades Sociais
                                    </p>
                                </div>
                            </Link>
                        </DropdownMenuItem>
                    )}

                    {/* 6. Terapia Ocupacional */}
                    {specialties.includes('terapia_ocupacional') && (
                        <DropdownMenuItem asChild className="cursor-pointer rounded-md p-2 hover:bg-muted">
                            <Link
                                href={patientId ? `/dashboard/pacientes/${patientId}/planos-sessao/terapia-ocupacional` : '#'}
                                onClick={(e) => handleSpecialtyClick(e, 'terapia-ocupacional')}
                                className="flex items-start gap-2.5"
                            >
                                <Sparkles className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                                <div>
                                    <p className="font-medium text-xs text-foreground">Terapia Ocupacional</p>
                                    <p className="text-[10px] text-muted-foreground">
                                        Sensorial, AVDs e Coordenação Motora
                                    </p>
                                </div>
                            </Link>
                        </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator className="my-1" />

                    {/* 7. Manual de Evolução Terapêutica (Restrito às 2 clínicas) */}
                    <DropdownMenuItem asChild className="cursor-pointer rounded-md p-2 hover:bg-muted">
                        <Link href="/dashboard/manual-evolucao" className="flex items-start gap-2.5">
                            <BookOpen className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                            <div>
                                <p className="font-medium text-xs text-foreground">Manual de Evolução</p>
                                <p className="text-[10px] text-muted-foreground">
                                    Diretrizes, 5 frases e Checklist World Sensory
                                </p>
                            </div>
                        </Link>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Modal de Seleção de Paciente quando acionado a partir de listagens gerais */}
            <Dialog open={isPatientModalOpen} onOpenChange={setIsPatientModalOpen}>
                <DialogContent className="max-w-md w-[95vw] sm:w-full p-6">
                    <DialogHeader>
                        <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
                            <ClipboardList className="w-5 h-5" />
                        </div>
                        <DialogTitle className="text-lg font-bold text-foreground">
                            Selecionar Paciente para Plano de Sessão
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Selecione o paciente para abrir diretamente a Ficha Capa e os Planos de Sessão da especialidade.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-3">
                        <label className="text-xs font-semibold text-foreground mb-1.5 block">
                            Buscar Paciente
                        </label>
                        <PatientSelector
                            value={selectedPatientId}
                            onChange={(id) => setSelectedPatientId(id)}
                        />
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            className="w-full sm:w-auto h-10 min-h-[44px]"
                            onClick={() => {
                                setIsPatientModalOpen(false)
                                setSelectedPatientId(null)
                                setSelectedSpecialtyTarget(null)
                            }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            disabled={!selectedPatientId}
                            className="w-full sm:w-auto h-10 min-h-[44px] bg-purple-600 hover:bg-purple-700 text-white font-medium"
                            onClick={handleConfirmPatientSelection}
                        >
                            Acessar Especialidade
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}

