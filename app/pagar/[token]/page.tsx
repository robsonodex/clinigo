'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

// =============================================================================
// Tipos
// =============================================================================

interface PaymentData {
    id: string
    clinic_name: string
    amount: number
    plan_type: string
    plan_name: string
    description: string
    status: string
    linha_digitavel: string
    due_date: string | null
    created_at: string
}

// =============================================================================
// Página Pública /pagar/[token]
// =============================================================================

export default function PublicPaymentPage() {
    const params = useParams()
    const token = params.token as string

    const [payment, setPayment] = useState<PaymentData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const [downloadingPdf, setDownloadingPdf] = useState(false)

    useEffect(() => {
        if (!token) return

        fetch(`/api/billing/public-payment?token=${token}`)
            .then(res => {
                if (!res.ok) throw new Error('Pagamento não encontrado')
                return res.json()
            })
            .then(data => {
                setPayment(data)
                setLoading(false)
            })
            .catch(err => {
                setError(err.message)
                setLoading(false)
            })
    }, [token])

    const handleCopyLinhaDigitavel = async () => {
        if (!payment?.linha_digitavel) return
        try {
            await navigator.clipboard.writeText(payment.linha_digitavel)
            setCopied(true)
            setTimeout(() => setCopied(false), 3000)
        } catch {
            // Fallback para mobile
            const textarea = document.createElement('textarea')
            textarea.value = payment.linha_digitavel
            textarea.style.position = 'fixed'
            textarea.style.opacity = '0'
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
            setCopied(true)
            setTimeout(() => setCopied(false), 3000)
        }
    }

    const handleDownloadPdf = async () => {
        setDownloadingPdf(true)
        try {
            const res = await fetch(`/api/billing/public-payment/pdf?token=${token}`)
            if (!res.ok) throw new Error('PDF não disponível')
            const blob = await res.blob()
            const url = window.URL.createObjectURL(blob)
            // Em mobile, abrir em nova aba é melhor que download
            window.open(url, '_blank')
        } catch {
            alert('Não foi possível abrir o PDF. Tente novamente em alguns minutos.')
        } finally {
            setDownloadingPdf(false)
        }
    }

    // =========================================================================
    // Loading State
    // =========================================================================
    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.loadingPulse} />
                    <div style={{ ...styles.loadingPulse, width: '60%', height: '1rem' }} />
                    <div style={{ ...styles.loadingPulse, width: '80%', height: '1rem' }} />
                </div>
            </div>
        )
    }

    // =========================================================================
    // Error State
    // =========================================================================
    if (error || !payment) {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.errorIcon}>✕</div>
                    <h1 style={styles.errorTitle}>Pagamento não encontrado</h1>
                    <p style={styles.errorText}>
                        O link de pagamento pode ter expirado ou ser inválido.
                        Entre em contato com o suporte.
                    </p>
                </div>
            </div>
        )
    }

    // =========================================================================
    // Already Paid State
    // =========================================================================
    if (payment.status === 'PAID') {
        return (
            <div style={styles.container}>
                <div style={styles.card}>
                    <div style={styles.paidIcon}>✓</div>
                    <h1 style={styles.paidTitle}>Pagamento Confirmado!</h1>
                    <p style={styles.paidText}>
                        O pagamento da <strong>{payment.clinic_name}</strong> já foi confirmado.
                        Obrigado!
                    </p>
                </div>
                <div style={styles.footer}>
                    <img src="/logo.svg" alt="CliniGo" style={styles.footerLogo} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <p style={styles.footerText}>CliniGo — Gestão inteligente para clínicas</p>
                </div>
            </div>
        )
    }

    // =========================================================================
    // Payment Pending — Main View
    // =========================================================================
    return (
        <>
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1" />
                <meta name="theme-color" content="#059669" />
                <title>Pagamento — {payment.clinic_name} | CliniGo</title>
            </head>
            <div style={styles.container}>
                {/* Header */}
                <div style={styles.header}>
                    <div style={styles.headerIcon}>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="14" x="2" y="5" rx="2" />
                            <line x1="2" x2="22" y1="10" y2="10" />
                        </svg>
                    </div>
                    <div>
                        <h1 style={styles.headerTitle}>Pagamento de Assinatura</h1>
                        <p style={styles.headerSubtitle}>{payment.clinic_name}</p>
                    </div>
                </div>

                {/* Card Principal */}
                <div style={styles.card}>
                    {/* Valor */}
                    <div style={styles.amountSection}>
                        <span style={styles.amountLabel}>Valor a pagar</span>
                        <span style={styles.amountValue}>
                            R$ {payment.amount.toFixed(2).replace('.', ',')}
                        </span>
                        <span style={styles.amountPlan}>{payment.plan_name} — Mensal</span>
                    </div>

                    {/* Divider */}
                    <div style={styles.divider} />

                    {/* Infos */}
                    <div style={styles.infoGrid}>
                        <div style={styles.infoItem}>
                            <span style={styles.infoLabel}>Status</span>
                            <span style={styles.statusBadge}>Pendente</span>
                        </div>
                        {payment.due_date && (
                            <div style={styles.infoItem}>
                                <span style={styles.infoLabel}>Vencimento atual</span>
                                <span style={styles.infoValue}>
                                    {new Date(payment.due_date).toLocaleDateString('pt-BR')}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Divider */}
                    <div style={styles.divider} />

                    {/* Linha Digitável */}
                    {payment.linha_digitavel && (
                        <div style={styles.linhaSection}>
                            <span style={styles.linhaLabel}>Linha Digitável</span>
                            <div style={styles.linhaBox}>
                                <code style={styles.linhaCode}>{payment.linha_digitavel}</code>
                            </div>
                            <button
                                onClick={handleCopyLinhaDigitavel}
                                style={{
                                    ...styles.btnSecondary,
                                    ...(copied ? styles.btnCopied : {}),
                                }}
                            >
                                {copied ? '✓ Copiado!' : '📋 Copiar Linha Digitável'}
                            </button>
                        </div>
                    )}

                    {/* Divider */}
                    <div style={styles.divider} />

                    {/* Botão PDF */}
                    <button
                        onClick={handleDownloadPdf}
                        disabled={downloadingPdf}
                        style={{
                            ...styles.btnPrimary,
                            ...(downloadingPdf ? styles.btnDisabled : {}),
                        }}
                    >
                        {downloadingPdf ? (
                            <>
                                <span style={styles.spinner} /> Abrindo PDF...
                            </>
                        ) : (
                            <>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.5rem' }}>
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                    <polyline points="7 10 12 15 17 10" />
                                    <line x1="12" x2="12" y1="15" y2="3" />
                                </svg>
                                Abrir Boleto (PDF)
                            </>
                        )}
                    </button>
                </div>

                {/* Info box */}
                <div style={styles.infoBox}>
                    <p style={styles.infoBoxText}>
                        💡 Após o pagamento ser confirmado pelo banco, sua assinatura será renovada automaticamente.
                    </p>
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    <img src="/logo.svg" alt="CliniGo" style={styles.footerLogo} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    <p style={styles.footerText}>CliniGo — Gestão inteligente para clínicas</p>
                    <p style={styles.footerDisclaimer}>
                        Este é um link seguro gerado pela plataforma CliniGo.
                    </p>
                </div>
            </div>
        </>
    )
}

