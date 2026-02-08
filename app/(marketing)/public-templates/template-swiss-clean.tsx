"use client"

import Link from 'next/link'
import { Phone, Mail, MapPin, Clock, ArrowRight } from 'lucide-react'

// Template 4: Swiss Clean - Inspirado no design suíço: grid rigoroso, tipografia pesada
export default function TemplateSwissClean() {
    const clinic = {
        name: "Clínica Exemplo",
        tagline: "Medicina com precisão",
        phone: "(11) 3000-0000",
        email: "contato@clinicaexemplo.com.br",
        address: "Av. Paulista, 1000 - São Paulo, SP",
        hours: "Seg-Sex: 8h-18h"
    }

    const services = [
        { num: "01", name: "Cardiologia" },
        { num: "02", name: "Clínica Geral" },
        { num: "03", name: "Pediatria" },
        { num: "04", name: "Neurologia" },
        { num: "05", name: "Ortopedia" },
        { num: "06", name: "Oftalmologia" },
    ]

    return (
        <div className="min-h-screen bg-white">
            {/* Header - linha única */}
            <header className="border-b border-black">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <span className="text-sm font-bold uppercase tracking-widest">{clinic.name}</span>
                    <nav className="hidden md:flex items-center gap-8">
                        <a href="#servicos" className="text-xs uppercase tracking-wide text-gray-600 hover:text-black">Serviços</a>
                        <a href="#contato" className="text-xs uppercase tracking-wide text-gray-600 hover:text-black">Contato</a>
                    </nav>
                    <Link href="#agendar" className="h-9 px-4 bg-black text-white text-xs uppercase tracking-wide font-medium flex items-center gap-2">
                        Agendar <ArrowRight className="w-3 h-3" />
                    </Link>
                </div>
            </header>

            {/* Hero - Tipografia extra bold */}
            <section className="py-32 border-b border-black">
                <div className="container mx-auto px-6">
                    <h1 className="text-7xl md:text-8xl lg:text-[10rem] font-black text-black leading-none tracking-tighter mb-8">
                        {clinic.tagline}
                    </h1>
                    <div className="w-full h-px bg-black mb-8" />
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <p className="text-lg text-gray-600 max-w-md">
                            Atendimento médico de excelência com profissionais especializados e tecnologia de ponta.
                        </p>
                        <Link href="#agendar" className="h-14 px-8 bg-black text-white text-sm uppercase tracking-wide font-medium flex items-center gap-3">
                            Agendar Consulta <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Serviços - Grid numerado */}
            <section id="servicos" className="py-20 border-b border-black">
                <div className="container mx-auto px-6">
                    <div className="flex items-center gap-4 mb-16">
                        <span className="text-xs uppercase tracking-widest text-gray-500">Especialidades</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-black">
                        {services.map((service) => (
                            <div key={service.num} className="bg-white p-8 hover:bg-gray-50">
                                <span className="text-xs text-teal-vibrant font-mono mb-4 block">{service.num}</span>
                                <h3 className="text-2xl font-bold text-black">{service.name}</h3>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contato - Grid preciso */}
            <section id="contato" className="py-20">
                <div className="container mx-auto px-6">
                    <div className="flex items-center gap-4 mb-16">
                        <span className="text-xs uppercase tracking-widest text-gray-500">Contato</span>
                        <div className="flex-1 h-px bg-gray-200" />
                    </div>
                    <div className="grid md:grid-cols-2 gap-16">
                        <div className="space-y-8">
                            <div>
                                <span className="text-xs uppercase tracking-widest text-gray-500 block mb-2">Endereço</span>
                                <p className="text-xl font-medium text-black">{clinic.address}</p>
                            </div>
                            <div>
                                <span className="text-xs uppercase tracking-widest text-gray-500 block mb-2">Telefone</span>
                                <p className="text-xl font-medium text-black">{clinic.phone}</p>
                            </div>
                            <div>
                                <span className="text-xs uppercase tracking-widest text-gray-500 block mb-2">E-mail</span>
                                <p className="text-xl font-medium text-black">{clinic.email}</p>
                            </div>
                            <div>
                                <span className="text-xs uppercase tracking-widest text-gray-500 block mb-2">Horário</span>
                                <p className="text-xl font-medium text-black">{clinic.hours}</p>
                            </div>
                        </div>
                        <div className="bg-gray-100 h-80 flex items-center justify-center">
                            <span className="text-gray-400 text-xs uppercase tracking-widest">Mapa</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer - Mínimo */}
            <footer className="border-t border-black py-6">
                <div className="container mx-auto px-6 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-gray-500">© 2024 {clinic.name}</span>
                    <span className="text-xs uppercase tracking-widest text-gray-500">{clinic.phone}</span>
                </div>
            </footer>
        </div>
    )
}
