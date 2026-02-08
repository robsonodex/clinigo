"use client"

import Image from 'next/image'
import Link from 'next/link'
import { Phone, Mail, MapPin, Clock, ChevronRight, Heart, Stethoscope, Baby, Brain, Bone, Eye } from 'lucide-react'

// Template 1: Classic Medical - Layout tradicional de clínica, fundo branco predominante
export default function TemplateClassicMedical() {
    // Dados mockados da clínica
    const clinic = {
        name: "Clínica Exemplo",
        tagline: "Cuidando da sua saúde com excelência",
        description: "Há mais de 20 anos oferecendo atendimento médico de qualidade para você e sua família.",
        phone: "(11) 3000-0000",
        email: "contato@clinicaexemplo.com.br",
        address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
        hours: "Seg à Sex: 8h às 18h | Sáb: 8h às 12h"
    }

    const services = [
        { icon: Heart, name: "Cardiologia", description: "Diagnóstico e tratamento de doenças cardíacas" },
        { icon: Stethoscope, name: "Clínica Geral", description: "Atendimento médico para todas as idades" },
        { icon: Baby, name: "Pediatria", description: "Cuidado especializado para crianças" },
        { icon: Brain, name: "Neurologia", description: "Tratamento de distúrbios do sistema nervoso" },
        { icon: Bone, name: "Ortopedia", description: "Especialistas em ossos e articulações" },
        { icon: Eye, name: "Oftalmologia", description: "Cuidados com a saúde dos seus olhos" },
    ]

    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-gray-100 bg-white sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-teal-vibrant/10 rounded-lg flex items-center justify-center">
                            <Stethoscope className="w-5 h-5 text-teal-vibrant" />
                        </div>
                        <span className="font-semibold text-gray-900">{clinic.name}</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-6">
                        <a href="#servicos" className="text-sm text-gray-600 hover:text-teal-vibrant">Serviços</a>
                        <a href="#sobre" className="text-sm text-gray-600 hover:text-teal-vibrant">Sobre</a>
                        <a href="#contato" className="text-sm text-gray-600 hover:text-teal-vibrant">Contato</a>
                    </nav>
                    <Link href="#agendar" className="h-9 px-4 bg-teal-vibrant text-white rounded text-sm font-medium flex items-center gap-1">
                        Agendar Consulta <ChevronRight className="w-4 h-4" />
                    </Link>
                </div>
            </header>

            {/* Hero - Centrado, simples */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 text-center max-w-3xl">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        {clinic.tagline}
                    </h1>
                    <p className="text-lg text-gray-600 mb-8">
                        {clinic.description}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="#agendar" className="h-12 px-6 bg-teal-vibrant text-white rounded font-medium flex items-center justify-center gap-2">
                            Agendar Consulta
                        </Link>
                        <a href={`tel:${clinic.phone}`} className="h-12 px-6 border border-gray-300 text-gray-700 rounded font-medium flex items-center justify-center gap-2">
                            <Phone className="w-4 h-4" /> {clinic.phone}
                        </a>
                    </div>
                </div>
            </section>

            {/* Serviços - Grid 3 colunas */}
            <section id="servicos" className="py-16">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Nossos Serviços</h2>
                        <p className="text-gray-600">Especialidades médicas disponíveis</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                        {services.map((service, index) => (
                            <div key={index} className="p-6 border border-gray-100 rounded-lg bg-white hover:border-teal-vibrant/30">
                                <service.icon className="w-8 h-8 text-teal-vibrant mb-4" />
                                <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                                <p className="text-sm text-gray-600">{service.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Sobre */}
            <section id="sobre" className="py-16 bg-gray-50">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Sobre a Clínica</h2>
                            <p className="text-gray-600 mb-4">
                                Nossa clínica conta com uma equipe de profissionais altamente qualificados,
                                equipamentos modernos e um ambiente acolhedor para garantir o melhor atendimento.
                            </p>
                            <p className="text-gray-600">
                                Estamos comprometidos com a sua saúde e bem-estar, oferecendo um atendimento
                                humanizado e personalizado para cada paciente.
                            </p>
                        </div>
                        <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
                            <span className="text-gray-400">Foto da Clínica</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contato */}
            <section id="contato" className="py-16">
                <div className="container mx-auto px-4 max-w-4xl">
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8 text-center">Contato e Localização</h2>
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
                        <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                            <span className="text-gray-400">Mapa</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 border-t border-gray-100">
                <div className="container mx-auto px-4 text-center">
                    <p className="text-sm text-gray-500">
                        © 2024 {clinic.name}. Todos os direitos reservados.
                    </p>
                </div>
            </footer>
        </div>
    )
}
