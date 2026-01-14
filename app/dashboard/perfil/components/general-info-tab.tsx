'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Upload, User } from 'lucide-react'
import { generalInfoSchema, addressSchema, type GeneralInfoFormData, type AddressFormData } from '@/lib/validations/profile-schema'
import { createClient } from '@/lib/supabase/client'

export default function GeneralInfoTab() {
    const [loading, setLoading] = useState(false)
    const [avatarUploading, setAvatarUploading] = useState(false)
    const [userData, setUserData] = useState<any>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

    const generalForm = useForm<GeneralInfoFormData>({
        resolver: zodResolver(generalInfoSchema),
        defaultValues: {
            name: '',
            email: '',
            phone: '',
            cpf: '',
            birth_date: '',
            gender: undefined,
            bio: '',
        },
    })

    const addressForm = useForm<AddressFormData>({
        resolver: zodResolver(addressSchema),
        defaultValues: {
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
            const res = await fetch('/api/profile')
            if (res.ok) {
                const data = await res.json()
                setUserData(data.user)
                setAvatarPreview(data.user.avatar_url)

                // Preencher formulários
                generalForm.reset({
                    name: data.user.name || '',
                    email: data.user.email || '',
                    phone: data.user.phone || '',
                    cpf: data.user.cpf || '',
                    birth_date: data.user.birth_date || '',
                    gender: data.user.gender || undefined,
                    bio: data.user.bio || '',
                })

                addressForm.reset({
                    address_zipcode: data.user.address_zipcode || '',
                    address_street: data.user.address_street || '',
                    address_number: data.user.address_number || '',
                    address_complement: data.user.address_complement || '',
                    address_neighborhood: data.user.address_neighborhood || '',
                    address_city: data.user.address_city || '',
                    address_state: data.user.address_state || '',
                })
            }
        } catch (error) {
            toast.error('Erro ao carregar perfil')
        }
    }

    async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        // Validações
        if (file.size > 5 * 1024 * 1024) {
            toast.error('Arquivo muito grande. Máximo 5MB.')
            return
        }

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            toast.error('Formato inválido. Use JPG, PNG ou WebP.')
            return
        }

        setAvatarUploading(true)

        try {
            // Preview local
            const reader = new FileReader()
            reader.onloadend = () => {
                setAvatarPreview(reader.result as string)
            }
            reader.readAsDataURL(file)

            // Upload
            const formData = new FormData()
            formData.append('file', file)

            const res = await fetch('/api/profile/avatar', {
                method: 'POST',
                body: formData,
            })

            if (res.ok) {
                const data = await res.json()
                setAvatarPreview(data.avatar_url)
                toast.success('Avatar atualizado!')
            } else {
                const error = await res.json()
                toast.error(error.error || 'Erro ao fazer upload')
                setAvatarPreview(userData?.avatar_url) // Reverter
            }
        } catch (error) {
            toast.error('Erro ao fazer upload do avatar')
            setAvatarPreview(userData?.avatar_url) // Reverter
        } finally {
            setAvatarUploading(false)
        }
    }

    async function onSubmitGeneral(data: GeneralInfoFormData) {
        setLoading(true)
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (res.ok) {
                toast.success('Informações atualizadas!')
                loadProfile()
            } else {
                const error = await res.json()
                toast.error(error.error || 'Erro ao atualizar')
            }
        } catch (error) {
            toast.error('Erro ao salvar alterações')
        } finally {
            setLoading(false)
        }
    }

    async function onSubmitAddress(data: AddressFormData) {
        setLoading(true)
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            })

            if (res.ok) {
                toast.success('Endereço atualizado!')
                loadProfile()
            } else {
                toast.error('Erro ao atualizar endereço')
            }
        } catch (error) {
            toast.error('Erro ao salvar endereço')
        } finally {
            setLoading(false)
        }
    }

    async function searchZipCode(zipcode: string) {
        if (!zipcode || zipcode.replace(/\D/g, '').length !== 8) return

        try {
            const res = await fetch(`https://viacep.com.br/ws/${zipcode.replace(/\D/g, '')}/json/`)
            if (res.ok) {
                const data = await res.json()
                if (!data.erro) {
                    addressForm.setValue('address_street', data.logradouro || '')
                    addressForm.setValue('address_neighborhood', data.bairro || '')
                    addressForm.setValue('address_city', data.localidade || '')
                    addressForm.setValue('address_state', data.uf || '')
                    toast.success('Endereço encontrado!')
                }
            }
        } catch (error) {
            console.error('Error searching zipcode:', error)
        }
    }

    return (
        <div className="space-y-6">
            {/* Avatar Upload */}
            <Card>
                <CardHeader>
                    <CardTitle>Foto de Perfil</CardTitle>
                    <CardDescription>Atualize sua foto de perfil</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                        <AvatarImage src={avatarPreview || undefined} />
                        <AvatarFallback>
                            {userData?.name ? userData.name.substring(0, 2).toUpperCase() : <User />}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                        <input
                            id="avatar-upload"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={avatarUploading}
                        />
                        <label htmlFor="avatar-upload">
                            <Button asChild disabled={avatarUploading}>
                                <span className="cursor-pointer">
                                    {avatarUploading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="mr-2 h-4 w-4" />
                                            Alterar Foto
                                        </>
                                    )}
                                </span>
                            </Button>
                        </label>
                        <p className="text-sm text-muted-foreground mt-2">
                            JPG, PNG ou WebP. Máximo 5MB.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* Informações Gerais */}
            <Card>
                <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                    <CardDescription>Atualize seus dados pessoais</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...generalForm}>
                        <form onSubmit={generalForm.handleSubmit(onSubmitGeneral)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={generalForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nome Completo *</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Seu nome completo" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={generalForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email *</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="email" placeholder="seu@email.com" disabled />
                                            </FormControl>
                                            <FormDescription>Email não pode ser alterado aqui</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={generalForm.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Telefone</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="(00) 00000-0000" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={generalForm.control}
                                    name="cpf"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CPF</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="000.000.000-00" disabled={!!userData?.cpf} />
                                            </FormControl>
                                            {userData?.cpf && (
                                                <FormDescription>CPF não pode ser alterado</FormDescription>
                                            )}
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={generalForm.control}
                                    name="birth_date"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Data de Nascimento</FormLabel>
                                            <FormControl>
                                                <Input {...field} type="date" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={generalForm.control}
                                    name="gender"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Gênero</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="masculino">Masculino</SelectItem>
                                                    <SelectItem value="feminino">Feminino</SelectItem>
                                                    <SelectItem value="outro">Outro</SelectItem>
                                                    <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={generalForm.control}
                                name="bio"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sobre mim / Bio</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                {...field}
                                                placeholder="Conte um pouco sobre você..."
                                                rows={4}
                                            />
                                        </FormControl>
                                        <FormDescription>Máximo 500 caracteres</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => generalForm.reset()}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Alterações
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Separator />

            {/* Endereço */}
            <Card>
                <CardHeader>
                    <CardTitle>Endereço</CardTitle>
                    <CardDescription>Atualize seu endereço</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...addressForm}>
                        <form onSubmit={addressForm.handleSubmit(onSubmitAddress)} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={addressForm.control}
                                    name="address_zipcode"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>CEP</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="00000-000"
                                                    onBlur={(e) => searchZipCode(e.target.value)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={addressForm.control}
                                    name="address_street"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Rua</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Nome da rua" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={addressForm.control}
                                    name="address_number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Número</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="123" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={addressForm.control}
                                    name="address_complement"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel>Complemento</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Apto, Bloco, etc" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={addressForm.control}
                                    name="address_neighborhood"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Bairro</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Bairro" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={addressForm.control}
                                    name="address_city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Cidade</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="Cidade" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={addressForm.control}
                                    name="address_state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado</FormLabel>
                                            <FormControl>
                                                <Input {...field} placeholder="UF" maxLength={2} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => addressForm.reset()}>
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Salvar Endereço
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    )
}
