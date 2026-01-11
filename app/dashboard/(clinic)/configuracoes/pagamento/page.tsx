'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { Save, Loader2, Info, QrCode, Building2, FileText } from 'lucide-react'

const paymentSettingsSchema = z.object({
    pix_key: z.string().optional(),
    bank_account_info: z.string().optional(),
    payment_instructions: z.string().optional(),
})

type PaymentSettingsData = z.infer<typeof paymentSettingsSchema>

export default function PaymentSettingsPage() {
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isDirty },
    } = useForm<PaymentSettingsData>({
        resolver: zodResolver(paymentSettingsSchema),
        defaultValues: {
            pix_key: '',
            bank_account_info: '',
            payment_instructions: '',
        },
    })

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/clinics/me')
                if (res.ok) {
                    const data = await res.json()
                    if (data.data) {
                        setValue('pix_key', data.data.pix_key || '')
                        setValue('bank_account_info', data.data.bank_account_info || '')
                        setValue('payment_instructions', data.data.payment_instructions || '')
                    }
                }
            } catch (err) {
                console.error('Failed to fetch settings:', err)
            } finally {
                setInitialLoading(false)
            }
        }
        fetchSettings()
    }, [setValue])

    const onSubmit = async (data: PaymentSettingsData) => {
        setLoading(true)
        try {
            const res = await fetch('/api/clinics/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pix_key: data.pix_key || null,
                    bank_account_info: data.bank_account_info || null,
                    payment_instructions: data.payment_instructions || null,
                })
            })

            if (res.ok) {
                toast.success('Configurações de pagamento salvas!')
            } else {
                const error = await res.json()
                toast.error(error.message || 'Erro ao salvar configurações')
            }
        } catch (err) {
            toast.error('Erro de rede ao salvar')
        } finally {
            setLoading(false)
        }
    }

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-2xl font-bold">Configurações de Pagamento</h1>
                <p className="text-muted-foreground">
                    Configure como seus pacientes devem realizar o pagamento das consultas.
                </p>
            </div>

            <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                    Estas informações serão exibidas aos pacientes após o agendamento.
                    Você receberá uma notificação quando o paciente marcar &quot;Já paguei&quot;
                    e poderá confirmar o pagamento no dashboard.
                </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <QrCode className="h-5 w-5" />
                            Chave PIX
                        </CardTitle>
                        <CardDescription>
                            CPF, CNPJ, email, telefone ou chave aleatória
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Input
                            placeholder="exemplo@clinica.com.br ou 00.000.000/0001-00"
                            {...register('pix_key')}
                        />
                        {errors.pix_key && (
                            <p className="text-xs text-destructive mt-1">{errors.pix_key.message}</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            Dados Bancários
                        </CardTitle>
                        <CardDescription>
                            Para transferências bancárias (TED/DOC)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder={`Banco: 001 - Banco do Brasil
Agência: 1234-5
Conta Corrente: 67890-1
Titular: Clínica Exemplo LTDA
CNPJ: 00.000.000/0001-00`}
                            rows={6}
                            {...register('bank_account_info')}
                        />
                        {errors.bank_account_info && (
                            <p className="text-xs text-destructive mt-1">{errors.bank_account_info.message}</p>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Instruções Personalizadas
                        </CardTitle>
                        <CardDescription>
                            Orientações adicionais para o paciente
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="Realize o pagamento via PIX e envie o comprovante para nosso WhatsApp (21) 99999-9999. Após a confirmação, você receberá o link da consulta por email."
                            rows={4}
                            {...register('payment_instructions')}
                        />
                        {errors.payment_instructions && (
                            <p className="text-xs text-destructive mt-1">{errors.payment_instructions.message}</p>
                        )}
                    </CardContent>
                </Card>

                <Button type="submit" className="w-full" disabled={loading || !isDirty}>
                    {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                        <Save className="w-4 h-4 mr-2" />
                    )}
                    Salvar Configurações
                </Button>
            </form>
        </div>
    )
}
