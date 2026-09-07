'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Loader2, Upload, User, Save, MapPin, ChevronDown, ChevronUp, CheckCircle2, Phone, Mail } from 'lucide-react'

const profileFormSchema = z.object({
    name: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres'),
    email: z.string().email('E-mail inválido').optional().or(z.literal('')),
    phone: z.string().max(25, 'Telefone inválido').optional().or(z.literal('')),
    cpf: z.string().max(20, 'CPF inválido').optional().or(z.literal('')),
    birth_date: z.string().optional().or(z.literal('')),
    gender: z.string().optional().or(z.literal('')),
    bio: z.string().max(1000, 'Máximo 1000 caracteres').optional().or(z.literal('')),
    address_zipcode: z.string().optional().or(z.literal('')),
    address_street: z.string().optional().or(z.literal('')),
    address_number: z.string().optional().or(z.literal('')),
    address_complement: z.string().optional().or(z.literal('')),
    address_neighborhood: z.string().optional().or(z.literal('')),
    address_city: z.string().optional().or(z.literal('')),
    address_state: z.string().optional().or(z.literal('')),
})

type ProfileFormData = z.infer<typeof profileFormSchema>

export default function GeneralInfoTab() {
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [avatarUploading, setAvatarUploading] = useState(false)
    const [userData, setUserData] = useState<any>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [showAddressSection, setShowAddressSection] = useState(false)

    const form = useForm<ProfileFormData>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            cpf: '',
            birth_date: '',
            gender: undefined,
            bio: '',
            address_zipcode: '',
            address_street: '',
            address_number: '',
            address_complement: '',
            address_neighborhood: '',
            address_city: '',
            address_state: '',
        },
    })

    useEffect(() => {
        loadProfile()
    }, [])

    async function loadProfile() {
        try {
            setInitialLoading(true)
            const res = await fetch('/api/profile')
            if (res.ok) {
                const data = await res.json()
                const user = data.user || {}
                setUserData(user)
                setAvatarPreview(user.avatar_url || null)

                form.reset({
                    name: user.full_name || user.name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    cpf: user.cpf || '',
                    birth_date: user.birth_date ? String(user.birth_date).split('T')[0] : '',
                    gender: user.gender || undefined,
                    bio: user.bio || '',
                    address_zipcode: user.address_zipcode || '',
                    address_street: user.address_street || '',
                    address_number: user.address_number || '',
                    address_complement: user.address_complement || '',
                    address_neighborhood: user.address_neighborhood || '',
                    address_city: user.address_city || '',
                    address_state: user.address_state || '',
                })

                if (user.address_zipcode || user.address_street || user.address_city) {
                    setShowAddressSection(true)
                }
            } else {
                toast.error('Não foi possível carregar os dados do perfil')
            }
        } catch (error) {
            toast.error('Erro de conexão ao carregar perfil')
        } finally {
            setInitialLoading(false)
        }
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Arquivo muito grande. O limite máximo é de 5MB.')
            return
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error('Formato de imagem inválido. Utilize JPG, PNG ou WebP.')
            return
        }

        setAvatarUploading(true)

        try {
            const reader = new FileReader()
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string)
            }
            reader.readAsDataURL(file)

            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/profile/avatar', {
                method: 'POST',
                body: formData,
            })

            if (res.ok) {
                const data = await res.json()
                const newAvatarUrl = data.avatar_url
                setAvatarPreview(newAvatarUrl)
                toast.success('Foto de perfil atualizada com sucesso!')

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent('user-profile-updated', {
                            detail: { avatar_url: newAvatarUrl },
                        })
                    )
                }
            } else {
                const error = await res.json()
                toast.error(error.error || 'Erro ao enviar foto de perfil')
                setAvatarPreview(userData?.avatar_url || null)
            }
        } catch (error) {
            toast.error('Falha no upload da foto de perfil')
            setAvatarPreview(userData?.avatar_url || null)
        } finally {
            setAvatarUploading(false)
        }
    }

    async function onSubmit(data: ProfileFormData) {
        setLoading(true)
        try {
            const payload = {
                name: data.name.trim(),
                full_name: data.name.trim(),
                phone: data.phone?.trim() || null,
                cpf: data.cpf?.trim() || null,
                birth_date: data.birth_date || null,
                gender: data.gender || null,
                bio: data.bio?.trim() || null,
                address_zipcode: data.address_zipcode?.trim() || null,
                address_street: data.address_street?.trim() || null,
                address_number: data.address_number?.trim() || null,
                address_complement: data.address_complement?.trim() || null,
                address_neighborhood: data.address_neighborhood?.trim() || null,
                address_city: data.address_city?.trim() || null,
                address_state: data.address_state?.trim() || null,
            }

            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (res.ok) {
                const responseData = await res.json()
                const updatedName = responseData?.user?.full_name || payload.name

                toast.success('Perfil atualizado com sucesso!')

                if (typeof window !== 'undefined') {
                    window.dispatchEvent(
                        new CustomEvent('user-profile-updated', {
                            detail: { full_name: updatedName },
                        })
                    )
                }

                setUserData((prev: any) => ({
                    ...prev,
                    ...responseData.user,
                    full_name: updatedName,
                    name: updatedName,
                }))
            } else {
                const error = await res.json()
                toast.error(error.error || 'Erro ao salvar alterações')
            }
        } catch (error) {
            toast.error('Erro ao conectar ao servidor para salvar')
        } finally {
            setLoading(false)
        }
    }

    async function searchZipCode(zipcode: string) {
        const clean = zipcode.replace(/\D/g, '')
        if (clean.length !== 8) return

        try {
            const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`)
            if (res.ok) {
                const data = await res.json()
                if (!data.erro) {
                    form.setValue('address_street', data.logradouro || '')
                    form.setValue('address_neighborhood', data.bairro || '')
                    form.setValue('address_city', data.localidade || '')
                    form.setValue('address_state', data.uf || '')
                    toast.success('Endereço localizado pelo CEP')
                }
            }
        } catch (error) {
            // Silencioso
        }
    }

    const getInitials = (name: string) => {
        if (!name) return '??'
        return name
            .split(' ')
            .filter(Boolean)
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
    }

    if (initialLoading) {
        return (
            <Card className="border-border/60 shadow-sm p-12 text-center">
                <div className="flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground font-medium">Carregando dados do perfil...</p>
                </div>
            </Card>
        )
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Card 1: Foto e Identificacao Rapida */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-foreground">Foto de Identificação</CardTitle>
                        <CardDescription>Esta foto é utilizada no cabeçalho do sistema, prontuários e assinaturas digitais</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row items-center gap-6 pt-0">
                        <Avatar className="h-20 w-20 sm:h-24 sm:w-24 border-2 border-primary/20 shadow-sm">
                            <AvatarImage src={avatarPreview || undefined} />
                            <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                                {form.watch('name') ? getInitials(form.watch('name')) : <User className="h-8 w-8" />}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex flex-col items-center sm:items-start gap-2">
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleAvatarUpload}
                                className="hidden"
                                disabled={avatarUploading}
                            />
                            <label htmlFor="avatar-upload">
                                <Button
                                    asChild
                                    variant="outline"
                                    size="sm"
                                    disabled={avatarUploading}
                                    className="cursor-pointer min-h-[40px] px-4 font-medium"
                                >
                                    <span>
                                        {avatarUploading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                                                Enviando imagem...
                                            </>
                                        ) : (
                                            <>
                                                <Upload className="mr-2 h-4 w-4 text-primary" />
                                                Alterar Foto
                                            </>
                                        )}
                                    </span>
                                </Button>
                            </label>
                            <p className="text-xs text-muted-foreground">
                                Formatos aceitos: JPG, PNG ou WebP. Tamanho máximo: 5MB.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Card 2: Dados Pessoais Principais */}
                <Card className="border-border/60 shadow-sm">
                    <CardHeader className="pb-4 border-b">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold text-foreground">Dados Pessoais</CardTitle>
                                <CardDescription>Altere seu nome completo e informações de contato direto</CardDescription>
                            </div>
                            <Badge variant="outline" className="hidden sm:flex items-center gap-1 text-emerald-700 border-emerald-300 bg-emerald-50">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                Conta Ativa
                            </Badge>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-6">
                        {/* Campo Principal: Nome Completo com Maximo Destaque */}
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5">
                                    <FormLabel className="text-base font-semibold text-foreground flex items-center justify-between">
                                        <span>Nome Completo *</span>
                                        <span className="text-xs font-normal text-muted-foreground">Visível na agenda e receituários</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            {...field}
                                            placeholder="Digite seu nome completo"
                                            className="h-11 text-base font-medium border-primary/40 focus-visible:ring-primary shadow-xs"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                            {/* E-mail de Acesso */}
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span>E-mail de Acesso</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="email"
                                                disabled
                                                className="h-10 bg-muted/50 cursor-not-allowed border-dashed text-muted-foreground"
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs">
                                            Para alterar seu e-mail, acesse a aba Segurança e Senha.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Telefone / WhatsApp */}
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-sm font-medium text-foreground flex items-center gap-1.5">
                                            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                            <span>Telefone / WhatsApp</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="(00) 00000-0000"
                                                className="h-10"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* CPF */}
                            <FormField
                                control={form.control}
                                name="cpf"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-sm font-medium text-foreground">CPF</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                placeholder="000.000.000-00"
                                                className="h-10"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Data de Nascimento */}
                            <FormField
                                control={form.control}
                                name="birth_date"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5">
                                        <FormLabel className="text-sm font-medium text-foreground">Data de Nascimento</FormLabel>
                                        <FormControl>
                                            <Input
                                                {...field}
                                                type="date"
                                                className="h-10"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Genero */}
                            <FormField
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                    <FormItem className="space-y-1.5 md:col-span-2">
                                        <FormLabel className="text-sm font-medium text-foreground">Gênero</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                                            <FormControl>
                                                <SelectTrigger className="h-10">
                                                    <SelectValue placeholder="Selecione o gênero (opcional)" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="feminino">Feminino</SelectItem>
                                                <SelectItem value="masculino">Masculino</SelectItem>
                                                <SelectItem value="outro">Outro</SelectItem>
                                                <SelectItem value="prefiro_nao_dizer">Prefiro não declarar</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Apresentacao / Bio */}
                        <FormField
                            control={form.control}
                            name="bio"
                            render={({ field }) => (
                                <FormItem className="space-y-1.5 pt-2">
                                    <FormLabel className="text-sm font-medium text-foreground flex items-center justify-between">
                                        <span>Sobre você / Apresentação Profissional</span>
                                        <span className="text-xs font-normal text-muted-foreground">Opcional</span>
                                    </FormLabel>
                                    <FormControl>
                                        <Textarea
                                            {...field}
                                            placeholder="Breve resumo da sua formação, áreas de atuação ou recado profissional..."
                                            rows={3}
                                            className="resize-none"
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Secao Colapsavel de Endereco */}
                        <div className="pt-2 border-t">
                            <button
                                type="button"
                                onClick={() => setShowAddressSection(!showAddressSection)}
                                className="flex items-center justify-between w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <span>Endereço Residencial ou Comercial (Opcional)</span>
                                </span>
                                {showAddressSection ? (
                                    <ChevronUp className="h-4 w-4" />
                                ) : (
                                    <ChevronDown className="h-4 w-4" />
                                )}
                            </button>

                            {showAddressSection && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 mt-2 bg-muted/20 p-4 rounded-xl border border-border/50">
                                    <FormField
                                        control={form.control}
                                        name="address_zipcode"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-xs font-medium text-foreground">CEP</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        placeholder="00000-000"
                                                        onBlur={(e) => searchZipCode(e.target.value)}
                                                        className="h-9 text-sm"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="address_street"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1 md:col-span-2">
                                                <FormLabel className="text-xs font-medium text-foreground">Logradouro / Rua</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Nome da rua ou avenida" className="h-9 text-sm" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="address_number"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-xs font-medium text-foreground">Número</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Número" className="h-9 text-sm" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="address_complement"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1 md:col-span-2">
                                                <FormLabel className="text-xs font-medium text-foreground">Complemento / Sala</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Apto, Bloco, Sala" className="h-9 text-sm" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="address_neighborhood"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-xs font-medium text-foreground">Bairro</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Bairro" className="h-9 text-sm" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="address_city"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-xs font-medium text-foreground">Cidade</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="Cidade" className="h-9 text-sm" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="address_state"
                                        render={({ field }) => (
                                            <FormItem className="space-y-1">
                                                <FormLabel className="text-xs font-medium text-foreground">UF</FormLabel>
                                                <FormControl>
                                                    <Input {...field} placeholder="UF" maxLength={2} className="h-9 text-sm uppercase" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4 bg-muted/10">
                        <p className="text-xs text-muted-foreground text-center sm:text-left">
                            As alterações entram em vigor imediatamente após salvar.
                        </p>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => loadProfile()}
                                disabled={loading}
                                className="min-h-[44px] flex-1 sm:flex-none"
                            >
                                Cancelar
                            </Button>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="min-h-[44px] px-6 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none shadow-sm"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando alterações...
                                    </>
                                ) : (
                                    <>
                                        <Save className="mr-2 h-4 w-4" />
                                        Salvar Alterações
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    )
}
