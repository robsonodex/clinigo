"use client"

import Link from 'next/link'
import { Phone, Mail, MapPin, Clock, ChevronRight, Heart, Stethoscope, Baby, Brain, Bone, Eye } from 'lucide-react'

// Template 3: Corporate Healthcare - Visual institucional, mais estruturado
export default function TemplateCorporateHealthcare() {
    const clinic = {
        name: "Clínica Exemplo",
        tagline: "Excelência em Atendimento Médico",
        description: "Oferecemos serviços médicos de alta qualidade com uma equipe de especialistas comprometidos com sua saúde.",
        phone: "(11) 3000-0000",
        email: "contato@clinicaexemplo.com.br",
        address: "Av. Paulista, 1000 - São Paulo, SP",
        hours: "Seg-Sex: 8h-18h | Sáb: 8h-12h"
    }

    const services = [
        { icon: Heart, name: "Cardiologia", description: "Diagnóstico e tratamento de doenças cardiovasculares" },
        { icon: Stethoscope, name: "Clínica Geral", description: "Atendimento médico preventivo e curativo" },
        { icon: Baby, name: "Pediatria", description: "Cuidado especializado para crianças e adolescentes" },
        { icon: Brain, name: "Neurologia", description: "Tratamento de distúrbios neurológicos" },
        { icon: Bone, name: "Ortopedia", description: "Especialidade em sistema musculoesquelético" },
        { icon: Eye, name: "Oftalmologia", description: "Diagnóstico e tratamento de problemas oculares" },
    ]

    return (
        <div className="min-h-screen bg-white">
            {/* Header institucional */}
            <header className="bg-navy-deep text-white">
                <div className="container mx-auto px-4">
                    {/* Top bar */}
                    <div className="h-10 flex items-center justify-between text-xs border-b border-white/10">
                        <div className="flex items-center gap-6">
                            <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" /> {clinic.phone}
                            </span>
                            <span className="hidden sm:flex items-center gap-1">
                                <Mail className="w-3 h-3" /> {clinic.email}
                            </span>
                        </div>
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {clinic.hours}
                        </span>
                    </div>
                    {/* Main nav */}
                    <div className="h-16 flex items-center justify-between">
                        <span className="text-xl font-bold">{clinic.name}</span>
                        <nav className="hidden md:flex items-center gap-6">
                            <a href="#servicos" className="text-sm text-white/80 hover:text-white">Serviços</a>
                            <a href="#sobre" className="text-sm text-white/80 hover:text-white">Sobre Nós</a>
                            <a href="#contato" className="text-sm text-white/80 hover:text-white">Contato</a>
                            <Link href="#agendar" className="h-9 px-4 bg-teal-vibrant text-white rounded text-sm font-medium">
                                Agendar Consulta
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero com background navy */}
            <section className="bg-navy-deep text-white py-20">
                <div className="container mx-auto px-4">
                    <div className="max-w-2xl">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                            {clinic.tagline}
                        </h1>
                        <p className="text-lg text-white/70 mb-8">
                            {clinic.description}
                        </p>
                        <div className="flex gap-3">
                            <Link href="#agendar" className="h-12 px-6 bg-teal-vibrant text-white rounded font-medium flex items-center gap-2">
                                Agendar Consulta <ChevronRight className="w-4 h-4" />
                            </Link>
                            <a href={`tel:${clinic.phone}`} className="h-12 px-6 border border-white/30 text-white rounded font-medium flex items-center gap-2">
                                <Phone className="w-4 h-4" /> Ligar Agora
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Serviços - Lista vertical com separadores */}
            <section id="servicos" className="py-16">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-12">
                        <p className="text-sm text-teal-vibrant font-semibold mb-2">NOSSAS ESPECIALIDADES</p>
                        <h2 className="text-3xl font-bold text-gray-900">Serviços Médicos</h2>
                    </div>
                    <div className="max-w-4xl mx-auto divide-y divide-gray-100">
                        {services.map((service, index) => (
                            <div key={index} className="py-6 flex items-center gap-6">
                                <div className="w-14 h-14 bg-navy-deep/5 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <service.icon className="w-6 h-6 text-navy-deep" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 mb-1">{service.name}</h3>
                                    <p className="text-sm text-gray-600">{service.description}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-300" />
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Sobre */}
            <section id="sobre" className="py-16 bg-gray-50">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
                        <div className="bg-gray-200 rounded h-80 flex items-center justify-center">
                            <span className="text-gray-400">Foto Equipe</span>
                        </div>
                        <div>
                            <p className="text-sm text-teal-vibrant font-semibold mb-2">SOBRE NÓS</p>
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nossa Clínica</h2>
                            <p className="text-gray-600 mb-4">
                                Com mais de duas décadas de experiência, nossa clínica se consolidou como
                                referência em atendimento médico de qualidade na região.
                            </p>
                            <p className="text-gray-600">
                                Contamos com profissionais altamente qualificados e equipamentos de última
                                geração para oferecer o melhor diagnóstico e tratamento.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contato */}
            <section id="contato" className="py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-12">
                            <p className="text-sm text-teal-vibrant font-semibold mb-2">CONTATO</p>
                            <h2 className="text-3xl font-bold text-gray-900">Entre em Contato</h2>
                        </div>
                        <div className="grid md:grid-cols-4 gap-6 text-center">
                            <div className="p-6 bg-gray-50 rounded-lg">
                                <MapPin className="w-6 h-6 text-teal-vibrant mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-900 mb-1">Endereço</p>
                                <p className="text-xs text-gray-600">{clinic.address}</p>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-lg">
                                <Phone className="w-6 h-6 text-teal-vibrant mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-900 mb-1">Telefone</p>
                                <p className="text-xs text-gray-600">{clinic.phone}</p>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-lg">
                                <Mail className="w-6 h-6 text-teal-vibrant mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-900 mb-1">E-mail</p>
                                <p className="text-xs text-gray-600">{clinic.email}</p>
                            </div>
                            <div className="p-6 bg-gray-50 rounded-lg">
                                <Clock className="w-6 h-6 text-teal-vibrant mx-auto mb-3" />
                                <p className="text-sm font-medium text-gray-900 mb-1">Horário</p>
                                <p className="text-xs text-gray-600">{clinic.hours}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer institucional */}
            <footer className="bg-navy-deep text-white py-12">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        <span className="text-xl font-bold">{clinic.name}</span>
                        <p className="text-sm text-white/60">© 2024 Todos os direitos reservados</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
