'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateProps } from '../index'
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
                        <li><a href="#contato">Contato</a></li>
                    </ul>
                    <div className="glass-nav-buttons">
                        <button onClick={onTeleconsulta} className="glass-btn glass-btn-ghost">
                            Teleconsulta
                        </button>
                        <button onClick={handleBook} className="glass-btn glass-btn-primary">
                            Agendar Consulta
                        </button>
                    </div>
                </nav>
            </header>

            {/* Hero Section */}
            <section id="inicio" className="glass-hero">
                <div className="glass-hero-container">
                    <div className="glass-hero-content">
                        <h1>
                            Sua saúde merece{' '}
                            <span className="glass-gradient-text">cuidado premium</span>
                        </h1>
                        <p>
                            {clinic.tagline || 'Agende consultas com os melhores especialistas da região. Teleconsulta disponível 24h. Atendimento humanizado e tecnologia de ponta.'}
                        </p>
                        <div className="glass-hero-buttons">
                            <button onClick={handleBook} className="glass-btn glass-btn-primary glass-btn-large">
                                Agendar Agora
                            </button>
                            <a href="#especialidades" className="glass-btn glass-btn-ghost glass-btn-large">
                                Ver Especialidades
                            </a>
                        </div>
                        <div className="glass-hero-stats">
                            <div className="glass-stat">
                                <div className="glass-stat-value">{specialties.length}+</div>
                                <div className="glass-stat-label">Especialidades</div>
                            </div>
                            <div className="glass-stat">
                                <div className="glass-stat-value">{stats.total_doctors}+</div>
                                <div className="glass-stat-label">Médicos</div>
                            </div>
                            <div className="glass-stat">
                                <div className="glass-stat-value">{stats.average_rating > 0 ? `${stats.average_rating.toFixed(0)}%` : '98%'}</div>
                                <div className="glass-stat-label">Satisfação</div>
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
                            Agendar Consulta
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
