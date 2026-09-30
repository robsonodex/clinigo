'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import {
    ShieldCheck,
    CheckCircle2,
    Building2,
    User,
    AlertCircle,
    Phone,
    Mail,
    Calendar,
    CreditCard,
    Upload,
    FileText,
    Users,
    Loader2,
    ArrowLeft,
    ArrowRight,
    Camera,
    X,
    Heart,
} from 'lucide-react'

// ============================================
// Constants
// ============================================

const STEPS = ['Tipo', 'Dados', 'Convênio', 'Consentimento'] as const

function formatCPF(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) return digits
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`
}

function formatPhone(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 2) return `(${digits}`
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function formatDate(value: string): string {
    const digits = value.replace(/\D/g, '').slice(0, 8)
    if (digits.length <= 2) return digits
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function parseDateToISO(dateStr: string): string {
    const parts = dateStr.split('/')
    if (parts.length === 3 && parts[2].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`
    }
    return dateStr
}

// ============================================
// Main Component
// ============================================

export default function PublicIntakePage() {
    const params = useParams()
    const token = params?.token as string

    // Page state
    const [isLoading, setIsLoading] = useState(true)
    const [clinicData, setClinicData] = useState<{
        clinic: { id: string; name: string; logo_url: string | null }
        lead_phone: string | null
        is_static: boolean
        correction: { note: string; previous_data: any } | null
        consent_text: string
        consent_version: string
    } | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [currentStep, setCurrentStep] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)

    // Form state
    const [patientType, setPatientType] = useState<'self' | 'other'>('self')
    const [fullName, setFullName] = useState('')
    const [dateOfBirth, setDateOfBirth] = useState('')
    const [cpf, setCpf] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [billingType, setBillingType] = useState<'particular' | 'convenio'>('particular')
    const [complaint, setComplaint] = useState('')
    const [consentAccepted, setConsentAccepted] = useState(false)

    // Guardian state
    const [guardianName, setGuardianName] = useState('')
    const [guardianCpf, setGuardianCpf] = useState('')
    const [guardianRelationship, setGuardianRelationship] = useState('')
    const [guardianPhone, setGuardianPhone] = useState('')

    // Insurance state
    const [insuranceId, setInsuranceId] = useState('')
    const [insuranceOther, setInsuranceOther] = useState('')
    const [cardNumber, setCardNumber] = useState('')
    const [cardValidity, setCardValidity] = useState('')
    const [planName, setPlanName] = useState('')
    const [isHolder, setIsHolder] = useState(true)
    const [holderName, setHolderName] = useState('')
    const [holderCpf, setHolderCpf] = useState('')

    // File upload state
    const [cardFront, setCardFront] = useState<File | null>(null)
    const [cardBack, setCardBack] = useState<File | null>(null)
    const [cardFrontPreview, setCardFrontPreview] = useState<string | null>(null)
    const [cardBackPreview, setCardBackPreview] = useState<string | null>(null)
    const [uploadingFront, setUploadingFront] = useState(false)
    const [uploadingBack, setUploadingBack] = useState(false)

    // Insurance options from clinic
    const [insuranceOptions, setInsuranceOptions] = useState<Array<{ id: string; name: string }>>([])

    // Honeypot
    const [honeypot, setHoneypot] = useState('')

    // Validation errors
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

    // ============================================
    // Load token data
    // ============================================
    useEffect(() => {
        if (!token) return

        const fetchData = async () => {
            try {
                setIsLoading(true)
                const res = await fetch(`/api/public/intake/${token}`)
                if (!res.ok) {
                    const err = await res.json()
                    throw new Error(err.error || 'Link inválido ou expirado')
                }
                const data = await res.json()
                setClinicData(data)

                // Pre-fill phone
                if (data.lead_phone) {
                    setPhone(formatPhone(data.lead_phone.replace(/^\+?55/, '')))
                }

                // If correction, pre-fill from previous data
                if (data.correction?.previous_data) {
                    const prev = data.correction.previous_data
                    setFullName(prev.full_name || '')
                    setDateOfBirth(prev.date_of_birth ? formatDate(prev.date_of_birth.replace(/-/g, '')) : '')
                    setCpf(prev.cpf ? formatCPF(prev.cpf) : '')
                    setPhone(prev.phone ? formatPhone(prev.phone.replace(/^55/, '')) : '')
                    setEmail(prev.email || '')
                    setPatientType(prev.patient_type || 'self')
                    setBillingType(prev.billing_type || 'particular')
                    setComplaint(prev.complaint || '')

                    if (prev.guardian) {
                        setGuardianName(prev.guardian.guardian_name || '')
                        setGuardianCpf(prev.guardian.guardian_cpf ? formatCPF(prev.guardian.guardian_cpf) : '')
                        setGuardianRelationship(prev.guardian.guardian_relationship || '')
                        setGuardianPhone(prev.guardian.guardian_phone ? formatPhone(prev.guardian.guardian_phone) : '')
                    }

                    if (prev.insurance) {
                        setInsuranceId(prev.insurance.health_insurance_id || '')
                        setCardNumber(prev.insurance.insurance_card_number || '')
                        setCardValidity(prev.insurance.insurance_validity || '')
                        setPlanName(prev.insurance.insurance_plan_name || '')
                        setIsHolder(prev.insurance.is_holder !== false)
                        setHolderName(prev.insurance.holder_name || '')
                        setHolderCpf(prev.insurance.holder_cpf ? formatCPF(prev.insurance.holder_cpf) : '')
                    }
                }
            } catch (err: any) {
                setError(err.message || 'Erro ao carregar formulário')
            } finally {
                setIsLoading(false)
            }
        }

        fetchData()
    }, [token])

    // ============================================
    // File Upload
    // ============================================
    const handleFileUpload = useCallback(async (file: File, kind: 'carteirinha_frente' | 'carteirinha_verso') => {
        if (!token) return

        const formData = new FormData()
        formData.append('file', file)
        formData.append('kind', kind)

        const setter = kind === 'carteirinha_frente' ? setUploadingFront : setUploadingBack

        try {
            setter(true)
            const res = await fetch(`/api/public/intake/${token}/upload`, {
                method: 'POST',
                body: formData,
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro no upload')
            }

            // Show preview
            const reader = new FileReader()
            reader.onloadend = () => {
                if (kind === 'carteirinha_frente') {
                    setCardFrontPreview(reader.result as string)
                } else {
                    setCardBackPreview(reader.result as string)
                }
            }
            reader.readAsDataURL(file)
        } catch (err: any) {
            setFieldErrors(prev => ({
                ...prev,
                [kind]: err.message,
            }))
        } finally {
            setter(false)
        }
    }, [token])

    // ============================================
    // Submit
    // ============================================
    const handleSubmit = async () => {
        if (!clinicData || isSubmitting) return

        // Validate current step
        const errors: Record<string, string> = {}

        if (!fullName || fullName.length < 3) errors.full_name = 'Nome obrigatório (mín. 3 caracteres)'
        if (!dateOfBirth || dateOfBirth.length < 10) errors.date_of_birth = 'Data de nascimento obrigatória'
        if (!phone || phone.replace(/\D/g, '').length < 10) errors.phone = 'Telefone obrigatório'

        if (patientType === 'other') {
            if (!guardianName) errors.guardian_name = 'Nome do responsável obrigatório'
            if (!guardianCpf) errors.guardian_cpf = 'CPF do responsável obrigatório'
            if (!guardianRelationship) errors.guardian_relationship = 'Parentesco obrigatório'
            if (!guardianPhone) errors.guardian_phone = 'Telefone do responsável obrigatório'
        }

        if (billingType === 'convenio') {
            if (!cardNumber) errors.insurance_card_number = 'Número da carteirinha obrigatório'
        }

        if (!consentAccepted) errors.consent = 'Aceite o consentimento LGPD para continuar'

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors)
            return
        }

        setFieldErrors({})
        setIsSubmitting(true)

        try {
            const payload: Record<string, any> = {
                patient_type: patientType,
                full_name: fullName.trim(),
                date_of_birth: parseDateToISO(dateOfBirth),
                cpf: cpf.replace(/\D/g, '') || '',
                phone: phone.replace(/\D/g, ''),
                email: email.trim() || '',
                billing_type: billingType,
                complaint: complaint.trim() || '',
                consent: {
                    accepted: true,
                    consent_text: clinicData.consent_text,
                    consent_version: clinicData.consent_version,
                    accepted_at: new Date().toISOString(),
                },
                _hp_field: honeypot,
            }

            if (patientType === 'other') {
                payload.guardian = {
                    guardian_name: guardianName.trim(),
                    guardian_cpf: guardianCpf.replace(/\D/g, ''),
                    guardian_relationship: guardianRelationship.trim(),
                    guardian_phone: guardianPhone.replace(/\D/g, ''),
                }
            }

            if (billingType === 'convenio') {
                payload.insurance = {
                    health_insurance_id: insuranceId || undefined,
                    health_insurance_other: insuranceOther || undefined,
                    insurance_card_number: cardNumber.trim(),
                    insurance_validity: cardValidity || undefined,
                    insurance_plan_name: planName || undefined,
                    is_holder: isHolder,
                    holder_name: !isHolder ? holderName.trim() : undefined,
                    holder_cpf: !isHolder ? holderCpf.replace(/\D/g, '') : undefined,
                }
            }

            const res = await fetch(`/api/public/intake/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error || 'Erro ao enviar ficha')
            }

            setIsSubmitted(true)
        } catch (err: any) {
            setFieldErrors({ submit: err.message })
        } finally {
            setIsSubmitting(false)
        }
    }

    // ============================================
    // Step Navigation
    // ============================================
    const effectiveSteps = billingType === 'particular'
        ? [STEPS[0], STEPS[1], STEPS[3]]
        : [...STEPS]

    const canGoNext = () => {
        if (currentStep === 0) return true
        if (currentStep === 1) {
            return fullName.length >= 3 && dateOfBirth.length >= 10 && phone.replace(/\D/g, '').length >= 10
        }
        return true
    }

    const goNext = () => {
        if (currentStep < effectiveSteps.length - 1) {
            setCurrentStep(prev => prev + 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    const goBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    // ============================================
    // Render States
    // ============================================

    if (isLoading) {
        return (
            <div className="intake-page">
                <div className="intake-container">
                    <div className="intake-loading">
                        <Loader2 className="intake-spinner" />
                        <p>Carregando formulário...</p>
                    </div>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="intake-page">
                <div className="intake-container">
                    <div className="intake-error">
                        <AlertCircle className="intake-error-icon" />
                        <h2>Link indisponível</h2>
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        )
    }

    if (isSubmitted) {
        return (
            <div className="intake-page">
                <div className="intake-container">
                    <div className="intake-success">
                        <div className="intake-success-icon-wrapper">
                            <CheckCircle2 className="intake-success-icon" />
                        </div>
                        <h2>Ficha enviada com sucesso</h2>
                        <p>
                            Sua ficha foi recebida pela {clinicData?.clinic?.name || 'clínica'}.
                            Em breve a equipe irá revisar seus dados.
                        </p>
                        <div className="intake-success-note">
                            <ShieldCheck size={16} />
                            <span>Seus dados estão protegidos conforme a LGPD.</span>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    // ============================================
    // Main Form Render
    // ============================================
    return (
        <div className="intake-page">
            <div className="intake-container">
                {/* Header */}
                <header className="intake-header">
                    {clinicData?.clinic?.logo_url ? (
                        <img
                            src={clinicData.clinic.logo_url}
                            alt={clinicData.clinic.name}
                            className="intake-clinic-logo"
                        />
                    ) : (
                        <div className="intake-clinic-icon">
                            <Building2 size={28} />
                        </div>
                    )}
                    <h1 className="intake-clinic-name">{clinicData?.clinic?.name || 'Clínica'}</h1>
                    <p className="intake-subtitle">Ficha de pre-cadastro</p>
                </header>

                {/* Correction Banner */}
                {clinicData?.correction && (
                    <div className="intake-correction-banner">
                        <AlertCircle size={18} />
                        <div>
                            <strong>Correção solicitada:</strong>
                            <p>{clinicData.correction.note}</p>
                        </div>
                    </div>
                )}

                {/* Progress */}
                <div className="intake-progress">
                    {effectiveSteps.map((step, i) => (
                        <div
                            key={step}
                            className={`intake-progress-step ${i <= currentStep ? 'active' : ''} ${i < currentStep ? 'completed' : ''}`}
                        >
                            <div className="intake-progress-dot">
                                {i < currentStep ? <CheckCircle2 size={14} /> : <span>{i + 1}</span>}
                            </div>
                            <span className="intake-progress-label">{step}</span>
                        </div>
                    ))}
                </div>

                {/* Step Content */}
                <div className="intake-form">
                    {/* STEP 0: Patient Type */}
                    {currentStep === 0 && (
                        <div className="intake-step">
                            <h2 className="intake-step-title">Quem é o paciente?</h2>
                            <p className="intake-step-desc">Selecione quem será atendido</p>

                            <div className="intake-type-options">
                                <button
                                    type="button"
                                    className={`intake-type-card ${patientType === 'self' ? 'selected' : ''}`}
                                    onClick={() => setPatientType('self')}
                                >
                                    <User size={32} />
                                    <strong>Eu mesmo(a)</strong>
                                    <span>Sou adulto(a) e vou preencher meus dados</span>
                                </button>

                                <button
                                    type="button"
                                    className={`intake-type-card ${patientType === 'other' ? 'selected' : ''}`}
                                    onClick={() => setPatientType('other')}
                                >
                                    <Users size={32} />
                                    <strong>Outra pessoa</strong>
                                    <span>Criança, dependente ou pessoa sob minha responsabilidade</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 1: Patient Data */}
                    {currentStep === 1 && (
                        <div className="intake-step">
                            <h2 className="intake-step-title">Dados {patientType === 'other' ? 'do paciente' : 'pessoais'}</h2>

                            <div className="intake-field">
                                <label>Nome completo *</label>
                                <div className="intake-input-wrapper">
                                    <User size={18} />
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={e => setFullName(e.target.value)}
                                        placeholder="Nome completo do paciente"
                                        autoComplete="name"
                                    />
                                </div>
                                {fieldErrors.full_name && <span className="intake-field-error">{fieldErrors.full_name}</span>}
                            </div>

                            <div className="intake-field">
                                <label>Data de nascimento *</label>
                                <div className="intake-input-wrapper">
                                    <Calendar size={18} />
                                    <input
                                        type="text"
                                        value={dateOfBirth}
                                        onChange={e => setDateOfBirth(formatDate(e.target.value))}
                                        placeholder="DD/MM/AAAA"
                                        inputMode="numeric"
                                        maxLength={10}
                                    />
                                </div>
                                {fieldErrors.date_of_birth && <span className="intake-field-error">{fieldErrors.date_of_birth}</span>}
                            </div>

                            <div className="intake-field">
                                <label>CPF</label>
                                <div className="intake-input-wrapper">
                                    <CreditCard size={18} />
                                    <input
                                        type="text"
                                        value={cpf}
                                        onChange={e => setCpf(formatCPF(e.target.value))}
                                        placeholder="000.000.000-00"
                                        inputMode="numeric"
                                        maxLength={14}
                                    />
                                </div>
                            </div>

                            <div className="intake-field">
                                <label>Telefone *</label>
                                <div className="intake-input-wrapper">
                                    <Phone size={18} />
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(formatPhone(e.target.value))}
                                        placeholder="(00) 00000-0000"
                                        inputMode="tel"
                                        maxLength={15}
                                    />
                                </div>
                                {fieldErrors.phone && <span className="intake-field-error">{fieldErrors.phone}</span>}
                            </div>

                            <div className="intake-field">
                                <label>E-mail</label>
                                <div className="intake-input-wrapper">
                                    <Mail size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="seu@email.com"
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="intake-field">
                                <label>Queixa ou motivo da consulta</label>
                                <textarea
                                    value={complaint}
                                    onChange={e => setComplaint(e.target.value)}
                                    placeholder="Descreva brevemente o motivo (opcional)"
                                    maxLength={500}
                                    rows={3}
                                />
                            </div>

                            {/* Guardian Fields */}
                            {patientType === 'other' && (
                                <div className="intake-guardian-section">
                                    <h3 className="intake-section-title">Dados do responsável</h3>

                                    <div className="intake-field">
                                        <label>Nome do responsável *</label>
                                        <input
                                            type="text"
                                            value={guardianName}
                                            onChange={e => setGuardianName(e.target.value)}
                                            placeholder="Nome completo do responsável legal"
                                        />
                                        {fieldErrors.guardian_name && <span className="intake-field-error">{fieldErrors.guardian_name}</span>}
                                    </div>

                                    <div className="intake-field">
                                        <label>CPF do responsável *</label>
                                        <input
                                            type="text"
                                            value={guardianCpf}
                                            onChange={e => setGuardianCpf(formatCPF(e.target.value))}
                                            placeholder="000.000.000-00"
                                            inputMode="numeric"
                                            maxLength={14}
                                        />
                                        {fieldErrors.guardian_cpf && <span className="intake-field-error">{fieldErrors.guardian_cpf}</span>}
                                    </div>

                                    <div className="intake-field">
                                        <label>Parentesco *</label>
                                        <select
                                            value={guardianRelationship}
                                            onChange={e => setGuardianRelationship(e.target.value)}
                                        >
                                            <option value="">Selecione</option>
                                            <option value="mae">Mãe</option>
                                            <option value="pai">Pai</option>
                                            <option value="avo">Avô/Avó</option>
                                            <option value="tio">Tio/Tia</option>
                                            <option value="tutor">Tutor Legal</option>
                                            <option value="outro">Outro</option>
                                        </select>
                                        {fieldErrors.guardian_relationship && <span className="intake-field-error">{fieldErrors.guardian_relationship}</span>}
                                    </div>

                                    <div className="intake-field">
                                        <label>Telefone do responsável *</label>
                                        <input
                                            type="tel"
                                            value={guardianPhone}
                                            onChange={e => setGuardianPhone(formatPhone(e.target.value))}
                                            placeholder="(00) 00000-0000"
                                            inputMode="tel"
                                            maxLength={15}
                                        />
                                        {fieldErrors.guardian_phone && <span className="intake-field-error">{fieldErrors.guardian_phone}</span>}
                                    </div>
                                </div>
                            )}

                            {/* Billing Type */}
                            <div className="intake-billing-section">
                                <h3 className="intake-section-title">Modalidade de atendimento</h3>
                                <div className="intake-billing-options">
                                    <button
                                        type="button"
                                        className={`intake-billing-btn ${billingType === 'particular' ? 'selected' : ''}`}
                                        onClick={() => setBillingType('particular')}
                                    >
                                        <CreditCard size={20} />
                                        <span>Particular</span>
                                    </button>
                                    <button
                                        type="button"
                                        className={`intake-billing-btn ${billingType === 'convenio' ? 'selected' : ''}`}
                                        onClick={() => setBillingType('convenio')}
                                    >
                                        <Heart size={20} />
                                        <span>Convênio</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Insurance (only if billingType === 'convenio') */}
                    {currentStep === 2 && billingType === 'convenio' && (
                        <div className="intake-step">
                            <h2 className="intake-step-title">Dados do convênio</h2>

                            <div className="intake-field">
                                <label>Número da carteirinha *</label>
                                <input
                                    type="text"
                                    value={cardNumber}
                                    onChange={e => setCardNumber(e.target.value)}
                                    placeholder="Número impresso na carteirinha"
                                />
                                {fieldErrors.insurance_card_number && <span className="intake-field-error">{fieldErrors.insurance_card_number}</span>}
                            </div>

                            <div className="intake-field">
                                <label>Validade da carteirinha</label>
                                <input
                                    type="text"
                                    value={cardValidity}
                                    onChange={e => setCardValidity(formatDate(e.target.value))}
                                    placeholder="DD/MM/AAAA"
                                    inputMode="numeric"
                                    maxLength={10}
                                />
                            </div>

                            <div className="intake-field">
                                <label>Nome do plano</label>
                                <input
                                    type="text"
                                    value={planName}
                                    onChange={e => setPlanName(e.target.value)}
                                    placeholder="Ex: Básico, Especial, Enfermaria"
                                />
                            </div>

                            {/* Holder */}
                            <div className="intake-field">
                                <label>Titularidade</label>
                                <div className="intake-billing-options">
                                    <button
                                        type="button"
                                        className={`intake-billing-btn ${isHolder ? 'selected' : ''}`}
                                        onClick={() => setIsHolder(true)}
                                    >
                                        Titular
                                    </button>
                                    <button
                                        type="button"
                                        className={`intake-billing-btn ${!isHolder ? 'selected' : ''}`}
                                        onClick={() => setIsHolder(false)}
                                    >
                                        Dependente
                                    </button>
                                </div>
                            </div>

                            {!isHolder && (
                                <>
                                    <div className="intake-field">
                                        <label>Nome do titular</label>
                                        <input
                                            type="text"
                                            value={holderName}
                                            onChange={e => setHolderName(e.target.value)}
                                            placeholder="Nome do titular do plano"
                                        />
                                    </div>
                                    <div className="intake-field">
                                        <label>CPF do titular</label>
                                        <input
                                            type="text"
                                            value={holderCpf}
                                            onChange={e => setHolderCpf(formatCPF(e.target.value))}
                                            placeholder="000.000.000-00"
                                            inputMode="numeric"
                                            maxLength={14}
                                        />
                                    </div>
                                </>
                            )}

                            {/* Card Photos */}
                            <div className="intake-upload-section">
                                <h3 className="intake-section-title">Foto da carteirinha</h3>

                                <div className="intake-upload-grid">
                                    <div className="intake-upload-card">
                                        <label>
                                            <span>Frente</span>
                                            {cardFrontPreview ? (
                                                <div className="intake-upload-preview">
                                                    <img src={cardFrontPreview} alt="Frente da carteirinha" />
                                                    <button type="button" onClick={() => { setCardFront(null); setCardFrontPreview(null) }}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="intake-upload-placeholder">
                                                    {uploadingFront ? <Loader2 className="intake-spinner-sm" /> : <Camera size={24} />}
                                                    <span>{uploadingFront ? 'Enviando...' : 'Tirar foto ou escolher arquivo'}</span>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                                capture="environment"
                                                onChange={e => {
                                                    const f = e.target.files?.[0]
                                                    if (f) { setCardFront(f); handleFileUpload(f, 'carteirinha_frente') }
                                                }}
                                                hidden
                                            />
                                        </label>
                                    </div>

                                    <div className="intake-upload-card">
                                        <label>
                                            <span>Verso</span>
                                            {cardBackPreview ? (
                                                <div className="intake-upload-preview">
                                                    <img src={cardBackPreview} alt="Verso da carteirinha" />
                                                    <button type="button" onClick={() => { setCardBack(null); setCardBackPreview(null) }}>
                                                        <X size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="intake-upload-placeholder">
                                                    {uploadingBack ? <Loader2 className="intake-spinner-sm" /> : <Camera size={24} />}
                                                    <span>{uploadingBack ? 'Enviando...' : 'Tirar foto ou escolher arquivo'}</span>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp,application/pdf"
                                                capture="environment"
                                                onChange={e => {
                                                    const f = e.target.files?.[0]
                                                    if (f) { setCardBack(f); handleFileUpload(f, 'carteirinha_verso') }
                                                }}
                                                hidden
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3 (or 2 if particular): Consent */}
                    {currentStep === effectiveSteps.length - 1 && (
                        <div className="intake-step">
                            <h2 className="intake-step-title">Consentimento LGPD</h2>
                            <p className="intake-step-desc">
                                Leia e aceite o termo de consentimento para continuar
                            </p>

                            <div className="intake-consent-box">
                                <pre className="intake-consent-text">
                                    {clinicData?.consent_text || ''}
                                </pre>
                            </div>

                            <label className="intake-consent-checkbox">
                                <input
                                    type="checkbox"
                                    checked={consentAccepted}
                                    onChange={e => setConsentAccepted(e.target.checked)}
                                />
                                <span>Li e aceito os termos de consentimento acima</span>
                            </label>
                            {fieldErrors.consent && <span className="intake-field-error">{fieldErrors.consent}</span>}
                        </div>
                    )}

                    {/* Honeypot (invisible) */}
                    <div style={{ position: 'absolute', left: '-9999px', opacity: 0, height: 0 }} aria-hidden="true">
                        <input
                            type="text"
                            name="website"
                            tabIndex={-1}
                            autoComplete="off"
                            value={honeypot}
                            onChange={e => setHoneypot(e.target.value)}
                        />
                    </div>

                    {/* Error */}
                    {fieldErrors.submit && (
                        <div className="intake-submit-error">
                            <AlertCircle size={16} />
                            <span>{fieldErrors.submit}</span>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="intake-nav">
                        {currentStep > 0 && (
                            <button type="button" className="intake-btn-secondary" onClick={goBack}>
                                <ArrowLeft size={18} />
                                Voltar
                            </button>
                        )}

                        {currentStep < effectiveSteps.length - 1 ? (
                            <button
                                type="button"
                                className="intake-btn-primary"
                                onClick={goNext}
                                disabled={!canGoNext()}
                            >
                                Continuar
                                <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="intake-btn-submit"
                                onClick={handleSubmit}
                                disabled={!consentAccepted || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="intake-spinner-sm" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        Enviar ficha
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <footer className="intake-footer">
                    <ShieldCheck size={14} />
                    <span>Dados protegidos pela LGPD</span>
                </footer>
            </div>
        </div>
    )
}
