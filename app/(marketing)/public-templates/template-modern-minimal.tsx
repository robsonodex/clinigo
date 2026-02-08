"use client"

import Link from 'next/link'
import { Phone, Mail, MapPin, Clock, ArrowRight, Heart, Stethoscope, Baby, Brain, Bone, Eye } from 'lucide-react'

// Template 2: Modern Minimal - Muito espaço em branco, tipografia grande
export default function TemplateModernMinimal() {
    const clinic = {
        name: "Clínica Exemplo",
        tagline: "Medicina moderna com cuidado humano",
        description: "Atendimento médico personalizado em um ambiente projetado para o seu conforto e bem-estar.",
        phone: "(11) 3000-0000",
        email: "contato@clinicaexemplo.com.br",
        address: "Av. Paulista, 1000 - Bela Vista, São Paulo - SP",
        hours: "Segunda a Sexta: 8h às 18h"
    }

    const services = [
        { icon: Heart, name: "Cardiologia" },
        { icon: Stethoscope, name: "Clínica Geral" },
        { icon: Baby, name: "Pediatria" },
        { icon: Brain, name: "Neurologia" },
        { icon: Bone, name: "Ortopedia" },
        { icon: Eye, name: "Oftalmologia" },
    ]

    return (
        <div className="min-h-screen bg-white">
            {/* Header minimal */}
            <header className="absolute top-0 left-0 right-0 z-50">
                <div className="container mx-auto px-6 py-6 flex items-center justify-between">
                    <span className="text-lg font-medium text-gray-900">{clinic.name}</span>
                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#servicos" className="text-sm text-gray-500 hover:text-gray-900">Serviços</a>
                        <a href="#contato" className="text-sm text-gray-500 hover:text-gray-900">Contato</a>
                        <Link href="#agendar" className="text-sm text-teal-vibrant font-medium flex items-center gap-1">
                            Agendar <ArrowRight className="w-4 h-4" />
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero - Split lateral */}
            <section className="min-h-screen flex items-center">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="pt-20 lg:pt-0">
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-light text-gray-900 leading-tight mb-6">
                                {clinic.tagline}
                            </h1>
                            <p className="text-xl text-gray-500 mb-10 max-w-md">
                                {clinic.description}
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="#agendar" className="h-14 px-8 bg-gray-900 text-white rounded-sm font-medium flex items-center justify-center gap-2">
                                    Agendar Consulta <ArrowRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>
                        <div className="hidden lg:block">
                            <div className="bg-gray-100 rounded-sm h-[500px] flex items-center justify-center">
                                <span className="text-gray-400">Imagem</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Serviços - Cards minimalistas */}
            <section id="servicos" className="py-24 bg-gray-50">
                <div className="container mx-auto px-6">
                    <div className="max-w-xl mb-16">
                        <p className="text-sm text-teal-vibrant font-medium mb-3">ESPECIALIDADES</p>
                        <h2 className="text-4xl font-light text-gray-900">Nossos serviços médicos</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                        {services.map((service, index) => (
                            <div key={index} className="p-6 bg-white border border-gray-100 hover:border-gray-200">
                                <service.icon className="w-6 h-6 text-gray-400 mb-4" />
                                <h3 className="text-sm font-medium text-gray-900">{service.name}</h3>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Seção de contato */}
            <section id="contato" className="py-24">
                <div className="container mx-auto px-6">
                    <div className="grid lg:grid-cols-2 gap-16">
                        <div>
                            <p className="text-sm text-teal-vibrant font-medium mb-3">CONTATO</p>
                            <h2 className="text-4xl font-light text-gray-900 mb-8">Venha nos visitar</h2>
                            <div className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center">
                                        <MapPin className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Endereço</p>
                                        <p className="text-gray-900">{clinic.address}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center">
                                        <Phone className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Telefone</p>
                                        <p className="text-gray-900">{clinic.phone}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center">
                                        <Mail className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">E-mail</p>
                                        <p className="text-gray-900">{clinic.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded flex items-center justify-center">
                                        <Clock className="w-5 h-5 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Horário</p>
                                        <p className="text-gray-900">{clinic.hours}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-100 rounded-sm h-80 flex items-center justify-center">
                            <span className="text-gray-400">Mapa</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer minimal */}
            <footer className="py-8 border-t border-gray-100">
                <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm text-gray-400">© 2024 {clinic.name}</p>
                    <p className="text-sm text-gray-400">{clinic.phone}</p>
                </div>
            </footer>
        </div>
    )
}
