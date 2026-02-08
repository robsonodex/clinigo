"use client"

import Link from 'next/link'
import { Phone, Mail, MapPin, Clock, ChevronRight, Award, Shield, Star, Users } from 'lucide-react'

// Template 6: Professional Trust - Foco em credenciais e confiança
export default function TemplateProfessionalTrust() {
    const clinic = {
        name: "Clínica Exemplo",
        tagline: "Sua saúde em boas mãos",
        description: "Há mais de 20 anos cuidando de você e sua família com excelência e dedicação.",
        phone: "(11) 3000-0000",
        email: "contato@clinicaexemplo.com.br",
        address: "Av. Paulista, 1000 - São Paulo, SP",
        hours: "Seg-Sex: 8h-18h | Sáb: 8h-12h"
    }

    const doctors = [
        { name: "Dr. João Silva", specialty: "Cardiologista", crm: "CRM/SP 123456" },
        { name: "Dra. Maria Santos", specialty: "Pediatra", crm: "CRM/SP 234567" },
        { name: "Dr. Carlos Oliveira", specialty: "Neurologista", crm: "CRM/SP 345678" },
    ]

    const credentials = [
        { icon: Award, label: "20+ Anos de Experiência" },
        { icon: Users, label: "50.000+ Pacientes Atendidos" },
        { icon: Shield, label: "Selo LGPD Compliant" },
        { icon: Star, label: "4.9 Avaliação no Google" },
    ]

    return (
        <div className="min-h-screen bg-white">
            {/* Header elegante */}
            <header className="border-b border-gray-100">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{clinic.name}</span>
                    <nav className="hidden md:flex items-center gap-6">
                        <a href="#equipe" className="text-sm text-gray-600 hover:text-gray-900">Nossa Equipe</a>
                        <a href="#contato" className="text-sm text-gray-600 hover:text-gray-900">Contato</a>
                    </nav>
                    <Link href="#agendar" className="h-9 px-4 bg-navy-deep text-white rounded text-sm font-medium flex items-center gap-1">
                        Agendar <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            {/* Hero com foco em confiança */}
            <section className="py-16 bg-gradient-to-b from-gray-50 to-white">
                <div className="container mx-auto px-4 text-center max-w-3xl">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">{clinic.tagline}</h1>
                    <p className="text-lg text-gray-600 mb-8">{clinic.description}</p>
                    <div className="flex justify-center gap-3 mb-12">
                        <Link href="#agendar" className="h-12 px-6 bg-navy-deep text-white rounded font-medium flex items-center gap-2">
                            Agendar Consulta <ChevronRight className="w-4 h-4" />
                        </Link>
                        <a href={`tel:${clinic.phone}`} className="h-12 px-6 border border-gray-300 text-gray-700 rounded font-medium flex items-center gap-2">
                            <Phone className="w-4 h-4" /> Ligar
                        </a>
                    </div>
                    {/* Credenciais */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {credentials.map((cred, i) => (
                            <div key={i} className="p-4 bg-white border border-gray-100 rounded-lg">
                                <cred.icon className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                                <p className="text-xs text-gray-600">{cred.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Equipe médica */}
            <section id="equipe" className="py-16">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Nossa Equipe</h2>
                        <p className="text-gray-600">Profissionais qualificados e dedicados</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {doctors.map((doc, i) => (
                            <div key={i} className="text-center p-6 border border-gray-100 rounded-lg">
                                <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">Foto</span>
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-1">{doc.name}</h3>
                                <p className="text-sm text-teal-vibrant mb-1">{doc.specialty}</p>
                                <p className="text-xs text-gray-500 font-mono">{doc.crm}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contato */}
            <section id="contato" className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 max-w-4xl">
                    <h2 className="text-2xl font-bold text-gray-900 mb-8 text-center">Contato</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-teal-vibrant mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-900">Endereço</p>
                                    <p className="text-sm text-gray-600">{clinic.address}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="w-5 h-5 text-teal-vibrant mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-900">Telefone</p>
                                    <p className="text-sm text-gray-600">{clinic.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Mail className="w-5 h-5 text-teal-vibrant mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-900">E-mail</p>
                                    <p className="text-sm text-gray-600">{clinic.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock className="w-5 h-5 text-teal-vibrant mt-0.5" />
                                <div>
                                    <p className="font-medium text-gray-900">Horário</p>
                                    <p className="text-sm text-gray-600">{clinic.hours}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                            <span className="text-gray-400">Mapa</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-gray-100">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-gray-500">© 2024 {clinic.name}. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    )
}
