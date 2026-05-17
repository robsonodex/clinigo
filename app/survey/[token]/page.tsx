'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Loader2, AlertTriangle, Star, Send, Heart,
    CheckCircle2, SmilePlus,
} from 'lucide-react'

interface SurveyData {
    survey_id: string
    patient_name: string
    doctor_name: string
    doctor_specialty: string
    clinic_name: string
    appointment_date: string
    already_completed: boolean
}

export default function SurveyPage() {
    const params = useParams()
    const token = params.token as string

    const [loading, setLoading] = useState(true)
    const [survey, setSurvey] = useState<SurveyData | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [step, setStep] = useState(1) // 1=NPS, 2=Stars, 3=Comment, 4=Thanks
    const [npsScore, setNpsScore] = useState<number | null>(null)
    const [stars, setStars] = useState(0)
    const [comment, setComment] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [completed, setCompleted] = useState(false)

    useEffect(() => {
        if (!token) return
        loadSurvey()
    }, [token])

    async function loadSurvey() {
        try {
            const res = await fetch(`/api/surveys?token=${token}`)
            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Link inválido')
                return
            }

            if (data.already_completed) {
                setCompleted(true)
                setSurvey({ ...data } as any)
                return
            }

            setSurvey(data)
        } catch (err) {
            setError('Erro ao carregar pesquisa')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async () => {
        if (npsScore === null) return
        setSubmitting(true)

        try {
            const res = await fetch('/api/surveys', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    nps_score: npsScore,
                    professional_rating: stars > 0 ? stars : null,
                    comment: comment.trim() || null,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.error || 'Erro ao enviar')
                return
            }

            setCompleted(true)
            setStep(4)
        } catch (err) {
            setError('Erro ao enviar resposta')
        } finally {
            setSubmitting(false)
        }
    }

    const getNpsColor = (score: number) => {
        if (score >= 9) return 'bg-green-500 text-white hover:bg-green-600'
        if (score >= 7) return 'bg-yellow-500 text-white hover:bg-yellow-600'
        return 'bg-red-500 text-white hover:bg-red-600'
    }

    const getNpsSelectedColor = (score: number) => {
        if (score >= 9) return 'bg-green-600 text-white ring-2 ring-green-300 scale-110'
        if (score >= 7) return 'bg-yellow-600 text-white ring-2 ring-yellow-300 scale-110'
        return 'bg-red-600 text-white ring-2 ring-red-300 scale-110'
    }

    // Loading
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-sm text-gray-500">Carregando...</p>
                </div>
            </div>
        )
    }

    // Error
    if (error && !survey) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50 p-4">
                <Card className="max-w-sm w-full">
                    <CardContent className="flex flex-col items-center py-10 text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                        <h2 className="text-lg font-bold mb-2">Link Inválido</h2>
                        <p className="text-sm text-gray-500">{error}</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // Already completed / Thank you
    if (completed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50 p-4">
                <Card className="max-w-sm w-full border-green-200">
                    <CardContent className="flex flex-col items-center py-12 text-center">
                        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-5 animate-bounce">
                            <Heart className="w-10 h-10 text-green-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-green-800 mb-2">
                            Obrigado! 💚
                        </h2>
                        <p className="text-gray-600">
                            Sua opinião é muito importante para nós.
                        </p>
                        {survey?.clinic_name && (
                            <p className="text-sm text-gray-400 mt-4">{survey.clinic_name}</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 pb-8">
            <div className="max-w-md mx-auto space-y-4 pt-6">
                {/* Header */}
                <div className="text-center">
                    <SmilePlus className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                    <h1 className="text-xl font-bold">Como foi sua experiência?</h1>
                    <p className="text-sm text-gray-500 mt-1">{survey?.clinic_name}</p>
                </div>

                {/* Progress dots */}
                <div className="flex items-center justify-center gap-2">
                    {[1, 2, 3].map(s => (
                        <div
                            key={s}
                            className={`w-2.5 h-2.5 rounded-full transition-all ${
                                s === step ? 'bg-blue-600 scale-125' :
                                s < step ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                        />
                    ))}
                </div>

                {/* Step 1: NPS Score */}
                {step === 1 && (
                    <Card>
                        <CardHeader className="text-center pb-3">
                            <CardTitle className="text-base">
                                De 0 a 10, o quanto você recomendaria nossa clínica?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid grid-cols-11 gap-1">
                                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setNpsScore(n)}
                                        className={`aspect-square rounded-lg text-sm font-bold transition-all ${
                                            npsScore === n
                                                ? getNpsSelectedColor(n)
                                                : `bg-gray-100 hover:bg-gray-200 text-gray-700`
                                        }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between text-[10px] text-gray-400 px-1">
                                <span>Nada provável</span>
                                <span>Muito provável</span>
                            </div>
                            <Button
                                onClick={() => setStep(2)}
                                disabled={npsScore === null}
                                className="w-full"
                            >
                                Continuar
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Professional Rating */}
                {step === 2 && (
                    <Card>
                        <CardHeader className="text-center pb-3">
                            <CardTitle className="text-base">
                                Como você avalia o atendimento{survey?.doctor_name ? ` de ${survey.doctor_name}` : ''}?
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex justify-center gap-3">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <button
                                        key={n}
                                        onClick={() => setStars(n)}
                                        className="transition-transform hover:scale-110"
                                    >
                                        <Star
                                            className={`w-10 h-10 transition-colors ${
                                                n <= stars
                                                    ? 'fill-yellow-400 text-yellow-400'
                                                    : 'text-gray-300'
                                            }`}
                                        />
                                    </button>
                                ))}
                            </div>
                            <div className="text-center text-sm text-gray-500">
                                {stars === 0 && 'Toque nas estrelas'}
                                {stars === 1 && 'Ruim 😞'}
                                {stars === 2 && 'Regular 😐'}
                                {stars === 3 && 'Bom 🙂'}
                                {stars === 4 && 'Muito bom 😊'}
                                {stars === 5 && 'Excelente! 🤩'}
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                                    Voltar
                                </Button>
                                <Button onClick={() => setStep(3)} className="flex-1">
                                    Continuar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Comment */}
                {step === 3 && (
                    <Card>
                        <CardHeader className="text-center pb-3">
                            <CardTitle className="text-base">
                                Deseja deixar um comentário? (opcional)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <textarea
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                className="w-full border rounded-lg px-3 py-2 text-sm h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Conte-nos mais sobre sua experiência..."
                            />

                            {/* Summary */}
                            <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-500">NPS:</span>
                                    <span className={`font-bold ${
                                        (npsScore || 0) >= 9 ? 'text-green-600' :
                                        (npsScore || 0) >= 7 ? 'text-yellow-600' : 'text-red-600'
                                    }`}>{npsScore}/10</span>
                                </div>
                                {stars > 0 && (
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500">Atendimento:</span>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(n => (
                                                <Star key={n} className={`w-3.5 h-3.5 ${n <= stars ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {error && <p className="text-red-500 text-sm">{error}</p>}

                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                                    Voltar
                                </Button>
                                <Button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 gap-1"
                                >
                                    {submitting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    {submitting ? 'Enviando...' : 'Enviar'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
