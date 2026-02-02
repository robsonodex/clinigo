'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateProps } from '../index'
import { mergeWithDefaultTheme } from '@/types/clinic-theme'
import './swiss-minimal.css'

export function SwissMinimalTemplate({
    clinic,
    doctors,
    specialties,
    stats,
    onSearch,
    onBook,
    onTeleconsulta
}: TemplateProps) {
    const router = useRouter()

    // Merge theme with defaults to get all values
    const theme = mergeWithDefaultTheme(clinic.theme || {})
    const content = theme.content
    const hero = theme.hero

    const handleBook = () => {
        onBook()
    }

    return (
        <div className="swiss-template">
            {/* Header */}
            <header className="swiss-header">
                <nav className="swiss-nav">
                    <div className="swiss-logo">{clinic.name}</div>
                    <ul className="swiss-nav-links">
                        <li><a href="#inicio">Início</a></li>
                        <li><a href="#especialidades">Especialidades</a></li>
                        <li><a href="#medicos">Médicos</a></li>
                        <li><a href="#sobre">Sobre</a></li>
                        <li><a href="#contato">Contato</a></li>
                    </ul>
                    <button onClick={handleBook} className="swiss-btn swiss-btn-dark">
                        {hero.cta_text || 'Agendar Consulta'}
                    </button>
                </nav>
            </header>

            {/* Hero Section */}
            <section id="inicio" className="swiss-hero">
                <div className="swiss-hero-left">
                    <span className="swiss-hero-tag">{content.hero_tag || 'Saúde Digital'}</span>
                    <h1>{hero.title || 'Medicina do'}<br />{hero.title ? '' : 'futuro, hoje.'}</h1>
                    <p>{hero.subtitle || clinic.tagline || 'Conectamos você aos melhores especialistas. Agendamento simples, atendimento humanizado, tecnologia de ponta.'}</p>
                    <div className="swiss-hero-cta">
                        <button onClick={handleBook} className="swiss-btn swiss-btn-dark">
                            {hero.cta_text || 'Agendar Consulta'}
                        </button>
                        <a href="#especialidades" className="swiss-btn swiss-btn-outline">
                            Ver Especialidades
                        </a>
                    </div>
                    <div className="swiss-stats-row">
                        <div className="swiss-stat-item">
                            <div className="swiss-stat-value">{stats.total_doctors}+</div>
                            <div className="swiss-stat-label">{content.stat1_label || 'Médicos Parceiros'}</div>
                        </div>
                        <div className="swiss-stat-item">
                            <div className="swiss-stat-value">{specialties.length}</div>
                            <div className="swiss-stat-label">{content.stat2_label || 'Especialidades'}</div>
                        </div>
                        <div className="swiss-stat-item">
                            <div className="swiss-stat-value">98%</div>
                            <div className="swiss-stat-label">{content.stat3_label || 'Satisfação'}</div>
                        </div>
                    </div>
                </div>
                <div className="swiss-hero-right">
                    <div className="swiss-feature-grid">
                        <div className="swiss-feature-card" onClick={() => router.push(`/${clinic.slug}/agendar`)}>
                            <div className="swiss-feature-number">01</div>
                            <div className="swiss-feature-icon">🩺</div>
                            <h3>{content.feature1_title || 'Consultas Presenciais'}</h3>
                            <p>{content.feature1_description || 'Atendimento tradicional com os melhores profissionais'}</p>
                        </div>
                        <div className="swiss-feature-card" onClick={onTeleconsulta}>
                            <div className="swiss-feature-number">02</div>
                            <div className="swiss-feature-icon">💻</div>
                            <h3>{content.feature2_title || 'Teleconsulta 24h'}</h3>
                            <p>{content.feature2_description || 'Atendimento online de qualquer lugar'}</p>
                        </div>
                        <div className="swiss-feature-card" onClick={() => router.push(`/${clinic.slug}/agendar`)}>
                            <div className="swiss-feature-number">03</div>
                            <div className="swiss-feature-icon">📋</div>
                            <h3>{content.feature3_title || 'Prontuário Digital'}</h3>
                            <p>{content.feature3_description || 'Seu histórico médico sempre acessível'}</p>
                        </div>
                        <div className="swiss-feature-card" onClick={() => router.push(`/${clinic.slug}/agendar`)}>
                            <div className="swiss-feature-number">04</div>
                            <div className="swiss-feature-icon">🔔</div>
                            <h3>{content.feature4_title || 'Lembretes Inteligentes'}</h3>
                            <p>{content.feature4_description || 'Nunca perca uma consulta importante'}</p>
                        </div>
                    </div>
                    <div className="swiss-vertical-text">Saúde • Tecnologia • Confiança</div>
                </div>
            </section>

            {/* Footer */}
            <footer className="swiss-footer">
                <div className="swiss-footer-content">
                    <div className="swiss-footer-brand">
                        <div className="swiss-logo">{clinic.name}</div>
                        <p>{clinic.address}</p>
                        {clinic.phone && <p>{clinic.phone}</p>}
                    </div>
                    <div className="swiss-footer-links">
                        <a href="#inicio">Início</a>
                        <a href="#especialidades">Especialidades</a>
                        <a href="#medicos">Médicos</a>
                        <a href="#contato">Contato</a>
                    </div>
                    <div className="swiss-footer-cta">
                        <button onClick={handleBook} className="swiss-btn swiss-btn-dark">
                            {hero.cta_text || 'Agendar Consulta'}
                        </button>
                    </div>
                </div>
                <div className="swiss-footer-bottom">
                    <p>© {new Date().getFullYear()} {clinic.name}. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    )
}

