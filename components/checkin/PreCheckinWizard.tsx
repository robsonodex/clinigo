'use client'

import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { preCheckinSchema, type PreCheckinFormData, CHECKIN_VALIDATION } from '@/lib/validations/pre-checkin'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { QRCodeCanvas } from 'qrcode.react'
import {
    Phone,
    MapPin,
    Stethoscope,
    Pill,
    AlertTriangle,
    QrCode,
    CheckCircle2,
    ChevronRight,
    ChevronLeft,
    Loader2,
    UserCheck,
    Heart,
    Upload,
    FileText,
    X,
    Camera,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface PreCheckinWizardProps {
    appointmentId: string
    clinicId: string
    patientName?: string
    doctorName?: string
    appointmentDate?: string
    appointmentTime?: string
    onComplete?: (qrToken: string) => void
}

interface UploadedFile {
    type: 'rg' | 'cpf' | 'carteirinha' | 'exame' | 'outro'
    name: string
    url: string
    size: number
}

const STEPS = [
    { id: 1, title: 'Contato', icon: Phone },
    { id: 2, title: 'Saúde', icon: Stethoscope },
    { id: 3, title: 'Documentos', icon: FileText },
    { id: 4, title: 'QR Code', icon: QrCode },
]

export function PreCheckinWizard({
    appointmentId,
    clinicId,
    patientName,
    doctorName,
    appointmentDate,
    appointmentTime,
    onComplete,
}: PreCheckinWizardProps) {
    const [currentStep, setCurrentStep] = useState(1)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [qrToken, setQrToken] = useState<string | null>(null)
    const [qrData, setQrData] = useState<string | null>(null)
    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

    const supabase = createClient()

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        trigger,
        formState: { errors },
    } = useForm<PreCheckinFormData>({
        resolver: zodResolver(preCheckinSchema.partial()),
        defaultValues: {
            phone: '',
            address: '',
            main_complaint: '',
            medications: '',
            allergies: '',
            emergency_contact_name: '',
            emergency_contact_phone: '',
            health_insurance: '',
            health_insurance_number: '',
            consent_treatment: false,
            consent_data_usage: false,
            priority_reason: 'normal',
        },
    })

    const consentTreatment = watch('consent_treatment')
    const consentDataUsage = watch('consent_data_usage')

    // File upload handler
    const handleFileUpload = useCallback(async (
        event: React.ChangeEvent<HTMLInputElement>,
        docType: UploadedFile['type']
    ) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file size
        if (file.size > CHECKIN_VALIDATION.MAX_FILE_SIZE) {
            toast.error(`Arquivo muito grande. Máximo: ${CHECKIN_VALIDATION.MAX_FILE_SIZE_MB}MB`)
            return
        }

        // Validate file type
        if (!CHECKIN_VALIDATION.ACCEPTED_FILE_TYPES.includes(file.type)) {
            toast.error('Formato não aceito. Use: PDF, JPEG, PNG ou WebP')
            return
        }

        // Check max documents
        if (uploadedFiles.length >= CHECKIN_VALIDATION.MAX_DOCUMENTS) {
            toast.error(`Máximo de ${CHECKIN_VALIDATION.MAX_DOCUMENTS} documentos`)
            return
        }

        setIsUploading(true)
        try {
            const fileName = `${appointmentId}/${docType}-${Date.now()}.${file.name.split('.').pop()}`

            const { data, error } = await supabase.storage
                .from('checkin-docs')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false,
                })

            if (error) {
                // If bucket doesn't exist, show warning but continue
                if (error.message?.includes('not found')) {
                    toast.warning('Storage não configurado. Documento não salvo.')
                    return
                }
                throw error
            }

            const { data: urlData } = supabase.storage
                .from('checkin-docs')
                .getPublicUrl(data.path)

            setUploadedFiles(prev => [...prev, {
                type: docType,
                name: file.name,
                url: urlData.publicUrl,
                size: file.size,
            }])

            toast.success('Documento enviado!')
        } catch (error: any) {
            console.error('Upload error:', error)
            toast.error('Erro ao enviar documento')
        } finally {
            setIsUploading(false)
        }
    }, [supabase, appointmentId, uploadedFiles.length])

    // Remove uploaded file
    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    }

    const validateStep = async (step: number): Promise<boolean> => {
        switch (step) {
            case 1:
                return await trigger(['phone', 'address'])
            case 2:
                return await trigger(['main_complaint'])
            case 3:
                // Documents are optional, check consents
                return await trigger(['consent_treatment', 'consent_data_usage'])
            default:
                return true
        }
    }

    const nextStep = async () => {
        const isValid = await validateStep(currentStep)
        if (isValid && currentStep < 4) {
            if (currentStep === 3) {
                // Submit form before going to QR step
                handleSubmit(onSubmit)()
            } else {
                setCurrentStep(currentStep + 1)
            }
        }
    }

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1)
        }
    }

    const onSubmit = async (data: PreCheckinFormData) => {
        setIsSubmitting(true)
        try {
            const response = await fetch('/api/checkin/pre-checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointment_id: appointmentId,
                    clinic_id: clinicId,
                    documents: uploadedFiles.map(f => ({
                        type: f.type,
                        url: f.url,
                        name: f.name,
                    })),
                    ...data,
                }),
            })

            const result = await response.json()

            if (result.success) {
                setQrToken(result.data.qr_token)
                setQrData(result.data.qr_data)
                setCurrentStep(4)
                toast.success('Pré-check-in realizado com sucesso!')
                onComplete?.(result.data.qr_token)
            } else {
                toast.error(result.error || 'Erro ao realizar pré-check-in')
            }
        } catch (error) {
            toast.error('Erro de conexão')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="pb-4">
                <CardTitle className="text-xl flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-500" />
                    Pré-Check-in
                </CardTitle>
                <CardDescription>
                    {patientName && <span className="font-medium">{patientName}</span>}
                    {doctorName && <span> • Dr(a). {doctorName}</span>}
                    {appointmentDate && <span> • {appointmentDate}</span>}
                    {appointmentTime && <span> às {appointmentTime}</span>}
                </CardDescription>

                {/* Progress Steps */}
                <div className="flex items-center justify-between mt-6">
                    {STEPS.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <div
                                className={cn(
                                    'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all',
                                    currentStep >= step.id
                                        ? 'bg-primary border-primary text-primary-foreground'
                                        : 'border-muted-foreground/30 text-muted-foreground'
                                )}
                            >
                                {currentStep > step.id ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                ) : (
                                    <step.icon className="w-5 h-5" />
                                )}
                            </div>
                            <span
                                className={cn(
                                    'ml-2 text-sm font-medium hidden sm:block',
                                    currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                                )}
                            >
                                {step.title}
                            </span>
                            {index < STEPS.length - 1 && (
                                <div
                                    className={cn(
                                        'w-6 sm:w-12 h-0.5 mx-2',
                                        currentStep > step.id ? 'bg-primary' : 'bg-muted-foreground/30'
                                    )}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </CardHeader>

            <CardContent className="pt-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* Step 1: Contact Info */}
                    {currentStep === 1 && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    Telefone de Contato *
                                </Label>
                                <Input
                                    id="phone"
                                    placeholder="(11) 99999-9999"
                                    {...register('phone')}
                                />
                                {errors.phone && (
                                    <p className="text-sm text-destructive">{errors.phone.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address" className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Endereço Completo *
                                </Label>
                                <Input
                                    id="address"
                                    placeholder="Rua, número, bairro, cidade"
                                    {...register('address')}
                                />
                                {errors.address && (
                                    <p className="text-sm text-destructive">{errors.address.message}</p>
                                )}
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="emergency_contact_name">Contato de Emergência</Label>
                                    <Input
                                        id="emergency_contact_name"
                                        placeholder="Nome do contato"
                                        {...register('emergency_contact_name')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="emergency_contact_phone">Telefone</Label>
                                    <Input
                                        id="emergency_contact_phone"
                                        placeholder="(11) 99999-9999"
                                        {...register('emergency_contact_phone')}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Health Info */}
                    {currentStep === 2 && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <div className="space-y-2">
                                <Label htmlFor="main_complaint" className="flex items-center gap-2">
                                    <Stethoscope className="w-4 h-4" />
                                    Queixa Principal / Motivo da Consulta *
                                </Label>
                                <Textarea
                                    id="main_complaint"
                                    placeholder="Descreva o motivo da consulta..."
                                    rows={3}
                                    {...register('main_complaint')}
                                />
                                {errors.main_complaint && (
                                    <p className="text-sm text-destructive">{errors.main_complaint.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="medications" className="flex items-center gap-2">
                                    <Pill className="w-4 h-4" />
                                    Medicamentos em Uso
                                </Label>
                                <Textarea
                                    id="medications"
                                    placeholder="Liste os medicamentos que você está tomando (opcional)"
                                    rows={2}
                                    {...register('medications')}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="allergies" className="flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                    Alergias
                                </Label>
                                <Textarea
                                    id="allergies"
                                    placeholder="Informe suas alergias conhecidas (opcional)"
                                    rows={2}
                                    {...register('allergies')}
                                />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="health_insurance">Convênio</Label>
                                    <Input
                                        id="health_insurance"
                                        placeholder="Nome do convênio"
                                        {...register('health_insurance')}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="health_insurance_number">Nº Carteirinha</Label>
                                    <Input
                                        id="health_insurance_number"
                                        placeholder="Número do cartão"
                                        {...register('health_insurance_number')}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Documents & Consent */}
                    {currentStep === 3 && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Document Upload */}
                            <div className="space-y-4">
                                <h3 className="font-medium flex items-center gap-2">
                                    <Camera className="w-4 h-4" />
                                    Upload de Documentos (Opcional)
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Envie fotos de documentos para agilizar o atendimento.
                                    Máximo {CHECKIN_VALIDATION.MAX_DOCUMENTS} arquivos, {CHECKIN_VALIDATION.MAX_FILE_SIZE_MB}MB cada.
                                </p>

                                <div className="grid gap-3">
                                    {['rg', 'carteirinha', 'exame'].map((docType) => (
                                        <div key={docType} className="flex items-center gap-3">
                                            <Label
                                                htmlFor={`file-${docType}`}
                                                className="flex-1 flex items-center gap-2 p-3 border border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                                            >
                                                <Upload className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm capitalize">
                                                    {docType === 'rg' ? 'RG / CNH' : docType === 'carteirinha' ? 'Carteirinha do Convênio' : 'Exames Anteriores'}
                                                </span>
                                            </Label>
                                            <input
                                                type="file"
                                                id={`file-${docType}`}
                                                accept={CHECKIN_VALIDATION.ACCEPTED_EXTENSIONS.join(',')}
                                                className="hidden"
                                                onChange={(e) => handleFileUpload(e, docType as UploadedFile['type'])}
                                                disabled={isUploading}
                                            />
                                        </div>
                                    ))}
                                </div>

                                {/* Uploaded Files List */}
                                {uploadedFiles.length > 0 && (
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-medium">Arquivos enviados:</h4>
                                        {uploadedFiles.map((file, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between p-2 bg-green-50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-green-600" />
                                                    <span className="text-sm">{file.name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({(file.size / 1024).toFixed(0)}KB)
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => removeFile(index)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {isUploading && (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Enviando...
                                    </div>
                                )}
                            </div>

                            {/* Consents */}
                            <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                                <h3 className="font-semibold flex items-center gap-2">
                                    <UserCheck className="w-4 h-4" />
                                    Termos e Consentimentos
                                </h3>

                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        id="consent_treatment"
                                        checked={consentTreatment}
                                        onCheckedChange={(checked) => setValue('consent_treatment', checked as boolean)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="consent_treatment" className="text-sm font-normal cursor-pointer">
                                            Declaro que as informações prestadas são verdadeiras e autorizo o atendimento médico. *
                                        </Label>
                                    </div>
                                </div>
                                {errors.consent_treatment && (
                                    <p className="text-sm text-destructive">{errors.consent_treatment.message}</p>
                                )}

                                <div className="flex items-start space-x-3">
                                    <Checkbox
                                        id="consent_data_usage"
                                        checked={consentDataUsage}
                                        onCheckedChange={(checked) => setValue('consent_data_usage', checked as boolean)}
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <Label htmlFor="consent_data_usage" className="text-sm font-normal cursor-pointer">
                                            Autorizo o uso dos meus dados para fins de atendimento médico, conforme a LGPD. *
                                        </Label>
                                    </div>
                                </div>
                                {errors.consent_data_usage && (
                                    <p className="text-sm text-destructive">{errors.consent_data_usage.message}</p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 4: QR Code */}
                    {currentStep === 4 && qrToken && (
                        <div className="text-center space-y-6 animate-in fade-in duration-300">
                            <div className="flex flex-col items-center">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-10 h-10 text-green-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-green-700">Pré-Check-in Concluído!</h3>
                                <p className="text-muted-foreground mt-2">
                                    Apresente o QR Code abaixo na recepção
                                </p>
                            </div>

                            {/* QR Code Display */}
                            <div className="bg-white p-6 rounded-xl border-2 border-primary/20 inline-block shadow-lg">
                                <QRCodeCanvas
                                    value={qrData || qrToken}
                                    size={200}
                                    level="H"
                                    includeMargin
                                    imageSettings={{
                                        src: '/logo-icon.png',
                                        height: 40,
                                        width: 40,
                                        excavate: true,
                                    }}
                                />
                            </div>

                            <div className="text-sm text-muted-foreground space-y-1">
                                <p>⏱️ Este QR Code expira em 2 horas</p>
                                <p>📱 Você também receberá por WhatsApp</p>
                            </div>

                            {/* Instructions */}
                            <div className="bg-blue-50 p-4 rounded-lg text-left">
                                <h4 className="font-medium text-blue-900 mb-2">Próximos passos:</h4>
                                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                                    <li>Apresente este QR Code na recepção da clínica</li>
                                    <li>Aguarde ser chamado(a) na sala de espera</li>
                                    <li>Tenha seus documentos originais em mãos</li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    {currentStep < 4 && (
                        <div className="flex justify-between pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={prevStep}
                                disabled={currentStep === 1}
                            >
                                <ChevronLeft className="w-4 h-4 mr-1" />
                                Voltar
                            </Button>

                            <Button
                                type="button"
                                onClick={nextStep}
                                disabled={isSubmitting || isUploading}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Processando...
                                    </>
                                ) : currentStep === 3 ? (
                                    <>
                                        Concluir
                                        <CheckCircle2 className="w-4 h-4 ml-1" />
                                    </>
                                ) : (
                                    <>
                                        Próximo
                                        <ChevronRight className="w-4 h-4 ml-1" />
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </form>
            </CardContent>
        </Card>
    )
}
