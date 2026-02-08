'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateProps } from '../index'
import { mergeWithDefaultTheme } from '@/types/clinic-theme'
import './classic-medical.css'

/**
 * Template 1: Classic Medical
 * Layout tradicional de clínica, fundo branco, hero centrado, grid de serviços
 * Simples, limpo, estilo clínico/documental - sem animações
 */
export function ClassicMedicalTemplate({
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

    // Merge theme with defaults
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

    const topDoctors = doctors.slice(0, 3)

    return (
        <div className="classic-template">
            {/* Header */}
            <header className="classic-header">
                <div className="classic-header-container">
                    <div className="classic-logo">
                        {clinic.logo_url ? (
                            <img src={clinic.logo_url} alt={clinic.name} />
                        ) : (
                            <span className="classic-logo-text">{clinic.name}</span>
                        )}
                    </div>
                    <nav className="classic-nav">
                        <a href="#inicio">Início</a>
                        <a href="#servicos">Serviços</a>
                        <a href="#equipe">Equipe</a>
                        <a href="#contato">Contato</a>
                    </nav>
                    <div className="classic-header-actions">
                        {clinic.phone && (
                            <a href={`tel:${clinic.phone}`} className="classic-phone">
                                📞 {clinic.phone}
                            </a>
                        )}
                        <button onClick={handleBook} className="classic-btn classic-btn-primary">
                            {hero.cta_text || 'Agendar Consulta'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section - Centrado */}
            <section id="inicio" className="classic-hero">
                <div className="classic-hero-content">
                    {content.hero_tag && (
                        <span className="classic-hero-tag">{content.hero_tag}</span>
                    )}
                    <h1>{hero.title || clinic.tagline || 'Cuidando da sua saúde com excelência'}</h1>
                    <p>{hero.subtitle || clinic.about || 'Nossa equipe está pronta para oferecer o melhor atendimento médico para você e sua família.'}</p>
                    <div className="classic-hero-buttons">
                        <button onClick={handleBook} className="classic-btn classic-btn-primary classic-btn-large">
                            {hero.cta_text || 'Agendar Consulta'}
                        </button>
                        <button onClick={onTeleconsulta} className="classic-btn classic-btn-secondary classic-btn-large">
                            Teleconsulta
                        </button>
                    </div>
                    {/* Busca */}
                    <form onSubmit={handleSearchSubmit} className="classic-search">
                        <input
                            type="text"
                            placeholder="Buscar especialidade ou médico..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <button type="submit">Buscar</button>
                    </form>
                </div>
            </section>

            {/* Stats */}
            <section className="classic-stats">
                <div className="classic-stats-container">
                    <div className="classic-stat">
                        <span className="classic-stat-value">{stats.total_doctors}+</span>
                        <span className="classic-stat-label">{content.stat1_label || 'Médicos'}</span>
                    </div>
                    <div className="classic-stat">
                        <span className="classic-stat-value">{specialties.length}+</span>
                        <span className="classic-stat-label">{content.stat2_label || 'Especialidades'}</span>
                    </div>
                    <div className="classic-stat">
                        <span className="classic-stat-value">{stats.total_reviews > 0 ? `${stats.total_reviews}+` : '500+'}</span>
                        <span className="classic-stat-label">{content.stat3_label || 'Pacientes Atendidos'}</span>
                    </div>
                </div>
            </section>

            {/* Serviços / Especialidades */}
            {display.show_specialties_grid && (
                <section id="servicos" className="classic-section">
                    <div className="classic-section-container">
                        <h2>{content.specialties_title || 'Nossas Especialidades'}</h2>
                        <p className="classic-section-subtitle">{content.specialties_subtitle || 'Oferecemos atendimento completo em diversas áreas da medicina'}</p>
                        <div className="classic-services-grid">
                            {specialties.map((specialty) => (
                                <div
                                    key={specialty.slug}
                                    className="classic-service-card"
                                    onClick={() => router.push(`/${clinic.slug}/agendar?especialidade=${specialty.slug}`)}
                                >
                                    <div className="classic-service-icon">🏥</div>
                                    <h3>{specialty.name}</h3>
                                    <p>{specialty.doctorCount} profissional{specialty.doctorCount !== 1 ? 'is' : ''}</p>
                                    <span className="classic-service-link">Ver horários →</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Equipe Médica */}
            <section id="equipe" className="classic-section classic-section-alt">
                <div className="classic-section-container">
                    <h2>{content.doctors_title || 'Nossa Equipe'}</h2>
                    <p className="classic-section-subtitle">{content.doctors_subtitle || 'Profissionais qualificados e dedicados ao seu bem-estar'}</p>
                    <div className="classic-doctors-grid">
                        {doctors.map((doctor) => (
                            <div
                                key={doctor.id}
                                className="classic-doctor-card"
                                onClick={() => onBook(doctor.id)}
                            >
                                <div className="classic-doctor-photo">
                                    {display.show_doctor_photos && doctor.photo_url ? (
                                        <img src={doctor.photo_url} alt={doctor.full_name} />
                                    ) : (
                                        <span>{doctor.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}</span>
                                    )}
                                </div>
                                <h3>Dr(a). {doctor.full_name}</h3>
                                <p className="classic-doctor-specialty">{doctor.specialty}</p>
                                <p className="classic-doctor-crm">CRM {doctor.crm}</p>
                                <button className="classic-btn classic-btn-small">
                                    {hero.cta_text || 'Agendar'}
                                </button>
                            </div>
                        ))}
                    </div>
                    <div className="classic-doctors-cta">
                        <button onClick={handleBook} className="classic-btn classic-btn-primary">
                            Ver Todos os Médicos
                        </button>
                    </div>
                </div>
            </section>

            {/* Sobre */}
            <section className="classic-section">
                <div className="classic-section-container">
                    <h2>{content.about_title || `Sobre a ${clinic.name}`}</h2>
                    <div className="classic-about-content">
                        <div className="classic-about-text">
                            <p>{clinic.about || `A ${clinic.name} é uma clínica comprometida com a excelência no atendimento médico, oferecendo serviços de qualidade com profissionais altamente capacitados.`}</p>
                            <div className="classic-features">
                                <div className="classic-feature">
                                    <span className="classic-feature-icon">✓</span>
                                    <span>{content.feature1_title || 'Atendimento Humanizado'}</span>
                                </div>
                                <div className="classic-feature">
                                    <span className="classic-feature-icon">✓</span>
                                    <span>{content.feature2_title || 'Equipamentos Modernos'}</span>
                                </div>
                                <div className="classic-feature">
                                    <span className="classic-feature-icon">✓</span>
                                    <span>{content.feature3_title || 'Agendamento Online'}</span>
                                </div>
                                <div className="classic-feature">
                                    <span className="classic-feature-icon">✓</span>
                                    <span>{content.feature4_title || 'Teleconsulta Disponível'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contato */}
            <section id="contato" className="classic-section classic-section-alt">
                <div className="classic-section-container">
                    <h2>{content.contact_title || 'Entre em Contato'}</h2>
                    <p className="classic-section-subtitle">{content.contact_subtitle || 'Estamos à disposição para atendê-lo'}</p>
                    <div className="classic-contact-grid">
                        <div className="classic-contact-card">
                            <span className="classic-contact-icon">📍</span>
                            <h3>Endereço</h3>
                            <p>{clinic.address || 'Entre em contato para mais informações'}</p>
                        </div>
                        <div className="classic-contact-card">
                            <span className="classic-contact-icon">📞</span>
                            <h3>Telefone</h3>
                            <p>{clinic.phone || 'Agende online'}</p>
                        </div>
                        <div className="classic-contact-card">
                            <span className="classic-contact-icon">✉️</span>
                            <h3>E-mail</h3>
                            <p>{clinic.email || 'contato@clinica.com'}</p>
                        </div>
                        {clinic.opening_hours && (
                            <div className="classic-contact-card">
                                <span className="classic-contact-icon">🕐</span>
                                <h3>Horário</h3>
                                <div className="classic-hours">
                                    {Object.entries(clinic.opening_hours).map(([day, hours]) => (
                                        <p key={day}><strong>{day}:</strong> {hours}</p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="classic-contact-cta">
                        <button onClick={handleBook} className="classic-btn classic-btn-primary classic-btn-large">
                            {hero.cta_text || 'Agendar Consulta'}
                        </button>
                        {clinic.whatsapp_number && (
                            <a
                                href={`https://wa.me/${clinic.whatsapp_number.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="classic-btn classic-btn-whatsapp classic-btn-large"
                            >
                                💬 WhatsApp
                            </a>
                        )}
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="classic-footer">
                <div className="classic-footer-container">
                    <div className="classic-footer-brand">
                        {clinic.logo_url ? (
                            <img src={clinic.logo_url} alt={clinic.name} />
                        ) : (
                            <span>{clinic.name}</span>
                        )}
                        <p>{clinic.address}</p>
                    </div>
                    <div className="classic-footer-links">
                        <a href="#inicio">Início</a>
                        <a href="#servicos">Serviços</a>
                        <a href="#equipe">Equipe</a>
                        <a href="#contato">Contato</a>
                    </div>
                    <div className="classic-footer-social">
                        {clinic.instagram && (
                            <a href={clinic.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
                        )}
                        {clinic.facebook && (
                            <a href={clinic.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
                        )}
                    </div>
                </div>
                <div className="classic-footer-bottom">
                    <p>© {new Date().getFullYear()} {clinic.name}. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    )
}
