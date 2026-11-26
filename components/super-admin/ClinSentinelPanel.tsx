'use client'

import { useState, useEffect, useCallback } from 'react'
import {
    Activity,
    Bell,
    CheckCircle2,
    Copy,
    Loader2,
    MessageSquareShare,
    RefreshCw,
    Save,
    ShieldCheck,
    Smartphone,
    AlertTriangle,
} from 'lucide-react'

interface SentinelState {
    enabled: boolean
    last_status: string
    railway_http_status: number | null
    phone_number: string | null
    uptime_seconds: number | null
    consecutive_failures: number
    total_auto_heals: number
    last_checked_at: string | null
    last_ok_at: string | null
    last_failure_at: string | null
    last_failure_reason: string | null
    last_alert_sent_at: string | null
    alert_emails: string[]
    ntfy_topic: string
    ntfy_enabled: boolean
    telegram_bot_token: string | null
    telegram_chat_id: string | null
    webhook_url: string | null
    alert_cooldown_minutes: number
}

interface SentinelEvent {
    id: string
    event_type: string
    severity: string
    summary: string
    created_at: string
}

function formatDateTime(iso: string | null): string {
    if (!iso) return 'Ainda não executado'
    try {
        return new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    } catch {
        return iso
    }
}

function formatUptime(seconds: number | null): string {
    if (!seconds || seconds <= 0) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    if (h >= 24) {
        const d = Math.floor(h / 24)
        return `${d}d ${h % 24}h ${m}m`
    }
    return `${h}h ${m}m`
}

