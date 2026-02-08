'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateProps } from '../index'
import { mergeWithDefaultTheme } from '@/types/clinic-theme'
import './aurora-neon.css'

export function AuroraNeonTemplate({
    clinic,
    doctors,
    specialties,
    stats,
    onSearch,
    onBook,
    onTeleconsulta
}: TemplateProps) {
    const router = useRouter()
    const [searchTerm, setSearchTerm] = useState('')

    // Merge theme with defaults to get all values
    const theme = mergeWithDefaultTheme(clinic.theme || {})
    const content = theme.content
    const hero = theme.hero
    const display = theme.display

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchTerm.trim()) {
            onSearch(searchTerm)
        }
    }

    const handleBook = () => {
        onBook()
    }

    return (
        <div className="aurora-template">
            {/* Aurora Background */}
            <div className="aurora-bg">
                <div className="aurora-gradient" />
            </div>

            {/* Header */}
            <header className="aurora-header">
                <nav className="aurora-nav">
                    <div className="aurora-logo">{clinic.name}</div>
                    <ul className="aurora-nav-links">
                        <li><a href="#inicio">Início</a></li>
                        <li><a href="#especialidades">Especialidades</a></li>
                        <li><a href="#medicos">Médicos</a></li>
                        <li><a href="#teleconsulta">Teleconsulta</a></li>
                        <li><a href="#contato">Contato</a></li>
                    </ul>
                    <div className="aurora-nav-right">
                        <button onClick={onTeleconsulta} className="aurora-btn aurora-btn-glass">
                            Entrar
                        </button>
                        <button onClick={handleBook} className="aurora-btn aurora-btn-gradient">
                            Agendar Consulta
                        </button>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section id="inicio" className="aurora-hero">
                <div className="aurora-hero-container">
                    <div className="aurora-hero-badge">
                        <div className="aurora-badge-glow" />
                        <span>Teleconsulta disponível 24 horas</span>
                    </div>
                    <h1>O futuro da <span className="aurora-highlight">saúde</span> chegou</h1>
                    <p>{clinic.tagline || 'Tecnologia de ponta encontra cuidado humanizado. Conecte-se com especialistas de qualquer lugar, a qualquer hora.'}</p>
                    <div className="aurora-hero-buttons">
                        <button onClick={handleBook} className="aurora-btn aurora-btn-gradient aurora-btn-large">
                            Começar Agora
                        </button>
                        <a href="#especialidades" className="aurora-btn aurora-btn-glass aurora-btn-large">
                            Ver Especialidades
                        </a>
                    </div>

                    <div className="aurora-cards-row">
                        <div className="aurora-feature-card" onClick={() => router.push(`/${clinic.slug}/agendar`)}>
                            <div className="aurora-feature-icon aurora-icon-cyan">🩺</div>
                            <h3>{stats.total_doctors}+ Médicos</h3>
                            <p>Especialistas verificados prontos para atender</p>
                        </div>
                        <div className="aurora-feature-card" onClick={onTeleconsulta}>
                            <div className="aurora-feature-icon aurora-icon-purple">💻</div>
                            <h3>Teleconsulta HD</h3>
                            <p>Atendimento online com qualidade premium</p>
                        </div>
                        <div className="aurora-feature-card">
                            <div className="aurora-feature-icon aurora-icon-pink">🔒</div>
                            <h3>100% Seguro</h3>
                            <p>Seus dados protegidos com criptografia</p>
                        </div>
                        <div className="aurora-feature-card" onClick={() => router.push(`/${clinic.slug}/agendar`)}>
                            <div className="aurora-feature-icon aurora-icon-green">⚡</div>
                            <h3>Agendamento Rápido</h3>
                            <p>Marque consultas em menos de 1 minuto</p>
                        </div>
                    </div>

                    <div className="aurora-stats-bar">
                        <div className="aurora-stat-item">
                            <div className="aurora-stat-value">{specialties.length}+</div>
                            <div className="aurora-stat-label">Especialidades</div>
                        </div>
                        <div className="aurora-stat-item">
                            <div className="aurora-stat-value">10k+</div>
                            <div className="aurora-stat-label">Consultas/mês</div>
                        </div>
                        <div className="aurora-stat-item">
                            <div className="aurora-stat-value">98%</div>
                            <div className="aurora-stat-label">Satisfação</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="aurora-footer">
                <div className="aurora-footer-content">
                    <div className="aurora-footer-brand">
                        <div className="aurora-logo">{clinic.name}</div>
                        <p>{clinic.address}</p>
                        {clinic.phone && <p>📞 {clinic.phone}</p>}
                    </div>
                    <div className="aurora-footer-links">
                        <a href="#inicio">Início</a>
                        <a href="#especialidades">Especialidades</a>
                        <a href="#medicos">Médicos</a>
                        <a href="#contato">Contato</a>
                    </div>
                    <div className="aurora-footer-cta">
                        <button onClick={handleBook} className="aurora-btn aurora-btn-gradient">
                            Agendar Consulta
                        </button>
                    </div>
                </div>
                <div className="aurora-footer-bottom">
                    <p>© {new Date().getFullYear()} {clinic.name}. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    )
}
