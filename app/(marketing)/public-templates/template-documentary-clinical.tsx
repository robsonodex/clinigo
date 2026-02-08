"use client"

import Link from 'next/link'
import { Phone, Mail, MapPin, Clock, ChevronRight } from 'lucide-react'

// Template 5: Documentary Clinical - Estilo de documento/ficha médica
export default function TemplateDocumentaryClinical() {
    const clinic = {
        name: "Clínica Exemplo",
        registration: "CRM/SP: 123456",
        phone: "(11) 3000-0000",
        email: "contato@clinicaexemplo.com.br",
        address: "Av. Paulista, 1000 - São Paulo, SP",
        hours: "Seg-Sex: 08:00 - 18:00"
    }

    const services = [
        { code: "CAR", name: "Cardiologia" },
        { code: "CLG", name: "Clínica Geral" },
        { code: "PED", name: "Pediatria" },
        { code: "NEU", name: "Neurologia" },
        { code: "ORT", name: "Ortopedia" },
        { code: "OFT", name: "Oftalmologia" },
    ]

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header estilo documento */}
            <header className="bg-white border-b-2 border-gray-200">
                <div className="container mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 border-2 border-gray-300 rounded flex items-center justify-center">
                            <span className="text-xs font-bold text-gray-400">LOGO</span>
                        </div>
                        <div>
                            <h1 className="font-bold text-gray-900">{clinic.name}</h1>
                            <p className="text-xs text-gray-500 font-mono">{clinic.registration}</p>
                        </div>
                    </div>
                    <Link href="#agendar" className="h-10 px-5 bg-teal-vibrant text-white text-sm font-medium flex items-center gap-2">
                        Agendar <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            {/* Navegação tabs */}
            <nav className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-6 flex gap-0">
                    <a href="#inicio" className="px-4 py-3 text-sm font-medium text-teal-vibrant border-b-2 border-teal-vibrant">Início</a>
                    <a href="#servicos" className="px-4 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent">Serviços</a>
                    <a href="#contato" className="px-4 py-3 text-sm font-medium text-gray-500 border-b-2 border-transparent">Contato</a>
                </div>
            </nav>

            <main className="container mx-auto px-6 py-8">
                {/* Card principal */}
                <div id="inicio" className="bg-white border border-gray-200 mb-6">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between">
                        <span className="text-xs font-semibold text-gray-600 uppercase">Informações</span>
                        <span className="text-xs text-gray-400 font-mono">DOC-001</span>
                    </div>
                    <div className="p-6 grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs text-gray-500 uppercase block mb-1">Nome</label>
                            <p className="text-gray-900 border-b border-dotted border-gray-300 pb-2">{clinic.name}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase block mb-1">Registro</label>
                            <p className="text-gray-900 border-b border-dotted border-gray-300 pb-2 font-mono">{clinic.registration}</p>
                        </div>
                    </div>
                </div>

                {/* Serviços */}
                <div id="servicos" className="bg-white border border-gray-200 mb-6">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between">
                        <span className="text-xs font-semibold text-gray-600 uppercase">Especialidades</span>
                        <span className="text-xs text-gray-400 font-mono">DOC-002</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                        {services.map((s, i) => (
                            <div key={i} className="px-6 py-4 flex items-center gap-4">
                                <span className="w-12 h-8 bg-gray-100 border flex items-center justify-center text-xs font-mono">{s.code}</span>
                                <span className="text-gray-900">{s.name}</span>
                                <span className="ml-auto text-xs text-teal-vibrant">Disponível</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Contato */}
                <div id="contato" className="bg-white border border-gray-200">
                    <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between">
                        <span className="text-xs font-semibold text-gray-600 uppercase">Contato</span>
                        <span className="text-xs text-gray-400 font-mono">DOC-003</span>
                    </div>
                    <div className="p-6 grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs text-gray-500 uppercase flex items-center gap-1 mb-1"><MapPin className="w-3 h-3" /> Endereço</label>
                            <p className="text-gray-900 border-b border-dotted border-gray-300 pb-2">{clinic.address}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase flex items-center gap-1 mb-1"><Phone className="w-3 h-3" /> Telefone</label>
                            <p className="text-gray-900 border-b border-dotted border-gray-300 pb-2 font-mono">{clinic.phone}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase flex items-center gap-1 mb-1"><Mail className="w-3 h-3" /> E-mail</label>
                            <p className="text-gray-900 border-b border-dotted border-gray-300 pb-2">{clinic.email}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 uppercase flex items-center gap-1 mb-1"><Clock className="w-3 h-3" /> Horário</label>
                            <p className="text-gray-900 border-b border-dotted border-gray-300 pb-2">{clinic.hours}</p>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="bg-white border-t-2 border-gray-200 py-4 mt-8">
                <div className="container mx-auto px-6 flex justify-between text-xs text-gray-500">
                    <span>© 2024 {clinic.name}</span>
                    <span className="font-mono">Página 1 de 1</span>
                </div>
            </footer>
        </div>
    )
}
