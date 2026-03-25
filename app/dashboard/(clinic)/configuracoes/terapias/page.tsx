'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Stethoscope, Plus, X, Loader2, Save, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

const DEFAULT_THERAPY_TYPES = [
    'Psicologia ABA',
    'Psicologia TCC',
    'Fonoaudiologia',
    'Terapia Ocupacional',
    'Psicomotricidade',
    'Psicopedagogia',
    'Musicoterapia',
    'Nutrição',
    'AT Escolar',
    'AT Domiciliar',
    'Estagiária',
    'Outros',
]

export default function TerapiasPage() {
    const [therapyTypes, setTherapyTypes] = useState<string[]>([])
    const [newTherapy, setNewTherapy] = useState('')
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [originalTypes, setOriginalTypes] = useState<string[]>([])

    useEffect(() => {
        fetchTherapyTypes()
    }, [])

    const fetchTherapyTypes = async () => {
        try {
            setIsLoading(true)
            const res = await fetch('/api/settings/therapy-types')
            const json = await res.json()
            const types = json.data && Array.isArray(json.data) && json.data.length > 0
                ? json.data
                : DEFAULT_THERAPY_TYPES
            setTherapyTypes(types)
            setOriginalTypes(types)
        } catch {
            setTherapyTypes(DEFAULT_THERAPY_TYPES)
            setOriginalTypes(DEFAULT_THERAPY_TYPES)
        } finally {
            setIsLoading(false)
        }
    }

    const handleAdd = () => {
        const trimmed = newTherapy.trim()
        if (!trimmed) {
            toast.error('Digite o nome da terapia')
            return
        }
        if (therapyTypes.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
            toast.error('Essa terapia já existe na lista')
            return
        }
        setTherapyTypes(prev => [...prev, trimmed])
        setNewTherapy('')
        setHasChanges(true)
    }

    const handleRemove = (index: number) => {
        if (therapyTypes.length <= 1) {
            toast.error('É necessário pelo menos uma terapia')
            return
        }
        setTherapyTypes(prev => prev.filter((_, i) => i !== index))
        setHasChanges(true)
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const res = await fetch('/api/settings/therapy-types', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ therapy_types: therapyTypes }),
            })
            const json = await res.json()
            if (json.error) throw new Error(json.error)
            toast.success('Terapias salvas com sucesso!')
            setOriginalTypes(therapyTypes)
            setHasChanges(false)
        } catch (err: any) {
            toast.error(err.message || 'Erro ao salvar')
        } finally {
            setIsSaving(false)
        }
    }

    const handleReset = () => {
        setTherapyTypes(DEFAULT_THERAPY_TYPES)
        setHasChanges(true)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleAdd()
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Stethoscope className="w-6 h-6" />
                        Tipos de Terapia
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie as nomenclaturas de terapias disponíveis para sua clínica
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleReset} title="Restaurar lista padrão">
                        <RotateCcw className="w-4 h-4 mr-2" />
                        Restaurar Padrão
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        <Save className="w-4 h-4 mr-2" />
                        Salvar
                    </Button>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Terapias Cadastradas</CardTitle>
                    <CardDescription>
                        Estas terapias aparecem nos selects de reembolso, sugestão de horários e templates de prontuário.
                        Adicione ou remova conforme necessidade.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Adicionar nova terapia */}
                    <div className="flex gap-2">
                        <Input
                            placeholder="Nome da nova terapia..."
                            value={newTherapy}
                            onChange={(e) => setNewTherapy(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="max-w-sm"
                        />
                        <Button onClick={handleAdd} variant="outline">
                            <Plus className="w-4 h-4 mr-2" />
                            Adicionar
                        </Button>
                    </div>

                    {/* Lista de terapias */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin" />
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {therapyTypes.map((therapy, index) => (
                                <Badge
                                    key={`${therapy}-${index}`}
                                    variant="secondary"
                                    className="text-sm py-1.5 px-3 flex items-center gap-1.5 hover:bg-secondary/80 transition-colors"
                                >
                                    {therapy}
                                    <button
                                        onClick={() => handleRemove(index)}
                                        className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                                        title={`Remover ${therapy}`}
                                    >
                                        <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    )}

                    {hasChanges && (
                        <p className="text-sm text-amber-600 flex items-center gap-1">
                            ⚠️ Você tem alterações não salvas. Clique em &quot;Salvar&quot; para aplicar.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
