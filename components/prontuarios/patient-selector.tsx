'use client'

import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface Patient {
    id: string
    full_name: string
    cpf: string | null
    birth_date: string | null
    phone: string | null
    email: string | null
}

interface PatientSelectorProps {
    value: string | null
    onChange: (patientId: string | null) => void
    onNewPatient?: () => void
}

export default function PatientSelector({
    value,
    onChange,
    onNewPatient,
}: PatientSelectorProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [patients, setPatients] = useState<Patient[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)

    useEffect(() => {
        if (open) {
            loadPatients()
        }
    }, [open, search])

    useEffect(() => {
        if (value && patients.length > 0) {
            const patient = patients.find(p => p.id === value)
            setSelectedPatient(patient || null)
        } else if (!value) {
            setSelectedPatient(null)
        }
    }, [value, patients])

    async function loadPatients() {
        setLoading(true)
        try {
            const params = new URLSearchParams()
            if (search) params.append('search', search)

            const res = await fetch(`/api/patients?${params}`)
            if (res.ok) {
                const data = await res.json()
                setPatients(data.patients || [])
            }
        } catch (error) {
            console.error('Error loading patients:', error)
        } finally {
            setLoading(false)
        }
    }

    function calculateAge(birthDate: string | null): number | null {
        if (!birthDate) return null
        const today = new Date()
        const birth = new Date(birthDate)
        let age = today.getFullYear() - birth.getFullYear()
        const monthDiff = today.getMonth() - birth.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--
        }
        return age
    }

    function formatCPF(cpf: string | null): string {
        if (!cpf) return ''
        return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    }

    return (
        <div className="space-y-2">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-auto py-3"
                    >
                        {selectedPatient ? (
                            <div className="flex items-center gap-3 flex-1 text-left">
                                <Avatar className="h-8 w-8">
                                    <AvatarFallback>
                                        {selectedPatient.full_name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate">
                                        {selectedPatient.full_name}
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        {selectedPatient.cpf && (
                                            <span>CPF: {formatCPF(selectedPatient.cpf)}</span>
                                        )}
                                        {selectedPatient.birth_date && (
                                            <Badge variant="secondary" className="text-xs">
                                                {calculateAge(selectedPatient.birth_date)} anos
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <span className="text-muted-foreground">
                                Selecione um paciente...
                            </span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[500px] p-0" align="start">
                    <Command>
                        <CommandInput
                            placeholder="Buscar paciente por nome, CPF..."
                            value={search}
                            onValueChange={setSearch}
                        />
                        <CommandList>
                            <CommandEmpty>
                                <div className="py-6 text-center">
                                    <User className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-sm text-muted-foreground mb-3">
                                        Nenhum paciente encontrado
                                    </p>
                                    {onNewPatient && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setOpen(false)
                                                onNewPatient()
                                            }}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            Cadastrar Novo Paciente
                                        </Button>
                                    )}
                                </div>
                            </CommandEmpty>
                            <CommandGroup>
                                {loading ? (
                                    <div className="py-6 text-center text-sm text-muted-foreground">
                                        Carregando...
                                    </div>
                                ) : (
                                    patients.map((patient) => (
                                        <CommandItem
                                            key={patient.id}
                                            value={patient.id}
                                            onSelect={() => {
                                                onChange(patient.id === value ? null : patient.id)
                                                setOpen(false)
                                            }}
                                            className="p-3"
                                        >
                                            <div className="flex items-center gap-3 flex-1">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback>
                                                        {patient.full_name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium truncate">
                                                        {patient.full_name}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                                        {patient.cpf && (
                                                            <span>CPF: {formatCPF(patient.cpf)}</span>
                                                        )}
                                                        {patient.birth_date && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                {calculateAge(patient.birth_date)} anos
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <Check
                                                    className={cn(
                                                        'h-4 w-4',
                                                        value === patient.id ? 'opacity-100' : 'opacity-0'
                                                    )}
                                                />
                                            </div>
                                        </CommandItem>
                                    ))
                                )}
                            </CommandGroup>
                        </CommandList>
                    </Command>

                    {onNewPatient && !loading && patients.length > 0 && (
                        <div className="border-t p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => {
                                    setOpen(false)
                                    onNewPatient()
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Cadastrar Novo Paciente
                            </Button>
                        </div>
                    )}
                </PopoverContent>
            </Popover>
        </div>
    )
}