export function ClinSentinelPanel() {
    const [state, setState] = useState<SentinelState | null>(null)
    const [events, setEvents] = useState<SentinelEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [checkingNow, setCheckingNow] = useState(false)
    const [testingAlert, setTestingAlert] = useState(false)
    const [savingConfig, setSavingConfig] = useState(false)
    const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

    // Form config
    const [emailsInput, setEmailsInput] = useState('')
    const [ntfyTopic, setNtfyTopic] = useState('')
    const [ntfyEnabled, setNtfyEnabled] = useState(true)
    const [sentinelEnabled, setSentinelEnabled] = useState(true)
    const [cooldownMin, setCooldownMin] = useState(30)
    const [telegramToken, setTelegramToken] = useState('')
    const [telegramChatId, setTelegramChatId] = useState('')
    const [webhookUrl, setWebhookUrl] = useState('')
    const [copiedTopic, setCopiedTopic] = useState(false)

    // Lead offline recovery
    const [leadPhone, setLeadPhone] = useState('')
    const [leadMsg, setLeadMsg] = useState('')
    const [includeApology, setIncludeApology] = useState(true)
    const [recoveringLead, setRecoveringLead] = useState(false)
    const [leadFeedback, setLeadFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

    const loadSentinel = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/clin-whatsapp/sentinel')
            if (!res.ok) return
            const data = await res.json()
            if (data.state) {
                setState(data.state)
                setEmailsInput((data.state.alert_emails || []).join(', '))
                setNtfyTopic(data.state.ntfy_topic || '')
                setNtfyEnabled(Boolean(data.state.ntfy_enabled))
                setSentinelEnabled(Boolean(data.state.enabled))
                setCooldownMin(Number(data.state.alert_cooldown_minutes || 30))
                setTelegramToken(data.state.telegram_bot_token || '')
                setTelegramChatId(data.state.telegram_chat_id || '')
                setWebhookUrl(data.state.webhook_url || '')
            }
            setEvents(data.events || [])
        } catch {
            // Silencioso
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadSentinel()
    }, [loadSentinel])

    const handleCheckNow = async () => {
        setCheckingNow(true)
        setFeedback(null)
        try {
            const res = await fetch('/api/clin-whatsapp/sentinel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'check_now' }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao verificar Sentinela')
            const r = data.result
            if (r?.ok) {
                setFeedback({
                    type: 'ok',
                    text: r.autoHealed
                        ? 'Auto-cura executada: o Bot Clin foi reconectado automaticamente.'
                        : `Bot Clin online e verificado (${r.phone_number || 'ativo'}).`,
                })
            } else {
                setFeedback({
                    type: 'err',
                    text: r?.reason || 'Bot Clin offline detectado.',
                })
            }
            await loadSentinel()
        } catch (err: any) {
            setFeedback({ type: 'err', text: err?.message || 'Erro ao verificar status' })
        } finally {
            setCheckingNow(false)
        }
    }

    const handleTestAlert = async () => {
        setTestingAlert(true)
        setFeedback(null)
        try {
            const res = await fetch('/api/clin-whatsapp/sentinel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'test_alert' }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Falha ao enviar alerta de teste')
            const ar = data.alertResult || {}
            const sentChannels = [
                ar.emailSent ? 'E-mail' : null,
                ar.ntfySent ? 'Push Celular (ntfy)' : null,
                ar.telegramSent ? 'Telegram' : null,
                ar.webhookSent ? 'Webhook' : null,
            ].filter(Boolean)

            setFeedback({
                type: sentChannels.length > 0 ? 'ok' : 'err',
                text:
                    sentChannels.length > 0
                        ? `Alerta de teste disparado com sucesso via: ${sentChannels.join(', ')}.`
                        : `Nenhum canal conseguiu entregar: ${(ar.errors || []).join(' | ')}`,
            })
            await loadSentinel()
        } catch (err: any) {
            setFeedback({ type: 'err', text: err?.message || 'Erro no teste de alerta' })
        } finally {
            setTestingAlert(false)
        }
    }

    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault()
        setSavingConfig(true)
        setFeedback(null)
        try {
            const emails = emailsInput
                .split(/[,;\n]+/)
                .map((s) => s.trim())
                .filter((s) => s.includes('@'))

            const res = await fetch('/api/clin-whatsapp/sentinel', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    enabled: sentinelEnabled,
                    alert_emails: emails,
                    ntfy_topic: ntfyTopic,
                    ntfy_enabled: ntfyEnabled,
                    alert_cooldown_minutes: cooldownMin,
                    telegram_bot_token: telegramToken,
                    telegram_chat_id: telegramChatId,
                    webhook_url: webhookUrl,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao salvar')
            setState(data.state)
            setFeedback({ type: 'ok', text: 'Configurações do Sentinela 24/7 salvas com sucesso.' })
        } catch (err: any) {
            setFeedback({ type: 'err', text: err?.message || 'Erro ao salvar configurações' })
        } finally {
            setSavingConfig(false)
        }
    }

    const handleCopyNtfy = async () => {
        if (!ntfyTopic) return
        try {
            await navigator.clipboard.writeText(ntfyTopic)
            setCopiedTopic(true)
            setTimeout(() => setCopiedTopic(false), 2000)
        } catch {
            // fallback silencioso
        }
    }

    const handleRecoverLead = async (e: React.FormEvent) => {
        e.preventDefault()
        setLeadFeedback(null)
        if (!leadPhone.trim()) {
            setLeadFeedback({ type: 'err', text: 'Informe o número do WhatsApp com DDD.' })
            return
        }
        setRecoveringLead(true)
        try {
            const res = await fetch('/api/clin-whatsapp/recover-lead', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: leadPhone.trim(),
                    incomingMessage: leadMsg.trim() || 'Olá',
                    includeApologyPrefix: includeApology,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Erro ao acionar o Bot Clin')
            setLeadFeedback({
                type: 'ok',
                text: `Bot Clin acionado com sucesso para ${data.sentTo} (${data.messagesSent} mensagem enviada). A conversa já está ativa no chatbot.`,
            })
            setLeadPhone('')
            setLeadMsg('')
            await loadSentinel()
        } catch (err: any) {
            setLeadFeedback({ type: 'err', text: err?.message || 'Falha ao enviar resposta do Bot Clin' })
        } finally {
            setRecoveringLead(false)
        }
    }

    const isOnline = state?.last_status === 'connected'

    return (
        <div className="space-y-6 mt-8">
            {/* Card 1: Responder Lead Offline pelo Bot Clin */}
            <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <MessageSquareShare className="w-5 h-5 text-emerald-400" />
                            Responder Lead Offline pelo Bot Clin
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Quando alguém enviar mensagem durante uma queda do Railway, informe o número abaixo para o Bot Clin responder imediatamente e já manter a sessão ativa.
                        </p>
                    </div>
                </div>

                <form onSubmit={handleRecoverLead} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                WhatsApp do Lead (com DDD) *
                            </label>
                            <input
                                type="text"
                                value={leadPhone}
                                onChange={(e) => setLeadPhone(e.target.value)}
                                placeholder="Ex.: +55 15 99201-2801"
                                className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                Mensagem que o lead enviou (opcional — padrão: Olá)
                            </label>
                            <input
                                type="text"
                                value={leadMsg}
                                onChange={(e) => setLeadMsg(e.target.value)}
                                placeholder="Ex.: Quero saber valores e como funciona"
                                className="w-full px-3.5 py-2.5 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="inline-flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeApology}
                                onChange={(e) => setIncludeApology(e.target.checked)}
                                className="rounded border-gray-600 bg-gray-900 text-emerald-600"
                            />
                            Incluir pedido cordial de desculpas pela demora no início da resposta
                        </label>

                        <button
                            type="submit"
                            disabled={recoveringLead}
                            className="inline-flex items-center justify-center gap-2 min-h-[42px] px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            {recoveringLead ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquareShare className="w-4 h-4" />}
                            {recoveringLead ? 'Acionando Bot Clin...' : 'Acionar Bot Clin Agora'}
                        </button>
                    </div>

                    {leadFeedback && (
                        <div
                            className={`rounded-lg px-4 py-3 text-sm border ${
                                leadFeedback.type === 'ok'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                    : 'bg-red-500/10 border-red-500/30 text-red-300'
                            }`}
                        >
                            {leadFeedback.text}
                        </div>
                    )}
                </form>
            </div>

            {/* Card 2: Sentinela Imortal 24/7 (Auto-Cura + Push Celular + E-mail) */}
            <div className="bg-gray-800/60 border border-gray-700/60 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-700/60">
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            Sentinela 24/7 do Bot Clin (Keep-Alive, Auto-Cura e Alertas)
                        </h2>
                        <p className="text-sm text-gray-400 mt-1">
                            Monitora o Railway a cada 5 minutos pelo servidor, tenta reconectar sozinho antes de incomodar você e avisa fora do WhatsApp (E-mail e Push no celular) se houver queda real.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        <button
                            type="button"
                            onClick={handleCheckNow}
                            disabled={checkingNow}
                            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${checkingNow ? 'animate-spin' : ''}`} />
                            {checkingNow ? 'Verificando...' : 'Verificar e Auto-Curar Agora'}
                        </button>
                        <button
                            type="button"
                            onClick={handleTestAlert}
                            disabled={testingAlert}
                            className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                        >
                            <Bell className="w-3.5 h-3.5" />
                            {testingAlert ? 'Enviando...' : 'Enviar Alerta de Teste'}
                        </button>
                    </div>
                </div>

                {feedback && (
                    <div
                        className={`mt-4 rounded-lg px-4 py-3 text-sm border ${
                            feedback.type === 'ok'
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                : 'bg-red-500/10 border-red-500/30 text-red-300'
                        }`}
                    >
                        {feedback.text}
                    </div>
                )}

                {loading ? (
                    <div className="py-8 flex items-center justify-center text-gray-400 text-sm gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Carregando estado do Sentinela...
                    </div>
                ) : (
                    <>
                        {/* KPIs */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                            <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-3.5">
                                <p className="text-[11px] uppercase tracking-wider text-gray-400">Status do Sentinela</p>
                                <div className="flex items-center gap-2 mt-1.5">
                                    {isOnline ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                    ) : (
                                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                    )}
                                    <span className={`text-sm font-semibold ${isOnline ? 'text-emerald-400' : 'text-amber-300'}`}>
                                        {isOnline ? 'Online e Saudável' : state?.last_status === 'unknown' ? 'Aguardando 1º check' : 'Atenção / Offline'}
                                    </span>
                                </div>
                            </div>
                            <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-3.5">
                                <p className="text-[11px] uppercase tracking-wider text-gray-400">Uptime Railway</p>
                                <p className="text-sm font-semibold text-white mt-1.5">
                                    {formatUptime(state?.uptime_seconds ?? null)}
                                </p>
                            </div>
                            <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-3.5">
                                <p className="text-[11px] uppercase tracking-wider text-gray-400">Auto-Curas Realizadas</p>
                                <p className="text-sm font-semibold text-white mt-1.5">
                                    {state?.total_auto_heals ?? 0}
                                </p>
                            </div>
                            <div className="bg-gray-900/80 border border-gray-700/60 rounded-xl p-3.5">
                                <p className="text-[11px] uppercase tracking-wider text-gray-400">Última Checagem</p>
                                <p className="text-xs font-medium text-gray-200 mt-1.5">
                                    {formatDateTime(state?.last_checked_at ?? null)}
                                </p>
                            </div>
                        </div>

                        {/* Push instantâneo no celular via ntfy.sh */}
                        <div className="mt-5 bg-gray-900/70 border border-emerald-500/30 rounded-xl p-4">
                            <div className="flex items-start gap-3">
                                <Smartphone className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white">
                                        Receba alerta Push instantâneo no celular (mesmo com WhatsApp fora do ar)
                                    </p>
                                    <ol className="text-xs text-gray-300 mt-2 space-y-1 list-decimal list-inside">
                                        <li>Instale o aplicativo gratuito <strong>ntfy</strong> na Play Store (Android) ou App Store (iPhone) — não precisa criar conta.</li>
                                        <li>Toque em <strong>+ (Assinar tópico)</strong> e cole exatamente o código exclusivo abaixo.</li>
                                        <li>Clique em <strong>Enviar Alerta de Teste</strong> acima para confirmar o toque no seu celular na hora.</li>
                                    </ol>
                                    <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                                        <code className="flex-1 px-3 py-2 bg-gray-950 border border-gray-700 rounded-md text-xs text-emerald-300 font-mono truncate">
                                            {ntfyTopic || 'clinigo-bot-alerta'}
                                        </code>
                                        <button
                                            type="button"
                                            onClick={handleCopyNtfy}
                                            className="inline-flex items-center justify-center gap-1.5 min-h-[38px] px-3.5 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-md cursor-pointer"
                                        >
                                            <Copy className="w-3.5 h-3.5" />
                                            {copiedTopic ? 'Copiado' : 'Copiar Tópico'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Formulário de Canais de Alerta */}
                        <form onSubmit={handleSaveConfig} className="mt-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                        E-mails para Alerta Urgente (separados por vírgula)
                                    </label>
                                    <input
                                        type="text"
                                        value={emailsInput}
                                        onChange={(e) => setEmailsInput(e.target.value)}
                                        className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                        Intervalo mínimo entre alertas repetidos (minutos)
                                    </label>
                                    <input
                                        type="number"
                                        min={5}
                                        max={240}
                                        value={cooldownMin}
                                        onChange={(e) => setCooldownMin(Number(e.target.value))}
                                        className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                        Telegram Bot Token (opcional)
                                    </label>
                                    <input
                                        type="password"
                                        value={telegramToken}
                                        onChange={(e) => setTelegramToken(e.target.value)}
                                        placeholder="Opcional"
                                        className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                        Telegram Chat ID (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={telegramChatId}
                                        onChange={(e) => setTelegramChatId(e.target.value)}
                                        placeholder="Opcional"
                                        className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-300 mb-1.5">
                                        Webhook Externo (opcional)
                                    </label>
                                    <input
                                        type="url"
                                        value={webhookUrl}
                                        onChange={(e) => setWebhookUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-3.5 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                                <div className="flex items-center gap-5 flex-wrap">
                                    <label className="inline-flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={sentinelEnabled}
                                            onChange={(e) => setSentinelEnabled(e.target.checked)}
                                            className="rounded border-gray-600 bg-gray-900 text-emerald-600"
                                        />
                                        Monitoramento 24/7 ativo (a cada 5 min)
                                    </label>
                                    <label className="inline-flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={ntfyEnabled}
                                            onChange={(e) => setNtfyEnabled(e.target.checked)}
                                            className="rounded border-gray-600 bg-gray-900 text-emerald-600"
                                        />
                                        Push no celular (ntfy.sh) ativo
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={savingConfig}
                                    className="inline-flex items-center justify-center gap-2 min-h-[40px] px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                                >
                                    {savingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                    Salvar Configurações
                                </button>
                            </div>
                        </form>

                        {/* Histórico recente */}
                        {events.length > 0 && (
                            <div className="mt-6 pt-5 border-t border-gray-700/60">
                                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 mb-3">
                                    <Activity className="w-3.5 h-3.5" />
                                    Histórico Recente do Sentinela
                                </p>
                                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                    {events.slice(0, 10).map((ev) => (
                                        <div
                                            key={ev.id}
                                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 bg-gray-900/70 border border-gray-700/50 rounded-lg px-3 py-2 text-xs"
                                        >
                                            <span className="text-gray-200">{ev.summary}</span>
                                            <span className="text-gray-400 shrink-0">{formatDateTime(ev.created_at)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