// =============================================================================
// Estilos inline — Mobile-first, sem dependência de CSS externo
// =============================================================================

const styles: Record<string, React.CSSProperties> = {
    container: {
        minHeight: '100vh',
        backgroundColor: '#f8faf9',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '1.5rem 1rem',
        paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        fontFamily: "'Inter', 'Segoe UI', -apple-system, sans-serif",
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        width: '100%',
        maxWidth: '28rem',
    },
    headerIcon: {
        width: '3rem',
        height: '3rem',
        borderRadius: '0.75rem',
        background: 'linear-gradient(135deg, #059669, #10b981)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    headerTitle: {
        fontSize: 'clamp(1.125rem, 4vw, 1.375rem)',
        fontWeight: 700,
        color: '#111827',
        margin: 0,
        lineHeight: 1.3,
    },
    headerSubtitle: {
        fontSize: 'clamp(0.8125rem, 3vw, 0.9375rem)',
        color: '#6b7280',
        margin: 0,
    },
    card: {
        width: '100%',
        maxWidth: '28rem',
        backgroundColor: '#ffffff',
        borderRadius: '1rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1), 0 4px 14px rgba(0,0,0,0.06)',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
    },
    amountSection: {
        textAlign: 'center' as const,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.25rem',
    },
    amountLabel: {
        fontSize: '0.8125rem',
        color: '#6b7280',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.05em',
        fontWeight: 500,
    },
    amountValue: {
        fontSize: 'clamp(2rem, 8vw, 2.75rem)',
        fontWeight: 800,
        color: '#059669',
        lineHeight: 1.2,
    },
    amountPlan: {
        fontSize: '0.875rem',
        color: '#9ca3af',
    },
    divider: {
        height: '1px',
        backgroundColor: '#f3f4f6',
        width: '100%',
    },
    infoGrid: {
        display: 'flex',
        justifyContent: 'space-around',
        gap: '1rem',
    },
    infoItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
    },
    infoLabel: {
        fontSize: '0.75rem',
        color: '#9ca3af',
        textTransform: 'uppercase' as const,
        letterSpacing: '0.03em',
    },
    infoValue: {
        fontSize: '0.9375rem',
        fontWeight: 600,
        color: '#374151',
    },
    statusBadge: {
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: '#d97706',
        backgroundColor: '#fef3c7',
        padding: '0.25rem 0.75rem',
        borderRadius: '9999px',
        border: '1px solid #fde68a',
    },
    linhaSection: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
    },
    linhaLabel: {
        fontSize: '0.8125rem',
        fontWeight: 600,
        color: '#374151',
    },
    linhaBox: {
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '0.5rem',
        padding: '0.75rem',
        overflowX: 'auto' as const,
    },
    linhaCode: {
        fontSize: 'clamp(0.6875rem, 2.5vw, 0.8125rem)',
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
        color: '#374151',
        wordBreak: 'break-all' as const,
        lineHeight: 1.5,
    },
    btnPrimary: {
        width: '100%',
        padding: '0.875rem 1.5rem',
        fontSize: '1rem',
        fontWeight: 700,
        color: '#ffffff',
        background: 'linear-gradient(135deg, #059669, #10b981)',
        border: 'none',
        borderRadius: '0.75rem',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '3rem',
        transition: 'opacity 0.2s, transform 0.1s',
        WebkitTapHighlightColor: 'transparent',
    },
    btnSecondary: {
        width: '100%',
        padding: '0.625rem 1rem',
        fontSize: '0.875rem',
        fontWeight: 600,
        color: '#059669',
        backgroundColor: '#ecfdf5',
        border: '1.5px solid #a7f3d0',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        minHeight: '2.75rem',
        transition: 'all 0.2s',
        WebkitTapHighlightColor: 'transparent',
    },
    btnCopied: {
        color: '#ffffff',
        backgroundColor: '#059669',
        borderColor: '#059669',
    },
    btnDisabled: {
        opacity: 0.6,
        cursor: 'not-allowed',
    },
    spinner: {
        display: 'inline-block',
        width: '1rem',
        height: '1rem',
        border: '2px solid rgba(255,255,255,0.3)',
        borderTopColor: '#ffffff',
        borderRadius: '50%',
        animation: 'spin 0.6s linear infinite',
        marginRight: '0.5rem',
    },
    infoBox: {
        width: '100%',
        maxWidth: '28rem',
        marginTop: '1rem',
        padding: '0.875rem 1rem',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '0.75rem',
    },
    infoBoxText: {
        fontSize: '0.8125rem',
        color: '#1e40af',
        margin: 0,
        lineHeight: 1.5,
    },
    footer: {
        marginTop: '2rem',
        textAlign: 'center' as const,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
    },
    footerLogo: {
        height: '2rem',
        marginBottom: '0.5rem',
    },
    footerText: {
        fontSize: '0.8125rem',
        color: '#9ca3af',
        margin: 0,
    },
    footerDisclaimer: {
        fontSize: '0.6875rem',
        color: '#d1d5db',
        margin: 0,
    },
    loadingPulse: {
        width: '100%',
        height: '2rem',
        backgroundColor: '#e5e7eb',
        borderRadius: '0.5rem',
        animation: 'pulse 1.5s ease-in-out infinite',
    },
    errorIcon: {
        width: '3.5rem',
        height: '3.5rem',
        borderRadius: '50%',
        backgroundColor: '#fef2f2',
        color: '#ef4444',
        fontSize: '1.5rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
    },
    errorTitle: {
        fontSize: '1.25rem',
        fontWeight: 700,
        color: '#111827',
        textAlign: 'center' as const,
        margin: 0,
    },
    errorText: {
        fontSize: '0.875rem',
        color: '#6b7280',
        textAlign: 'center' as const,
        lineHeight: 1.5,
        margin: 0,
    },
    paidIcon: {
        width: '3.5rem',
        height: '3.5rem',
        borderRadius: '50%',
        backgroundColor: '#ecfdf5',
        color: '#059669',
        fontSize: '1.5rem',
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto',
    },
    paidTitle: {
        fontSize: '1.25rem',
        fontWeight: 700,
        color: '#059669',
        textAlign: 'center' as const,
        margin: 0,
    },
    paidText: {
        fontSize: '0.875rem',
        color: '#6b7280',
        textAlign: 'center' as const,
        lineHeight: 1.5,
        margin: 0,
    },
}
