'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateProps } from '../index'
import { mergeWithDefaultTheme } from '@/types/clinic-theme'
import './modern-minimal.css'

/**
 * Template 2: Modern Minimal
 * Muito espaço em branco, tipografia grande, layout split lateral
 * Simples, limpo, estilo clínico/documental - sem animações
 */
export function ModernMinimalTemplate({
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
        <div className="modern-template">
            {/* Header Minimal */}
            <header className="modern-header">
                <div className="modern-header-container">
                    <div className="modern-logo">
                        {clinic.logo_url ? (
                            <img src={clinic.logo_url} alt={clinic.name} />
                        ) : (
                            <span>{clinic.name}</span>
                        )}
                    </div>
                    <nav className="modern-nav">
                        <a href="#servicos">Serviços</a>
                        <a href="#equipe">Equipe</a>
                        <a href="#contato">Contato</a>
                    </nav>
                    <button onClick={handleBook} className="modern-btn modern-btn-primary">
                        {hero.cta_text || 'Agendar'}
                    </button>
                </div>
            </header>

            {/* Hero - Split Layout */}
            <section className="modern-hero">
                <div className="modern-hero-container">
                    <div className="modern-hero-text">
                        {content.hero_tag && (
                            <span className="modern-hero-tag">{content.hero_tag}</span>
                        )}
                        <h1>{hero.title || clinic.tagline || 'Saúde com excelência'}</h1>
                        <p>{hero.subtitle || clinic.about || 'Cuidamos de você com dedicação e profissionalismo. Agende sua consulta hoje.'}</p>
                        <div className="modern-hero-actions">
                            <button onClick={handleBook} className="modern-btn modern-btn-primary modern-btn-large">
                                {hero.cta_text || 'Agendar Consulta'}
                            </button>
                            {clinic.phone && (
                                <a href={`tel:${clinic.phone}`} className="modern-hero-phone">
                                    {clinic.phone}
                                </a>
                            )}
                        </div>
                    </div>
                    <div className="modern-hero-visual">
                        <div className="modern-hero-stats">
                            <div className="modern-stat-item">
                                <span className="modern-stat-number">{stats.total_doctors}</span>
                                <span className="modern-stat-text">{content.stat1_label || 'Médicos'}</span>
                            </div>
                            <div className="modern-stat-item">
                                <span className="modern-stat-number">{specialties.length}</span>
                                <span className="modern-stat-text">{content.stat2_label || 'Especialidades'}</span>
                            </div>
                            <div className="modern-stat-item">
                                <span className="modern-stat-number">{stats.average_rating > 0 ? stats.average_rating.toFixed(1) : '4.9'}</span>
                                <span className="modern-stat-text">{content.stat3_label || 'Avaliação'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Search */}
            <section className="modern-search-section">
                <form onSubmit={handleSearchSubmit} className="modern-search-form">
                    <input
                        type="text"
                        placeholder="Buscar especialidade ou médico..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit">→</button>
                </form>
            </section>

            {/* Especialidades */}
            {display.show_specialties_grid && (
                <section id="servicos" className="modern-section">
                    <div className="modern-section-header">
                        <h2>{content.specialties_title || 'Especialidades'}</h2>
                        <p>{content.specialties_subtitle || 'Atendimento em diversas áreas'}</p>
                    </div>
                    <div className="modern-services-list">
                        {specialties.map((specialty, index) => (
                            <div
                                key={specialty.slug}
                                className="modern-service-item"
                                onClick={() => router.push(`/${clinic.slug}/agendar?especialidade=${specialty.slug}`)}
                            >
                                <span className="modern-service-number">{String(index + 1).padStart(2, '0')}</span>
                                <div className="modern-service-content">
                                    <h3>{specialty.name}</h3>
                                    <p>{specialty.doctorCount} profissional{specialty.doctorCount !== 1 ? 'is' : ''}</p>
                                </div>
                                <span className="modern-service-arrow">→</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Equipe */}
            <section id="equipe" className="modern-section modern-section-alt">
                <div className="modern-section-header">
                    <h2>{content.doctors_title || 'Nossa Equipe'}</h2>
                    <p>{content.doctors_subtitle || 'Profissionais dedicados'}</p>
                </div>
                <div className="modern-doctors-grid">
                    {doctors.map((doctor) => (
                        <div
                            key={doctor.id}
                            className="modern-doctor-card"
                            onClick={() => onBook(doctor.id)}
                        >
                            <div className="modern-doctor-avatar">
                                {display.show_doctor_photos && doctor.photo_url ? (
                                    <img src={doctor.photo_url} alt={doctor.full_name} />
                                ) : (
                                    <span>{doctor.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
                                )}
                            </div>
                            <div className="modern-doctor-info">
                                <h3>{doctor.full_name}</h3>
                                <p className="modern-doctor-specialty">{doctor.specialty}</p>
                                <p className="modern-doctor-crm">CRM {doctor.crm}</p>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="modern-section-cta">
                    <button onClick={handleBook} className="modern-btn modern-btn-outline">
                        Ver todos →
                    </button>
                </div>
            </section>

            {/* Sobre */}
            <section className="modern-section">
                <div className="modern-about">
                    <div className="modern-about-content">
                        <h2>{content.about_title || `Sobre`}</h2>
                        <p>{clinic.about || `A ${clinic.name} oferece atendimento de excelência com profissionais altamente qualificados.`}</p>
                        <ul className="modern-features">
                            <li>{content.feature1_title || 'Atendimento Humanizado'}</li>
                            <li>{content.feature2_title || 'Equipamentos Modernos'}</li>
                            <li>{content.feature3_title || 'Agendamento Online'}</li>
                            <li>{content.feature4_title || 'Teleconsulta'}</li>
                        </ul>
                    </div>
                </div>
            </section>

            {/* Contato */}
            <section id="contato" className="modern-section modern-section-dark">
                <div className="modern-contact">
                    <div className="modern-contact-info">
                        <h2>{content.contact_title || 'Contato'}</h2>
                        <p>{content.contact_subtitle || 'Entre em contato conosco'}</p>
                        <div className="modern-contact-details">
                            {clinic.address && <p>📍 {clinic.address}</p>}
                            {clinic.phone && <p>📞 {clinic.phone}</p>}
                            {clinic.email && <p>✉️ {clinic.email}</p>}
                        </div>
                    </div>
                    <div className="modern-contact-cta">
                        <button onClick={handleBook} className="modern-btn modern-btn-white modern-btn-large">
                            {hero.cta_text || 'Agendar Consulta'}
                        </button>
                        {clinic.whatsapp_number && (
                            <a
                                href={`https://wa.me/${clinic.whatsapp_number.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="modern-btn modern-btn-outline-white modern-btn-large"
                            >
                                WhatsApp
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="modern-footer">
                <div className="modern-footer-container">
                    <div className="modern-footer-brand">
                        {clinic.logo_url ? (
                            <img src={clinic.logo_url} alt={clinic.name} />
                        ) : (
                            <span>{clinic.name}</span>
                        )}
                    </div>
                    <div className="modern-footer-links">
                        <a href="#servicos">Serviços</a>
                        <a href="#equipe">Equipe</a>
                        <a href="#contato">Contato</a>
                        {clinic.instagram && <a href={clinic.instagram} target="_blank">Instagram</a>}
                    </div>
                    <p className="modern-footer-copy">© {new Date().getFullYear()} {clinic.name}</p>
                </div>
            </footer>
        </div>
    )
}
