'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateProps } from '../index'
import { mergeWithDefaultTheme } from '@/types/clinic-theme'
import './glassmorphism.css'

export function GlassmorphismTemplate({
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

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (searchTerm.trim()) {
            onSearch(searchTerm)
        }
    }

    const handleBook = () => {
        onBook()
    }

    const featuredDoctors = doctors.slice(0, 3)
    const topSpecialties = specialties.slice(0, 4)

    return (
        <div className="glass-template">
            {/* Animated Background */}
            <div className="glass-bg-animation">
                <div className="glass-blob glass-blob-1" />
                <div className="glass-blob glass-blob-2" />
                <div className="glass-blob glass-blob-3" />
            </div>

            {/* Header */}
            <header className="glass-header">
                <nav className="glass-nav">
                    <div className="glass-logo">
                        {clinic.logo_url ? (
                            <img src={clinic.logo_url} alt={clinic.name} className="glass-logo-img" />
                        ) : (
                            <>
                                <div className="glass-logo-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                    </svg>
                                </div>
                                <span>{clinic.name}</span>
                            </>
                        )}
                    </div>
                    <ul className="glass-nav-links">
                        <li><a href="#inicio">Início</a></li>
                        <li><a href="#especialidades">Especialidades</a></li>
                        <li><a href="#medicos">Médicos</a></li>
                        <li><a href="#sobre">Sobre</a></li>
                        <li><a href="#contato">Contato</a></li>
                    </ul>
                    <div className="glass-nav-buttons">
                        <button onClick={onTeleconsulta} className="glass-btn glass-btn-ghost">
                            Teleconsulta
                        </button>
                        <button onClick={handleBook} className="glass-btn glass-btn-primary">
                            {hero.cta_text || 'Agendar Consulta'}
                        </button>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section id="inicio" className="glass-hero">
                <div className="glass-hero-container">
                    <div className="glass-hero-content">
                        <h1>
                            {hero.title || 'Sua saúde merece'}{' '}
                            <span className="glass-gradient-text">{hero.title ? '' : 'cuidado premium'}</span>
                        </h1>
                        <p>
                            {hero.subtitle || clinic.tagline || 'Agende consultas com os melhores especialistas da região. Teleconsulta disponível 24h. Atendimento humanizado e tecnologia de ponta.'}
                        </p>
                        <div className="glass-hero-buttons">
                            <button onClick={handleBook} className="glass-btn glass-btn-primary glass-btn-large">
                                {hero.cta_text || 'Agendar Agora'}
                            </button>
                            <a href="#especialidades" className="glass-btn glass-btn-ghost glass-btn-large">
                                Ver Especialidades
                            </a>
                        </div>
                        <div className="glass-hero-stats">
                            <div className="glass-stat">
                                <div className="glass-stat-value">{specialties.length}+</div>
                                <div className="glass-stat-label">{content.stat2_label || 'Especialidades'}</div>
                            </div>
                            <div className="glass-stat">
                                <div className="glass-stat-value">{stats.total_doctors}+</div>
                                <div className="glass-stat-label">{content.stat1_label || 'Médicos'}</div>
                            </div>
                            <div className="glass-stat">
                                <div className="glass-stat-value">{stats.average_rating > 0 ? `${stats.average_rating.toFixed(0)}%` : '98%'}</div>
                                <div className="glass-stat-label">{content.stat3_label || 'Satisfação'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-hero-visual">
                        <div className="glass-card">
                            <form onSubmit={handleSearchSubmit} className="glass-search-box">
                                <input
                                    type="text"
                                    placeholder="🔍 Buscar especialidade ou médico..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button type="submit" className="glass-search-btn">Buscar</button>
                            </form>

                            <div className="glass-specialties">
                                {topSpecialties.map((specialty) => (
                                    <button
                                        key={specialty.slug}
                                        onClick={() => router.push(`/${clinic.slug}/agendar?especialidade=${specialty.slug}`)}
                                        className="glass-specialty-tag"
                                    >
                                        {specialty.name}
                                    </button>
                                ))}
                            </div>

                            <div className="glass-doctor-cards">
                                {featuredDoctors.map((doctor) => (
                                    <div
                                        key={doctor.id}
                                        className="glass-doctor-card"
                                        onClick={() => onBook(doctor.id)}
                                    >
                                        <div className="glass-doctor-avatar">
                                            {doctor.photo_url ? (
                                                <img src={doctor.photo_url} alt={doctor.full_name} />
                                            ) : (
                                                doctor.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')
                                            )}
                                        </div>
                                        <div className="glass-doctor-info">
                                            <h4>{doctor.full_name}</h4>
                                            <p>{doctor.specialty} • CRM {doctor.crm}</p>
                                        </div>
                                        <div className="glass-doctor-rating">★ 4.9</div>
                                    </div>
                                ))}
                            </div>
                        </div>


                    </div>
                </div>
            </section>

            {/* Especialidades Section */}
            <section id="especialidades" className="glass-section">
                <div className="glass-section-container">
                    <h2 className="glass-section-title">
                        {content.specialties_title || 'Nossas'} <span className="glass-gradient-text">{content.specialties_title ? '' : 'Especialidades'}</span>
                    </h2>
                    <p className="glass-section-subtitle">
                        {content.specialties_subtitle || 'Oferecemos atendimento em diversas especialidades médicas'}
                    </p>
                    <div className="glass-specialties-grid">
                        {specialties.map((specialty) => (
                            <div
                                key={specialty.slug}
                                className="glass-specialty-card"
                                onClick={() => router.push(`/${clinic.slug}/agendar?especialidade=${specialty.slug}`)}
                            >
                                <div className="glass-specialty-icon">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                    </svg>
                                </div>
                                <h3>{specialty.name}</h3>
                                <p>{specialty.doctorCount} médico{specialty.doctorCount !== 1 ? 's' : ''}</p>
                                <button className="glass-btn glass-btn-ghost glass-btn-small">
                                    Ver Médicos
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Médicos Section */}
            <section id="medicos" className="glass-section glass-section-alt">
                <div className="glass-section-container">
                    <h2 className="glass-section-title">
                        {content.doctors_title || 'Nossa'} <span className="glass-gradient-text">{content.doctors_title ? '' : 'Equipe Médica'}</span>
                    </h2>
                    <p className="glass-section-subtitle">
                        {content.doctors_subtitle || 'Profissionais qualificados para cuidar da sua saúde'}
                    </p>
                    <div className="glass-doctors-grid">
                        {doctors.map((doctor) => (
                            <div
                                key={doctor.id}
                                className="glass-doctor-card-large"
                                onClick={() => onBook(doctor.id)}
                            >
                                <div className="glass-doctor-avatar-large">
                                    {doctor.photo_url ? (
                                        <img src={doctor.photo_url} alt={doctor.full_name} />
                                    ) : (
                                        <div className="glass-avatar-placeholder">
                                            {doctor.full_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                        </div>
                                    )}
                                </div>
                                <div className="glass-doctor-details">
                                    <h3>Dr(a). {doctor.full_name}</h3>
                                    <p className="glass-doctor-specialty">{doctor.specialty}</p>
                                    <p className="glass-doctor-crm">CRM {doctor.crm}</p>
                                    <button className="glass-btn glass-btn-primary glass-btn-small">
                                        {hero.cta_text || 'Agendar Consulta'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Sobre Section */}
            <section id="sobre" className="glass-section">
                <div className="glass-section-container">
                    <h2 className="glass-section-title">
                        {content.about_title || 'Sobre a'} <span className="glass-gradient-text">{content.about_title ? '' : clinic.name}</span>
                    </h2>
                    <div className="glass-about-content">
                        <div className="glass-about-text">
                            <p>
                                {clinic.about || `A ${clinic.name} é uma clínica moderna e acolhedora, comprometida com a excelência no atendimento médico. Nossa equipe de profissionais altamente qualificados está pronta para oferecer o melhor cuidado à sua saúde.`}
                            </p>
                            <div className="glass-about-features">
                                <div className="glass-feature">
                                    <span className="glass-feature-icon">✓</span>
                                    <span>{content.feature1_title || 'Atendimento Humanizado'}</span>
                                </div>
                                <div className="glass-feature">
                                    <span className="glass-feature-icon">✓</span>
                                    <span>{content.feature2_title || 'Tecnologia de Ponta'}</span>
                                </div>
                                <div className="glass-feature">
                                    <span className="glass-feature-icon">✓</span>
                                    <span>{content.feature3_title || 'Teleconsulta Disponível'}</span>
                                </div>
                                <div className="glass-feature">
                                    <span className="glass-feature-icon">✓</span>
                                    <span>{content.feature4_title || 'Agendamento Online'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Contato Section */}
            <section id="contato" className="glass-section glass-section-alt">
                <div className="glass-section-container">
                    <h2 className="glass-section-title">
                        {content.contact_title || 'Entre em'} <span className="glass-gradient-text">{content.contact_title ? '' : 'Contato'}</span>
                    </h2>
                    <p className="glass-section-subtitle">
                        {content.contact_subtitle || 'Estamos prontos para atendê-lo'}
                    </p>
                    <div className="glass-contact-grid">
                        <div className="glass-contact-card">
                            <div className="glass-contact-icon">📍</div>
                            <h3>Endereço</h3>
                            <p>{clinic.address || 'Entre em contato para obter nosso endereço'}</p>
                        </div>
                        <div className="glass-contact-card">
                            <div className="glass-contact-icon">📞</div>
                            <h3>Telefone</h3>
                            <p>{clinic.phone || 'Agende online'}</p>
                        </div>
                        <div className="glass-contact-card">
                            <div className="glass-contact-icon">✉️</div>
                            <h3>Email</h3>
                            <p>{clinic.email || 'contato@clinica.com'}</p>
                        </div>
                        <div className="glass-contact-card glass-contact-cta">
                            <div className="glass-contact-icon">🗓️</div>
                            <h3>Agende sua Consulta</h3>
                            <p>Clique abaixo para agendar</p>
                            <button onClick={handleBook} className="glass-btn glass-btn-primary">
                                {hero.cta_text || 'Agendar Agora'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="glass-footer">
                <div className="glass-footer-content">
                    <div className="glass-footer-brand">
                        <div className="glass-logo">
                            {clinic.logo_url ? (
                                <img src={clinic.logo_url} alt={clinic.name} className="glass-logo-img" />
                            ) : (
                                <span>{clinic.name}</span>
                            )}
                        </div>
                        <p>{clinic.address}</p>
                        {clinic.phone && <p>📞 {clinic.phone}</p>}
                    </div>
                    <div className="glass-footer-links">
                        <a href="#inicio">Início</a>
                        <a href="#especialidades">Especialidades</a>
                        <a href="#medicos">Médicos</a>
                        <a href="#contato">Contato</a>
                    </div>
                    <div className="glass-footer-cta">
                        <button onClick={handleBook} className="glass-btn glass-btn-primary">
                            {hero.cta_text || 'Agendar Consulta'}
                        </button>
                    </div>
                </div>
                <div className="glass-footer-bottom">
                    <p>© {new Date().getFullYear()} {clinic.name}. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    )
}

