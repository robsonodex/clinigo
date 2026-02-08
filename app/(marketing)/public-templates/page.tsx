"use client"

import { useState } from 'react'
import { ArrowLeft, Eye } from 'lucide-react'
import Link from 'next/link'

// Importe os templates
import TemplateClassicMedical from './template-classic-medical'
import TemplateModernMinimal from './template-modern-minimal'
import TemplateCorporateHealthcare from './template-corporate-healthcare'
import TemplateSwissClean from './template-swiss-clean'
import TemplateDocumentaryClinical from './template-documentary-clinical'
import TemplateProfessionalTrust from './template-professional-trust'

const templates = [
    {
        id: 1,
        name: 'Classic Medical',
        description: 'Layout tradicional de clínica, fundo branco, hero centrado, grid de serviços',
        component: TemplateClassicMedical,
    },
    {
        id: 2,
        name: 'Modern Minimal',
        description: 'Muito espaço em branco, tipografia grande, layout split lateral',
        component: TemplateModernMinimal,
    },
    {
        id: 3,
        name: 'Corporate Healthcare',
        description: 'Visual institucional com header navy, estruturado e profissional',
        component: TemplateCorporateHealthcare,
    },
    {
        id: 4,
        name: 'Swiss Clean',
        description: 'Design suíço com grid rigoroso, tipografia pesada, numeração',
        component: TemplateSwissClean,
    },
    {
        id: 5,
        name: 'Documentary Clinical',
        description: 'Estilo de documento/ficha médica com campos e códigos',
        component: TemplateDocumentaryClinical,
    },
    {
        id: 6,
        name: 'Professional Trust',
        description: 'Foco em credenciais, equipe médica e selos de confiança',
        component: TemplateProfessionalTrust,
    },
]

export default function PublicTemplatesPreview() {
    const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null)

    // Se um template estiver selecionado, mostrar em tela cheia
    if (selectedTemplate !== null) {
        const Template = templates.find(t => t.id === selectedTemplate)?.component
        return (
            <div className="relative">
                <button
                    onClick={() => setSelectedTemplate(null)}
                    className="fixed top-4 left-4 z-50 h-10 px-4 bg-white border border-gray-200 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar para Lista
                </button>
                {Template && <Template />}
            </div>
        )
    }

    // Lista de templates
    return (
        <div className="min-h-screen bg-gray-100 py-12">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        6 Templates de Páginas Públicas
                    </h1>
                    <p className="text-gray-600">
                        Clique em um template para visualizar em tela cheia. Escolha 3 para serem os oficiais.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    {templates.map((template) => (
                        <div
                            key={template.id}
                            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:border-teal-vibrant/30 cursor-pointer group"
                            onClick={() => setSelectedTemplate(template.id)}
                        >
                            {/* Preview thumbnail */}
                            <div className="h-48 bg-gray-50 border-b border-gray-100 flex items-center justify-center relative overflow-hidden">
                                <div className="transform scale-[0.25] origin-top-left absolute top-0 left-0 w-[400%] h-[400%] pointer-events-none">
                                    <template.component />
                                </div>
                                <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent" />
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/5">
                                    <span className="h-10 px-4 bg-teal-vibrant text-white rounded flex items-center gap-2 text-sm font-medium">
                                        <Eye className="w-4 h-4" /> Visualizar
                                    </span>
                                </div>
                            </div>
                            {/* Info */}
                            <div className="p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-mono text-teal-vibrant">#{template.id}</span>
                                    <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                </div>
                                <p className="text-sm text-gray-600">{template.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
                        ← Voltar para Home
                    </Link>
                </div>
            </div>
        </div>
    )
}
