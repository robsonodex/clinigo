'use client'

import { useState } from 'react'
import { DoctoraliaTpl1 } from './doctoralia-1'
import { DoctoraliaTpl2 } from './doctoralia-2'
import { DoctoraliaTpl3 } from './doctoralia-3'
import { DoctoraliaTpl4 } from './doctoralia-4'
import { DoctoraliaTpl5 } from './doctoralia-5'
import { DoctoraliaTpl6 } from './doctoralia-6'

const templates = [
    {
        id: 1,
        name: 'Doctoralia 1',
        desc: 'Perfil completo esquerda, calendario direita, visual limpo',
        Component: DoctoraliaTpl1
    },
    {
        id: 2,
        name: 'Doctoralia 2',
        desc: 'Layout compacto, tabs presencial/online, denso',
        Component: DoctoraliaTpl2
    },
    {
        id: 3,
        name: 'Doctoralia 3',
        desc: 'Seções expansíveis, badge verificado, stats',
        Component: DoctoraliaTpl3
    },
    {
        id: 4,
        name: 'Ultra Simples',
        desc: 'Sem efeitos, direto, funcional, preto e branco',
        Component: DoctoraliaTpl4
    },
    {
        id: 5,
        name: 'Compacto Pro',
        desc: 'Colunas balanceadas, cards separados, tipografia limpa',
        Component: DoctoraliaTpl5
    },
    {
        id: 6,
        name: 'Minimalista Puro',
        desc: 'Máxima simplicidade, layout horizontal, sem bordas arredondadas',
        Component: DoctoraliaTpl6
    }
]

export default function BookingTemplatesPreview() {
    const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)
    const [fullscreen, setFullscreen] = useState(false)

    if (fullscreen && selectedTemplate !== null) {
        const template = templates.find(t => t.id === selectedTemplate)!
        const Component = template.Component
        return (
            <div className="fixed inset-0 z-50">
                <button
                    onClick={() => setFullscreen(false)}
                    className="fixed top-4 left-4 z-50 px-4 py-2 bg-black text-white text-sm"
                >
                    Voltar
                </button>
                <Component />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 py-10">
            <div className="max-w-5xl mx-auto px-4">
                <div className="mb-10">
                    <h1 className="text-2xl font-bold mb-1">Templates de Agendamento</h1>
                    <p className="text-gray-500 text-sm">Estilo Doctoralia - Medico esquerda, agenda direita</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {templates.map((template) => {
                        const Component = template.Component
                        return (
                            <div
                                key={template.id}
                                className="bg-white border overflow-hidden"
                            >
                                {/* Preview */}
                                <div className="h-40 bg-gray-50 relative overflow-hidden border-b">
                                    <div className="absolute inset-0 transform scale-[0.25] origin-top-left" style={{ width: '400%', height: '400%' }}>
                                        <Component />
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="w-5 h-5 bg-black text-white text-xs flex items-center justify-center">
                                            {template.id}
                                        </span>
                                        <span className="font-medium text-sm">{template.name}</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-3">{template.desc}</p>
                                    <button
                                        onClick={() => {
                                            setSelectedTemplate(template.id)
                                            setFullscreen(true)
                                        }}
                                        className="w-full py-2 bg-black text-white text-xs"
                                    >
                                        Ver Tela Cheia
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="mt-8 text-center text-xs text-gray-400">
                    Escolha um template e me diga o numero
                </div>
            </div>
        </div>
    )
}
