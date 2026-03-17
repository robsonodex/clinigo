'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateProps } from '../index'
import { mergeWithDefaultTheme } from '@/types/clinic-theme'
import './corporate-healthcare.css'

/**
 * Template 3: Corporate Healthcare
 * Visual institucional com header navy, estruturado e profissional
 * Simples, limpo, estilo clínico/documental - sem animações
 */
export function CorporateHealthcareTemplate({
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
        <div className="corp-template">
            {/* Header Navy */}
            <header className="corp-header">
                <div className="corp-header-container">
                    <div className="corp-logo">
                        {clinic.logo_url ? (
                            <img src={clinic.logo_url} alt={clinic.name} />
                        ) : (
                            <span>{clinic.name}</span>
                        )}
                    </div>
                    <nav className="corp-nav">
                        <a href="#servicos">Serviços</a>
                        <a href="#equipe">Equipe Médica</a>
                        <a href="#sobre">Institucional</a>
                        <a href="#contato">Contato</a>
                    </nav>
                    <div className="corp-header-actions">
                        {clinic.phone && (
                            <a href={`tel:${clinic.phone}`} className="corp-phone">
                                📞 {clinic.phone}
                            </a>
                        )}
                        <button onClick={handleBook} className="corp-btn corp-btn-accent">
                            {hero.cta_text || 'Agendar'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="corp-hero">
                <div className="corp-hero-container">
                    <div className="corp-hero-content">
                        {content.hero_tag && (
                            <span className="corp-hero-badge">{content.hero_tag}</span>
                        )}
                        <h1>{hero.title || clinic.tagline || 'Excelência em Saúde'}</h1>
                        <p>{hero.subtitle || clinic.about || 'Há décadas cuidando da saúde da sua família com profissionalismo e dedicação.'}</p>
                        <div className="corp-hero-actions">
                            <button onClick={handleBook} className="corp-btn corp-btn-primary corp-btn-large">
                                {hero.cta_text || 'Agendar Consulta'}
                            </button>
                            <button onClick={onTeleconsulta} className="corp-btn corp-btn-outline corp-btn-large">
                                Teleconsulta
                            </button>
                        </div>
                    </div>
                    <div className="corp-hero-stats">
                        <div className="corp-stat">
                            <span className="corp-stat-value">{stats.total_doctors}+</span>
                            <span className="corp-stat-label">{content.stat1_label || 'Médicos'}</span>
                        </div>
                        <div className="corp-stat">
                            <span className="corp-stat-value">{specialties.length}+</span>
                            <span className="corp-stat-label">{content.stat2_label || 'Especialidades'}</span>
                        </div>
                        <div className="corp-stat">
                            <span className="corp-stat-value">{stats.total_reviews > 0 ? `${stats.total_reviews}+` : '1000+'}</span>
                            <span className="corp-stat-label">{content.stat3_label || 'Pacientes'}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Search Bar */}
            <section className="corp-search-section">
                <form onSubmit={handleSearchSubmit} className="corp-search">
                    <input
                        type="text"
                        placeholder="Buscar especialidade, médico ou procedimento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <button type="submit">Buscar</button>
                </form>
            </section>

            {/* Serviços */}
            {display.show_specialties_grid && (
                <section id="servicos" className="corp-section">
                    <div className="corp-section-container">
                        <div className="corp-section-header">
                            <h2>{content.specialties_title || 'Nossos Serviços'}</h2>
                            <p>{content.specialties_subtitle || 'Atendimento completo em diversas especialidades médicas'}</p>
                        </div>
                        <div className="corp-services-list">
                            {specialties.map((specialty, index) => (
                                <div
                                    key={specialty.slug}
                                    className="corp-service-item"
                                    onClick={() => router.push(`/${clinic.slug}/agendar?especialidade=${specialty.slug}`)}
                                >
                                    <div className="corp-service-content">
                                        <h3>{specialty.name}</h3>
                                        <p>{specialty.doctorCount} profissional{specialty.doctorCount !== 1 ? 'is' : ''} disponível</p>
                                    </div>
                                    <span className="corp-service-arrow">→</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Equipe */}
            <section id="equipe" className="corp-section corp-section-alt">
                <div className="corp-section-container">
                    <div className="corp-section-header">
                        <h2>{content.doctors_title || 'Corpo Clínico'}</h2>
                        <p>{content.doctors_subtitle || 'Profissionais altamente qualificados'}</p>
                    </div>
                    <div className="corp-doctors-grid">
                        {doctors.map((doctor) => (
                            <div
                                key={doctor.id}
                                className="corp-doctor-card"
                                onClick={() => onBook(doctor.id)}
                            >
                                <div className="corp-doctor-photo">
                                    {display.show_doctor_photos && doctor.photo_url ? (
                                        <img src={doctor.photo_url} alt={doctor.full_name} />
                                    ) : (
                                        <span>{doctor.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
                                    )}
                                </div>
                                <div className="corp-doctor-info">
                                    <h3>Dr(a). {doctor.full_name}</h3>
                                    <p className="corp-doctor-specialty">{doctor.specialty}</p>
                                    <p className="corp-doctor-crm">{clinic.council_label || 'CRM'} {doctor.crm}</p>
                                    <button className="corp-btn corp-btn-small">{hero.cta_text || 'Agendar'}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Sobre/Institucional */}
            <section id="sobre" className="corp-section">
                <div className="corp-section-container">
                    <div className="corp-about">
                        <div className="corp-about-content">
                            <h2>{content.about_title || 'Institucional'}</h2>
                            <p>{clinic.about || `A ${clinic.name} é uma instituição de referência em saúde, oferecendo atendimento de excelência há anos.`}</p>
                            <div className="corp-features">
                                <div className="corp-feature">
                                    <span className="corp-feature-icon">✓</span>
                                    <div>
                                        <strong>{content.feature1_title || 'Atendimento Humanizado'}</strong>
                                        <p>{content.feature1_description || 'Cuidado personalizado para cada paciente'}</p>
                                    </div>
                                </div>
                                <div className="corp-feature">
                                    <span className="corp-feature-icon">✓</span>
                                    <div>
                                        <strong>{content.feature2_title || 'Tecnologia Avançada'}</strong>
                                        <p>{content.feature2_description || 'Equipamentos de última geração'}</p>
                                    </div>
                                </div>
                                <div className="corp-feature">
                                    <span className="corp-feature-icon">✓</span>
                                    <div>
                                        <strong>{content.feature3_title || 'Agendamento Online'}</strong>
                                        <p>{content.feature3_description || 'Praticidade para marcar consultas'}</p>
                                    </div>
                                </div>
                                <div className="corp-feature">
                                    <span className="corp-feature-icon">✓</span>
                                    <div>
                                        <strong>{content.feature4_title || 'Teleconsulta'}</strong>
                                        <p>{content.feature4_description || 'Atendimento à distância quando necessário'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contato */}
            <section id="contato" className="corp-section corp-section-dark">
                <div className="corp-section-container">
                    <div className="corp-contact">
                        <div className="corp-contact-info">
                            <h2>{content.contact_title || 'Entre em Contato'}</h2>
                            <p>{content.contact_subtitle || 'Estamos à disposição para atendê-lo'}</p>
                            <div className="corp-contact-details">
                                {clinic.address && (
                                    <div className="corp-contact-item">
                                        <span>📍</span>
                                        <p>{clinic.address}</p>
                                    </div>
                                )}
                                {clinic.phone && (
                                    <div className="corp-contact-item">
                                        <span>📞</span>
                                        <p>{clinic.phone}</p>
                                    </div>
                                )}
                                {clinic.email && (
                                    <div className="corp-contact-item">
                                        <span>✉️</span>
                                        <p>{clinic.email}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="corp-contact-cta">
                            <button onClick={handleBook} className="corp-btn corp-btn-accent corp-btn-large">
                                {hero.cta_text || 'Agendar Consulta'}
                            </button>
                            {clinic.whatsapp_number && (
                                <a
                                    href={`https://wa.me/${clinic.whatsapp_number.replace(/\D/g, '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="corp-btn corp-btn-whatsapp corp-btn-large"
                                >
                                    💬 WhatsApp
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="corp-footer">
                <div className="corp-footer-container">
                    <div className="corp-footer-brand">
                        {clinic.logo_url ? (
                            <img src={clinic.logo_url} alt={clinic.name} />
                        ) : (
                            <span>{clinic.name}</span>
                        )}
                        <p>{clinic.address}</p>
                    </div>
                    <div className="corp-footer-links">
                        <h4>Links</h4>
                        <a href="#servicos">Serviços</a>
                        <a href="#equipe">Equipe</a>
                        <a href="#sobre">Institucional</a>
                        <a href="#contato">Contato</a>
                    </div>
                    <div className="corp-footer-social">
                        <h4>Redes Sociais</h4>
                        {clinic.instagram && <a href={clinic.instagram} target="_blank">Instagram</a>}
                        {clinic.facebook && <a href={clinic.facebook} target="_blank">Facebook</a>}
                        {clinic.linkedin && <a href={clinic.linkedin} target="_blank">LinkedIn</a>}
                    </div>
                </div>
                <div className="corp-footer-bottom">
                    <p>© {new Date().getFullYear()} {clinic.name}. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    )
}
