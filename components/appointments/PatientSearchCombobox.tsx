'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Loader2, Plus, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'

export interface PatientSearchResult {
    id: string
    full_name: string
    cpf: string | null
    email: string | null
    phone: string | null
    date_of_birth: string | null
    match_type: 'exact' | 'partial'
}

interface PatientSearchComboboxProps {
    value?: string
    onSelect: (patient: PatientSearchResult | null) => void
    onCreateNew: () => void
    disabled?: boolean
    placeholder?: string
}

export function PatientSearchCombobox({
    value,
    onSelect,
    onCreateNew,
    disabled,
    placeholder = 'Buscar por CPF, nome ou telefone...',
}: PatientSearchComboboxProps) {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null)

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search)
        }, 500)

        return () => clearTimeout(timer)
    }, [search])

    // Fetch patients with caching
    const { data: patients, isLoading } = useQuery({
        queryKey: ['patient-search', debouncedSearch],
        queryFn: async () => {
            if (debouncedSearch.length < 2) return []
            const response = await fetch(`/api/patients/search?q=${encodeURIComponent(debouncedSearch)}`)
            if (!response.ok) throw new Error('Search failed')
            const data = await response.json()
            return data.data as PatientSearchResult[]
        },
        enabled: debouncedSearch.length >= 2,
        staleTime: 30 * 1000, // 30 seconds cache for search results
        gcTime: 2 * 60 * 1000, // 2 minutes garbage collection
    })

    const handleSelect = useCallback((patient: PatientSearchResult) => {
        setSelectedPatient(patient)
        onSelect(patient)
        setOpen(false)
    }, [onSelect])

    const handleCreateNew = useCallback(() => {
        setOpen(false)
        onCreateNew()
    }, [onCreateNew])

    // If value is provided externally, find and set the patient
    useEffect(() => {
        if (value && patients) {
            const found = patients.find(p => p.id === value)
            if (found) {
                setSelectedPatient(found)
            }
        }
    }, [value, patients])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between h-auto min-h-10 py-2"
                    disabled={disabled}
                >
                    {selectedPatient ? (
                        <div className="flex items-center gap-2 text-left">
                            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <div className="flex flex-col">
                                <span className="font-medium">{selectedPatient.full_name}</span>
                                <span className="text-xs text-muted-foreground">
                                    {selectedPatient.cpf || selectedPatient.phone || selectedPatient.email}
                                </span>
                            </div>
                        </div>
                    ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                    <CommandInput
                        placeholder={placeholder}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        {isLoading && (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span className="ml-2 text-sm text-muted-foreground">Buscando...</span>
                            </div>
                        )}

                        {!isLoading && debouncedSearch.length >= 2 && (!patients || patients.length === 0) && (
                            <CommandEmpty>
                                <div className="text-center py-4">
                                    <p className="text-sm text-muted-foreground mb-2">
                                        Nenhum paciente encontrado
                                    </p>
                                </div>
                            </CommandEmpty>
                        )}

                        {patients && patients.length > 0 && (
                            <CommandGroup heading="Pacientes encontrados">
                                {patients.map((patient) => (
                                    <CommandItem
                                        key={patient.id}
                                        value={patient.id}
                                        onSelect={() => handleSelect(patient)}
                                        className="cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3 w-full">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                <User className="h-4 w-4 text-primary" />
                                            </div>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="font-medium truncate">{patient.full_name}</span>
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {patient.cpf && `CPF: ${patient.cpf}`}
                                                    {patient.cpf && patient.phone && ' • '}
                                                    {patient.phone && `Tel: ${patient.phone}`}
                                                </span>
                                            </div>
                                            {selectedPatient?.id === patient.id && (
                                                <Check className="h-4 w-4 text-primary shrink-0" />
                                            )}
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}

                        <CommandSeparator />

                        <CommandGroup>
                            <CommandItem
                                onSelect={handleCreateNew}
                                className="cursor-pointer"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                <span>Cadastrar novo paciente</span>
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
