'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Copy, Check, Users, Plus } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Validation schema
const schema = z.object({
    full_name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
    email: z.string().email('Email inválido'),
    cpf: z.string()
        .transform(val => val.replace(/\D/g, ''))
        .refine(val => val.length === 11, 'CPF deve ter 11 dígitos'),
    phone: z.string()
        .transform(val => val.replace(/\D/g, ''))
        .refine(val => val.length >= 10, 'Telefone inválido'),
    pix_key_type: z.enum(['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'RANDOM']),
    pix_key: z.string().min(1, 'Chave Pix obrigatória'),
    cnpj: z.string().optional(),
    company_name: z.string().optional()
})

type FormData = z.infer<typeof schema>

export default function PartnerRegisterPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [registeredCode, setRegisteredCode] = useState<string | null>(null)
    const [registeredId, setRegisteredId] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors }
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: {
            pix_key_type: 'CPF'
        }
    })

    const onSubmit = async (data: FormData) => {
        setIsLoading(true)

        try {
            const response = await fetch('/api/partners/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.error || 'Erro ao cadastrar')
            }

            setRegisteredCode(result.referral_code)
            setRegisteredId(result.partner_id)
            toast.success('Cadastro realizado com sucesso!')
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const copyCode = () => {
        if (registeredCode) {
            navigator.clipboard.writeText(registeredCode)
            setCopied(true)
            toast.success('Código copiado!')
            setTimeout(() => setCopied(false), 2000)
        }
    }

    // Success screen
    if (registeredCode) {
        const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.clinigo.app'}/cadastro?ref=${registeredCode}`

        return (
            <div className="min-h-screen bg-navy-deep flex items-center justify-center p-4">
                <Card className="max-w-lg w-full bg-slate-900 border-slate-800 text-white">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-teal-vibrant/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Plus className="w-8 h-8 text-teal-vibrant" />
                        </div>
                        <CardTitle className="text-2xl text-white">🎉 Cadastro Concluído!</CardTitle>
                        <CardDescription className="text-slate-400">
                            Você agora é um parceiro CliniGo
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="text-center">
                            <p className="text-sm text-slate-400 mb-2">Seu código de parceiro:</p>
                            <div className="flex items-center justify-center gap-2">
                                <span className="text-3xl font-bold text-teal-vibrant font-mono">
                                    {registeredCode}
                                </span>
                                <Button variant="outline" size="icon" onClick={copyCode} className="border-slate-700 hover:bg-slate-800">
                                    {copied ? (
                                        <Check className="w-4 h-4 text-teal-vibrant" />
                                    ) : (
                                        <Copy className="w-4 h-4 text-slate-400" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                            <h4 className="font-medium mb-2 text-white">📋 Como usar:</h4>
                            <ol className="list-decimal list-inside space-y-1 text-sm text-slate-400">
                                <li>Compartilhe este código com clínicas</li>
                                <li>Elas devem inseri-lo ao se cadastrar</li>
                                <li>Você ganha <strong className="text-teal-vibrant">30%</strong> da 1ª mensalidade (uma vez por venda)</li>
                                <li>Pagamento no dia 5 do mês seguinte via Pix</li>
                            </ol>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-slate-400">Link de indicação:</Label>
                            <div className="flex gap-2">
                                <Input value={shareUrl} readOnly className="text-xs bg-slate-800 border-slate-700 text-slate-300" />
                                <Button
                                    variant="outline"
                                    className="border-slate-700 hover:bg-slate-800"
                                    onClick={() => {
                                        navigator.clipboard.writeText(shareUrl)
                                        toast.success('Link copiado!')
                                    }}
                                >
                                    <Copy className="w-4 h-4 text-slate-400" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1 border-slate-700 hover:bg-slate-800 text-white"
                                onClick={() => router.push(`/partners/${registeredId}/dashboard`)}
                            >
                                <Users className="w-4 h-4 mr-2" />
                                Ir para Dashboard
                            </Button>
                            <Button
                                className="flex-1 bg-teal-vibrant hover:bg-teal-vibrant/90 text-navy-deep font-bold"
                                onClick={() => router.push('/')}
                            >
                                Voltar ao Início
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Registration form
    return (
        <div className="min-h-screen bg-navy-deep">
            {/* Header */}
            <div className="border-b border-slate-800 bg-navy-deep/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <Link href="/" className="inline-flex items-center">
                        <Image src="/logo-clinigo.png" alt="CliniGo" width={140} height={35} className="h-9 w-auto" />
                    </Link>
                    <Link href="/" className="text-sm text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="w-4 h-4 inline mr-1" />
                        Voltar
                    </Link>
                </div>
            </div>

            <div className="container mx-auto px-4 py-12">
                <div className="max-w-xl mx-auto">
                    {/* Intro */}
                    <div className="text-center mb-8">
                        <div className="mx-auto bg-teal-vibrant/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Plus className="w-8 h-8 text-teal-vibrant" />
                        </div>
                        <h1 className="text-3xl font-bold mb-2 text-white">Seja um Parceiro CliniGo</h1>
                        <p className="text-slate-400">
                            Ganhe <strong className="text-teal-vibrant">30% de comissão</strong> sobre a primeira mensalidade de cada clínica que você vender
                        </p>
                    </div>

                    {/* Benefits */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="text-center p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                            <div className="text-2xl font-bold text-teal-vibrant">30%</div>
                            <div className="text-xs text-slate-400">Por venda</div>
                        </div>
                        <div className="text-center p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                            <div className="text-2xl font-bold text-teal-vibrant">∞</div>
                            <div className="text-xs text-slate-400">Sem limite</div>
                        </div>
                        <div className="text-center p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                            <div className="text-2xl font-bold text-teal-vibrant">Dia 5</div>
                            <div className="text-xs text-slate-400">Pagamento via Pix</div>
                        </div>
                    </div>

                    {/* Form */}
                    <Card className="bg-slate-900 border-slate-800">
                        <CardHeader>
                            <CardTitle className="text-white">Cadastre-se como Parceiro</CardTitle>
                            <CardDescription className="text-slate-400">
                                Preencha seus dados para receber seu código exclusivo
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="full_name" className="text-slate-300">Nome Completo *</Label>
                                    <Input
                                        id="full_name"
                                        placeholder="João da Silva"
                                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                        {...register('full_name')}
                                    />
                                    {errors.full_name && (
                                        <p className="text-xs text-red-400">{errors.full_name.message}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-slate-300">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="joao@email.com"
                                        className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                        {...register('email')}
                                    />
                                    {errors.email && (
                                        <p className="text-xs text-red-400">{errors.email.message}</p>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="cpf" className="text-slate-300">CPF * (apenas números)</Label>
                                        <Input
                                            id="cpf"
                                            placeholder="12345678900"
                                            maxLength={11}
                                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                            {...register('cpf')}
                                        />
                                        {errors.cpf && (
                                            <p className="text-xs text-red-400">{errors.cpf.message}</p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone" className="text-slate-300">Telefone *</Label>
                                        <Input
                                            id="phone"
                                            placeholder="11999999999"
                                            maxLength={11}
                                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                            {...register('phone')}
                                        />
                                        {errors.phone && (
                                            <p className="text-xs text-red-400">{errors.phone.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pix_key_type" className="text-slate-300">Tipo de Chave Pix *</Label>
                                        <Select
                                            value={watch('pix_key_type')}
                                            onValueChange={(value: any) => setValue('pix_key_type', value)}
                                        >
                                            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                                <SelectItem value="CPF" className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white">CPF</SelectItem>
                                                <SelectItem value="CNPJ" className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white">CNPJ</SelectItem>
                                                <SelectItem value="EMAIL" className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white">Email</SelectItem>
                                                <SelectItem value="PHONE" className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white">Telefone</SelectItem>
                                                <SelectItem value="RANDOM" className="text-white hover:bg-slate-700 focus:bg-slate-700 focus:text-white">Aleatória</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="pix_key" className="text-slate-300">Chave Pix *</Label>
                                        <Input
                                            id="pix_key"
                                            placeholder="Sua chave Pix"
                                            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                            {...register('pix_key')}
                                        />
                                        {errors.pix_key && (
                                            <p className="text-xs text-red-400">{errors.pix_key.message}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-slate-800 pt-4 mt-4">
                                    <p className="text-sm text-slate-400 mb-4">
                                        <strong className="text-slate-300">Dados Empresariais</strong> (Opcional - recomendado para ganhos acima de R$ 3.000/mês)
                                    </p>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="cnpj" className="text-slate-300">CNPJ</Label>
                                            <Input
                                                id="cnpj"
                                                placeholder="00.000.000/0000-00"
                                                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                                {...register('cnpj')}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="company_name" className="text-slate-300">Razão Social</Label>
                                            <Input
                                                id="company_name"
                                                placeholder="Empresa Ltda"
                                                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                                                {...register('company_name')}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-teal-vibrant hover:bg-teal-vibrant/90 text-navy-deep font-bold"
                                    size="lg"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Cadastrando...
                                        </>
                                    ) : (
                                        'Cadastrar como Parceiro'
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}

