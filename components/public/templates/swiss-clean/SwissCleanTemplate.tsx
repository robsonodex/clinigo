'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateProps } from '../index'
import { mergeWithDefaultTheme } from '@/types/clinic-theme'
import './swiss-clean.css'

/**
 * Template 4: Swiss Clean
 * Design suíço com grid rigoroso, tipografia pesada, serviços numerados
 * Simples, limpo, estilo clínico/documental - sem animações
 */
export function SwissCleanTemplate({
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
        <div className="swiss-template">
            {/* Header Minimal */}
            <header className="swiss-header">
                <div className="swiss-header-container">
                    <div className="swiss-logo">
                        {clinic.logo_url ? (
                            <img src={clinic.logo_url} alt={clinic.name} />
                        ) : (
                            <span>{clinic.name}</span>
                        )}
                    </div>
                    <div className="swiss-header-right">
                        {clinic.phone && (
                            <a href={`tel:${clinic.phone}`} className="swiss-phone">{clinic.phone}</a>
                        )}
                        <button onClick={handleBook} className="swiss-btn swiss-btn-primary">
                            {hero.cta_text || 'AGENDAR'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero - Bold Typography */}
            <section className="swiss-hero">
                <div className="swiss-hero-container">
                    <div className="swiss-hero-main">
                        {content.hero_tag && (
                            <span className="swiss-hero-tag">{content.hero_tag}</span>
                        )}
                        <h1>{hero.title || clinic.tagline || 'SAÚDE'}</h1>
                        <p>{hero.subtitle || clinic.about || 'Cuidamos de você e sua família com excelência e profissionalismo.'}</p>
                    </div>
                    <div className="swiss-hero-actions">
                        <button onClick={handleBook} className="swiss-btn swiss-btn-primary swiss-btn-large">
                            {hero.cta_text || 'AGENDAR CONSULTA'}
                        </button>
                        <button onClick={onTeleconsulta} className="swiss-btn swiss-btn-outline swiss-btn-large">
                            TELECONSULTA
                        </button>
                    </div>
                </div>
            </section>

            {/* Stats Bar */}
            <section className="swiss-stats">
                <div className="swiss-stats-container">
                    <div className="swiss-stat-item">
                        <span className="swiss-stat-number">{stats.total_doctors}</span>
                        <span className="swiss-stat-label">{content.stat1_label || 'MÉDICOS'}</span>
                    </div>
                    <div className="swiss-stat-divider" />
                    <div className="swiss-stat-item">
                        <span className="swiss-stat-number">{specialties.length}</span>
                        <span className="swiss-stat-label">{content.stat2_label || 'ESPECIALIDADES'}</span>
                    </div>
                    <div className="swiss-stat-divider" />
                    <div className="swiss-stat-item">
                        <span className="swiss-stat-number">{stats.average_rating > 0 ? stats.average_rating.toFixed(1) : '4.9'}</span>
                        <span className="swiss-stat-label">{content.stat3_label || 'AVALIAÇÃO'}</span>
                    </div>
                </div>
            </section>

            {/* Search */}
            <section className="swiss-search-section">
                <form onSubmit={handleSearchSubmit} className="swiss-search">
                    <span className="swiss-search-label">BUSCAR</span>
                    <input
                        type="text"
                        placeholder="Especialidade ou médico..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit">→</button>
                </form>
            </section>

            {/* Especialidades - Numbered List */}
            {display.show_specialties_grid && (
                <section className="swiss-section">
                    <div className="swiss-section-container">
                        <div className="swiss-section-header">
                            <span className="swiss-section-tag">01</span>
                            <h2>{content.specialties_title || 'ESPECIALIDADES'}</h2>
                        </div>
                        <p className="swiss-section-intro">{content.specialties_subtitle || 'Atendimento completo em diversas áreas'}</p>
                        <div className="swiss-services-grid">
                            {specialties.map((specialty, index) => (
                                <div
                                    key={specialty.slug}
                                    className="swiss-service-card"
                                    onClick={() => router.push(`/${clinic.slug}/agendar?especialidade=${specialty.slug}`)}
                                >
                                    <span className="swiss-service-number">{String(index + 1).padStart(2, '0')}</span>
                                    <h3>{specialty.name}</h3>
                                    <p>{specialty.doctorCount} profissional{specialty.doctorCount !== 1 ? 'is' : ''}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Equipe */}
            <section className="swiss-section swiss-section-dark">
                <div className="swiss-section-container">
                    <div className="swiss-section-header swiss-section-header-light">
                        <span className="swiss-section-tag">02</span>
                        <h2>{content.doctors_title || 'EQUIPE'}</h2>
                    </div>
                    <p className="swiss-section-intro swiss-section-intro-light">{content.doctors_subtitle || 'Profissionais qualificados'}</p>
                    <div className="swiss-doctors-grid">
                        {doctors.map((doctor) => (
                            <div
                                key={doctor.id}
                                className="swiss-doctor-card"
                                onClick={() => onBook(doctor.id)}
                            >
                                <div className="swiss-doctor-photo">
                                    {display.show_doctor_photos && doctor.photo_url ? (
                                        <img src={doctor.photo_url} alt={doctor.full_name} />
                                    ) : (
                                        <span>{doctor.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
                                    )}
                                </div>
                                <div className="swiss-doctor-info">
                                    <h3>{doctor.full_name}</h3>
                                    <p className="swiss-doctor-specialty">{doctor.specialty}</p>
                                    <p className="swiss-doctor-crm">CRM {doctor.crm}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="swiss-section-cta">
                        <button onClick={handleBook} className="swiss-btn swiss-btn-accent swiss-btn-large">
                            VER TODOS
                        </button>
                    </div>
                </div>
            </section>

            {/* Sobre */}
            <section className="swiss-section">
                <div className="swiss-section-container">
                    <div className="swiss-section-header">
                        <span className="swiss-section-tag">03</span>
                        <h2>{content.about_title || 'SOBRE'}</h2>
                    </div>
                    <div className="swiss-about">
                        <p>{clinic.about || `A ${clinic.name} oferece atendimento de excelência com profissionais altamente qualificados e infraestrutura moderna.`}</p>
                        <div className="swiss-features">
                            <div className="swiss-feature">
                                <span>01</span>
                                <p>{content.feature1_title || 'Atendimento Humanizado'}</p>
                            </div>
                            <div className="swiss-feature">
                                <span>02</span>
                                <p>{content.feature2_title || 'Equipamentos Modernos'}</p>
                            </div>
                            <div className="swiss-feature">
                                <span>03</span>
                                <p>{content.feature3_title || 'Agendamento Online'}</p>
                            </div>
                            <div className="swiss-feature">
                                <span>04</span>
                                <p>{content.feature4_title || 'Teleconsulta'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contato */}
            <section className="swiss-section swiss-section-accent">
                <div className="swiss-section-container">
                    <div className="swiss-contact">
                        <div className="swiss-contact-info">
                            <div className="swiss-section-header swiss-section-header-light">
                                <span className="swiss-section-tag">04</span>
                                <h2>{content.contact_title || 'CONTATO'}</h2>
                            </div>
                            <p>{content.contact_subtitle || 'Entre em contato conosco'}</p>
                            <div className="swiss-contact-details">
                                {clinic.address && <p>📍 {clinic.address}</p>}
                                {clinic.phone && <p>📞 {clinic.phone}</p>}
                                {clinic.email && <p>✉️ {clinic.email}</p>}
                            </div>
                        </div>
                        <div className="swiss-contact-cta">
                            <button onClick={handleBook} className="swiss-btn swiss-btn-white swiss-btn-large">
                                {hero.cta_text || 'AGENDAR CONSULTA'}
                            </button>
                            {clinic.whatsapp_number && (
                                <a
                                    href={`https://wa.me/${clinic.whatsapp_number.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="swiss-btn swiss-btn-outline-light swiss-btn-large"
                                >
                                    WHATSAPP
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="swiss-footer">
                <div className="swiss-footer-container">
                    <div className="swiss-footer-brand">
                        {clinic.logo_url ? (
                            <img src={clinic.logo_url} alt={clinic.name} />
                        ) : (
                            <span>{clinic.name}</span>
                        )}
                    </div>
                    <div className="swiss-footer-links">
                        {clinic.instagram && <a href={clinic.instagram} target="_blank">IG</a>}
                        {clinic.facebook && <a href={clinic.facebook} target="_blank">FB</a>}
                        {clinic.linkedin && <a href={clinic.linkedin} target="_blank">LI</a>}
                    </div>
                    <p className="swiss-footer-copy">© {new Date().getFullYear()}</p>
                </div>
            </footer>
        </div>
    )
}
