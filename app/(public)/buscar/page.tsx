'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getInitials } from '@/lib/utils'
import {
    Search,
    MapPin,
    Calendar,
    Building2,
    Video,
    Star,
    ThumbsUp,
    Bell,
    ChevronDown,
    ChevronUp,
    ChevronRight,
    Globe,
    Users,
    CheckCircle,
    MessageSquare,
    Share2,
    RefreshCw,
    X,
    BookOpen,
    ArrowRight,
    Plus,
    Minus,
    ExternalLink
} from 'lucide-react'

// Interfaces
interface MarketplaceClinic {
    id: string
    name: string
    slug: string
    logo_url: string | null
    address?: string
    city?: string
    specialties: string[]
    average_rating: number | null
    total_doctors: number
}

// Full lists for Filter Chips Rows
const FULL_SPECIALTIES = [
    'Psicólogo',
    'Psiquiatra',
    'Fonoaudiólogo',
    'Terapeuta Ocupacional',
    'Nutricionista',
    'Pediatra',
    'Ginecologista',
    'Dermatologista',
    'Oftalmologista',
    'Cardiologista',
    'Endocrinologista',
    'Urologista',
    'Dentista'
]

const FULL_PROCEDURES = [
    'Terapia Cognitivo-Comportamental',
    'Psicanálise',
    'Avaliação Neuropsicológica',
    'Reabilitação Cognitiva',
    'Fonoaudiologia Infantil',
    'Integração Sensorial',
    'Treinamento de Habilidades Sociais',
    'Psicoterapia',
    'Drenagem Linfática',
    'Depilação a Laser',
    'Massagem Modeladora'
]

const FULL_INSURANCES = [
    'Unimed',
    'Amil',
    'Bradesco Saúde',
    'SulAmérica',
    'Golden Cross',
    'Porto Seguro',
    'Cassi',
    'Allianz',
    'Sompo Saúde'
]

const POPULAR_CITIES = [
    { name: 'São Paulo', state: 'SP' },
    { name: 'Rio de Janeiro', state: 'RJ' },
    { name: 'Belo Horizonte', state: 'MG' },
    { name: 'Curitiba', state: 'PR' },
    { name: 'Salvador', state: 'BA' },
    { name: 'Porto Alegre', state: 'RS' },
    { name: 'Brasília', state: 'DF' }
]

// Landing grids data (Specialties, Services, Insurances)
const LANDING_SPECIALTIES = [
    { name: 'Ginecologista', cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'] },
    { name: 'Psiquiatra', cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'] },
    { name: 'Psicólogo', cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'] },
    { name: 'Fonoaudiólogo', cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'] },
    { name: 'Terapeuta Ocupacional', cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'] },
    { name: 'Nutricionista', cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'] },
    { name: 'Pediatra', cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'] },
    { name: 'Dermatologista', cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'] },
    { name: 'Oftalmologista', cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'] },
    { name: 'Cardiologista', cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'] },
    { name: 'Endocrinologista', cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'] },
    { name: 'Urologista', cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Salvador'] }
]

const LANDING_SERVICES = [
    { name: 'Psicoterapia', cities: ['São Paulo', 'Rio de Janeiro', 'Curitiba', 'Salvador'] },
    { name: 'Consulta Fonoaudiológica', cities: ['São Paulo', 'Rio de Janeiro', 'Curitiba', 'Salvador'] },
    { name: 'Avaliação Neuropsicológica', cities: ['São Paulo', 'Rio de Janeiro', 'Curitiba', 'Salvador'] },
    { name: 'Reabilitação Cognitiva', cities: ['São Paulo', 'Rio de Janeiro', 'Curitiba', 'Salvador'] },
    { name: 'Terapia Ocupacional Infantil', cities: ['São Paulo', 'Rio de Janeiro', 'Curitiba', 'Salvador'] },
    { name: 'Consulta de Nutrição', cities: ['São Paulo', 'Rio de Janeiro', 'Curitiba', 'Salvador'] }
]

const LANDING_INSURANCES = [
    { name: 'Amil', items: ['Ginecologia', 'Pediatria', 'Oftalmologia', 'Psicologia'] },
    { name: 'Bradesco Saúde', items: ['Ginecologia', 'Pediatria', 'Oftalmologia', 'Psicologia'] },
    { name: 'SulAmérica', items: ['Ginecologia', 'Pediatria', 'Oftalmologia', 'Psicologia'] },
    { name: 'Unimed', items: ['Ginecologia', 'Pediatria', 'Oftalmologia', 'Psicologia'] },
    { name: 'Golden Cross', items: ['Ginecologia', 'Pediatria', 'Oftalmologia', 'Psicologia'] }
]

const PATIENT_OPINIONS = [
    {
        id: 1,
        patient: 'Mariana S. de Carvalho',
        rating: 5,
        doctor: 'Cristiane Aparecida L. Carvalho',
        clinic: 'Espaço Incluir',
        comment: 'Profissional extremamente atenciosa e pontual. O ambiente da clínica é acolhedor e seguro. Recomendo muito!',
        date: 'Ontem'
    },
    {
        id: 2,
        patient: 'Lucas G. Ferreira',
        rating: 5,
        doctor: 'Andreia Camilo Nascimento',
        clinic: 'Espaço Incluir',
        comment: 'Melhor consulta de nutrição que já tive. Explica com calma, monta o plano junto com a gente e tira todas as dúvidas.',
        date: 'Há 2 dias'
    },
    {
        id: 3,
        patient: 'Ana Paula N. Souza',
        rating: 5,
        doctor: 'Barbara Greghi Reche',
        clinic: 'Espaço Incluir',
        comment: 'Excelente terapeuta ocupacional. Meu filho evoluiu muito nos últimos meses. Só tenho a agradecer a dedicação.',
        date: 'Há 1 semana'
    }
]

const BLOG_ARTICLES = [
    {
        id: 1,
        title: 'Desenvolvimento Infantil: O papel da Terapia Ocupacional',
        excerpt: 'Saiba como a integração sensorial e atividades lúdicas ajudam crianças com TEA e TDAH a ganharem autonomia nas tarefas diárias.',
        category: 'Terapia Ocupacional',
        readTime: '4 min de leitura'
    },
    {
        id: 2,
        title: 'Linguagem e Fala: Quando procurar um fonoaudiólogo?',
        excerpt: 'Identifique os principais sinais no atraso de fala em crianças e entenda a importância de uma intervenção precoce.',
        category: 'Fonoaudiologia',
        readTime: '5 min de leitura'
    },
    {
        id: 3,
        title: 'Ansiedade e TCC: Entendendo o processo terapêutico',
        excerpt: 'Como a Terapia Cognitivo-Comportamental ajuda a identificar pensamentos disfuncionais e a desenvolver estratégias saudáveis.',
        category: 'Psicologia',
        readTime: '6 min de leitura'
    }
]

// Mock Doctors for Carousel
const CAROUSEL_DOCTORS = [
    { name: 'Dra. Cristiane Carvalho', role: 'Psicóloga', local: 'São Paulo - SP', initials: 'CC' },
    { name: 'Dra. Barbara Greghi', role: 'Terapeuta Ocupacional', local: 'São Paulo - SP', initials: 'BG' },
    { name: 'Dra. Gisele Nunes Duarte', role: 'Fonoaudióloga', local: 'São Paulo - SP', initials: 'GD' },
    { name: 'Dra. Andreia Camilo', role: 'Nutricionista', local: 'São Paulo - SP', initials: 'AC' },
    { name: 'Dr. Thiago Lemos', role: 'Psiquiatra', local: 'São Paulo - SP', initials: 'TL' }
]

export default function BuscarPage() {
    const [clinics, setClinics] = useState<MarketplaceClinic[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [isSearching, setIsSearching] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Filter states
    const [searchQuery, setSearchQuery] = useState('')
    const [searchCity, setSearchCity] = useState('')
    const [selectedTab, setSelectedTab] = useState<'local' | 'teleconsulta'>('local')
    const [selectedInsurance, setSelectedInsurance] = useState('')
    const [selectedProcedure, setSelectedProcedure] = useState('')

    // Inline Expansion states for Filter Chips Rows
    const [expandSpecialties, setExpandSpecialties] = useState(false)
    const [expandProcedures, setExpandProcedures] = useState(false)
    const [expandInsurances, setExpandInsurances] = useState(false)

    // Portal home grid expansion states
    const [expandLandingSpecialties, setExpandLandingSpecialties] = useState(false)
    const [expandLandingServices, setExpandLandingServices] = useState(false)

    // UI dropdown states
    const [showSpecialtyDropdown, setShowSpecialtyDropdown] = useState(false)
    const [showCityDropdown, setShowCityDropdown] = useState(false)
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    // Refs for clicking outside dropdowns
    const specialtyRef = useRef<HTMLDivElement>(null)
    const cityRef = useRef<HTMLDivElement>(null)

    // Toast notification state
    const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false })

    const showToast = (message: string) => {
        setToast({ message, show: true })
        setTimeout(() => {
            setToast(prev => ({ ...prev, show: false }))
        }, 3000)
    }

    // Fetch clinics on mount
    const fetchClinics = async () => {
        setIsLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/marketplace/clinics')
            if (!res.ok) throw new Error('Erro ao carregar clínicas')
            const data = await res.json()
            setClinics(data.clinics || [])
        } catch (err) {
            setError('Não foi possível carregar as clínicas. Tente novamente.')
            console.error('Erro ao buscar clínicas:', err)
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        fetchClinics()
    }, [])

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (specialtyRef.current && !specialtyRef.current.contains(event.target as Node)) {
                setShowSpecialtyDropdown(false)
            }
            if (cityRef.current && !cityRef.current.contains(event.target as Node)) {
                setShowCityDropdown(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Client-side filtering logic
    const filteredClinics = useMemo(() => {
        return clinics.filter(clinic => {
            const query = searchQuery.toLowerCase().trim()
            const matchesQuery = !query ||
                clinic.name.toLowerCase().includes(query) ||
                clinic.specialties.some(s => s.toLowerCase().includes(query))

            const city = searchCity.toLowerCase().trim()
            const matchesCity = !city ||
                clinic.city?.toLowerCase().includes(city) ||
                clinic.address?.toLowerCase().includes(city)

            const matchesInsurance = !selectedInsurance ||
                clinic.name.toLowerCase().includes('incluir') // Mock filter match

            const matchesProcedure = !selectedProcedure ||
                clinic.specialties.some(s => s.toLowerCase().includes(selectedProcedure.toLowerCase().substring(0, 5)))

            return matchesQuery && matchesCity && matchesInsurance && matchesProcedure
        })
    }, [clinics, searchQuery, searchCity, selectedInsurance, selectedProcedure])

    // Detect if we should render Search Results View or Portal Landing View
    const isSearchResultsView = useMemo(() => {
        return !!(searchQuery || searchCity || selectedInsurance || selectedProcedure)
    }, [searchQuery, searchCity, selectedInsurance, selectedProcedure])

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setIsSearching(true)
        setTimeout(() => {
            setIsSearching(false)
            showToast('Resultados de busca carregados!')
        }, 550)
    }

    const handleClearFilters = () => {
        setSearchQuery('')
        setSearchCity('')
        setSelectedInsurance('')
        setSelectedProcedure('')
        setExpandSpecialties(false)
        setExpandProcedures(false)
        setExpandInsurances(false)
        showToast('Filtros redefinidos!')
    }

    const handleCopyShareLink = (clinicSlug: string) => {
        const url = `${window.location.origin}/${clinicSlug}/agendar`
        navigator.clipboard.writeText(url)
        showToast('Link de agendamento copiado para a área de transferência!')
    }

    // Grid element clicks to search
    const handleGridItemClick = (specialty: string, city?: string) => {
        setSearchQuery(specialty)
        if (city) setSearchCity(city)
        showToast(`Buscando por ${specialty}${city ? ` em ${city}` : ''}`)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    // Filter Chips sliced lists based on expansion state
    const specialtiesList = useMemo(() => {
        return expandSpecialties ? FULL_SPECIALTIES : FULL_SPECIALTIES.slice(0, 5)
    }, [expandSpecialties])

    const proceduresList = useMemo(() => {
        return expandProcedures ? FULL_PROCEDURES : FULL_PROCEDURES.slice(0, 4)
    }, [expandProcedures])

    const insurancesList = useMemo(() => {
        return expandInsurances ? FULL_INSURANCES : FULL_INSURANCES.slice(0, 4)
    }, [expandInsurances])

    // Landing grids sliced lists based on expand Landing states
    const landingSpecialtiesList = useMemo(() => {
        return expandLandingSpecialties ? LANDING_SPECIALTIES : LANDING_SPECIALTIES.slice(0, 6)
    }, [expandLandingSpecialties])

    const landingServicesList = useMemo(() => {
        return expandLandingServices ? LANDING_SERVICES : LANDING_SERVICES.slice(0, 3)
    }, [expandLandingServices])

    return (
        <div className="min-h-screen bg-slate-50 font-sans antialiased text-slate-800">
            {/* Custom Toast Notification */}
            <div
                className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-slate-900 text-white px-5 py-3.5 rounded-xl shadow-2xl transition-all duration-350 transform ${
                    toast.show ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'
                }`}
            >
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-sm font-medium">{toast.message}</span>
            </div>

            {/* HEADER */}
            <header className="sticky top-0 z-40 bg-teal-900 text-white shadow-md border-b border-teal-850">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3 shrink-0">
                        <img
                            src="/logo_white.svg"
                            alt="CliniGo"
                            className="h-10 sm:h-12 w-auto object-contain"
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-5 shrink-0">
                        <Link href="/sobre" className="text-xs xl:text-sm font-medium text-teal-100 hover:text-white transition-colors whitespace-nowrap shrink-0">
                            Segurança de Dados
                        </Link>
                        <Link href="/help" className="text-xs xl:text-sm font-medium text-teal-100 hover:text-white transition-colors whitespace-nowrap shrink-0">
                            Dúvidas Frequentes
                        </Link>
                        <Link href="/trial" className="text-xs xl:text-sm font-medium text-teal-100 hover:text-white transition-colors whitespace-nowrap shrink-0">
                            Cadastrar minha Clínica
                        </Link>
                        <span className="h-5 w-px bg-teal-800 shrink-0" />
                        <Link href="/login" className="text-xs xl:text-sm font-medium text-white hover:text-teal-100 transition-colors whitespace-nowrap shrink-0">
                            Entrar
                        </Link>
                        <Link
                            href="/partners"
                            className="inline-flex items-center justify-center px-4.5 py-2 text-xs xl:text-sm font-bold text-teal-900 bg-white hover:bg-teal-50 rounded-xl transition-all min-h-[44px] whitespace-nowrap shrink-0"
                        >
                            Você atua na área da saúde?
                        </Link>
                    </nav>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="lg:hidden p-2 rounded-lg text-teal-100 hover:text-white hover:bg-teal-800 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        aria-label="Menu Principal"
                    >
                        {mobileMenuOpen ? <X className="w-6 h-6" /> : <ChevronDown className="w-6 h-6 rotate-180" />}
                    </button>
                </div>

                {/* Mobile Drawer */}
                {mobileMenuOpen && (
                    <div className="lg:hidden bg-teal-950 border-t border-teal-850 px-4 py-5 space-y-4 animate-slide-in">
                        <Link
                            href="/sobre"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-base font-medium text-teal-100 hover:text-white py-2"
                        >
                            Segurança de Dados
                        </Link>
                        <Link
                            href="/help"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-base font-medium text-teal-100 hover:text-white py-2"
                        >
                            Dúvidas Frequentes
                        </Link>
                        <Link
                            href="/trial"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-base font-medium text-teal-100 hover:text-white py-2"
                        >
                            Cadastrar minha Clínica
                        </Link>
                        <div className="h-px bg-teal-850 my-2" />
                        <Link
                            href="/login"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-base font-medium text-white hover:text-teal-100 py-2"
                        >
                            Entrar
                        </Link>
                        <Link
                            href="/partners"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block text-center w-full py-3 text-base font-bold text-teal-900 bg-white rounded-xl"
                        >
                            Você atua na área da saúde?
                        </Link>
                    </div>
                )}
            </header>

            {/* HERO SECTION */}
            <section className="bg-gradient-to-br from-teal-900 via-teal-950 to-emerald-950 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f766e_1px,transparent_1px),linear-gradient(to_bottom,#0f766e_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
                        
                        {/* Hero Left */}
                        <div className="lg:col-span-7 space-y-6 sm:space-y-8">
                            <div className="space-y-4">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Agendamento Online 100% Seguro
                                </span>
                                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                                    Agende agora <span className="text-emerald-400">sua consulta</span>
                                </h1>
                                <p className="text-teal-100 text-sm sm:text-base max-w-xl font-normal leading-relaxed">
                                    Mais de 10 mil terapeutas, fonoaudiólogos, psicólogos e médicos de saúde estão prontos para cuidar de você e da sua família.
                                </p>
                            </div>

                            {/* Search Form Overlay Card */}
                            <div className="bg-white text-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl border border-teal-800/10 max-w-2xl">
                                <div className="flex gap-2 mb-4 p-1 bg-slate-100 rounded-xl w-fit">
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTab('local')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                                            selectedTab === 'local'
                                                ? 'bg-white text-teal-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        <Building2 className="w-4 h-4 text-emerald-600" />
                                        No local
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTab('teleconsulta')}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                                            selectedTab === 'teleconsulta'
                                                ? 'bg-white text-teal-900 shadow-sm'
                                                : 'text-slate-500 hover:text-slate-800'
                                        }`}
                                    >
                                        <Video className="w-4 h-4 text-teal-600" />
                                        Teleconsulta
                                    </button>
                                </div>

                                <form onSubmit={handleSearchSubmit} className="flex flex-col gap-3">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        
                                        {/* Specialty Input Dropdown */}
                                        <div ref={specialtyRef} className="relative">
                                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="especialidade, terapia ou nome..."
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    setSearchQuery(e.target.value)
                                                    setShowSpecialtyDropdown(true)
                                                }}
                                                onFocus={() => setShowSpecialtyDropdown(true)}
                                                className="w-full h-12 pl-10 pr-4 text-sm sm:text-base text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-inner"
                                                style={{ fontSize: '16px' }}
                                                required
                                            />
                                            {showSpecialtyDropdown && (
                                                <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-150 overflow-hidden z-50 animate-slide-in">
                                                    <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400">
                                                        Sugestões Populares
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto">
                                                        {FULL_SPECIALTIES.filter(s => 
                                                            s.toLowerCase().includes(searchQuery.toLowerCase())
                                                        ).map((spec) => (
                                                            <button
                                                                key={spec}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSearchQuery(spec)
                                                                    setShowSpecialtyDropdown(false)
                                                                }}
                                                                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-teal-50/50 hover:text-teal-900 text-sm font-medium transition-colors border-b border-slate-50 last:border-0"
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <Building2 className="w-4 h-4 text-slate-400" />
                                                                    {spec}
                                                                </span>
                                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">
                                                                    Especialidade
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* City Input Dropdown */}
                                        <div ref={cityRef} className="relative">
                                            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                            <input
                                                type="text"
                                                placeholder="cidade ou região..."
                                                value={searchCity}
                                                onChange={(e) => {
                                                    setSearchCity(e.target.value)
                                                    setShowCityDropdown(true)
                                                }}
                                                onFocus={() => setShowCityDropdown(true)}
                                                className="w-full h-12 pl-10 pr-4 text-sm sm:text-base text-slate-900 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-inner"
                                                style={{ fontSize: '16px' }}
                                            />
                                            {showCityDropdown && (
                                                <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-slate-150 overflow-hidden z-50 animate-slide-in">
                                                    <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400">
                                                        Principais Cidades
                                                    </div>
                                                    <div className="max-h-60 overflow-y-auto">
                                                        {POPULAR_CITIES.filter(c => 
                                                            c.name.toLowerCase().includes(searchCity.toLowerCase())
                                                        ).map((city) => (
                                                            <button
                                                                key={city.name}
                                                                type="button"
                                                                onClick={() => {
                                                                    setSearchCity(city.name)
                                                                    setShowCityDropdown(false)
                                                                }}
                                                                className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-teal-50/50 hover:text-teal-900 text-sm font-medium transition-colors border-b border-slate-50 last:border-0"
                                                            >
                                                                <span className="flex items-center gap-2">
                                                                    <MapPin className="w-4 h-4 text-slate-400" />
                                                                    {city.name}
                                                                </span>
                                                                <span className="text-xs text-slate-400 font-bold">
                                                                    {city.state}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="h-12 w-full btn-premium flex items-center justify-center gap-2 text-sm sm:text-base tracking-wide min-h-[44px]"
                                        disabled={isSearching}
                                    >
                                        {isSearching ? (
                                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <Search className="w-5 h-5 text-emerald-100" />
                                                Pesquisar Clínicas e Profissionais
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Hero Right: Character/Family/Health Illustration */}
                        <div className="lg:col-span-5 hidden lg:flex justify-center relative">
                            {/* Stylized custom SVG composition to replace static image placeholders */}
                            <svg className="w-full max-w-sm h-auto" viewBox="0 0 400 320" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                    <linearGradient id="circleGrad" x1="0" y1="0" x2="400" y2="320" gradientUnits="userSpaceOnUse">
                                        <stop stopColor="#34d399" stopOpacity="0.25" />
                                        <stop offset="1" stopColor="#10b981" stopOpacity="0.05" />
                                    </linearGradient>
                                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="12" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>
                                
                                {/* Background ambient circles */}
                                <circle cx="200" cy="160" r="140" fill="url(#circleGrad)" />
                                <circle cx="280" cy="100" r="8" fill="#34d399" opacity="0.6" filter="url(#glow)" className="animate-pulse" />
                                <circle cx="100" cy="220" r="6" fill="#14b8a6" opacity="0.4" />
                                <circle cx="320" cy="240" r="5" fill="#10b981" opacity="0.5" />
                                
                                {/* Connection lines */}
                                <path d="M120 180 Q 200 120 280 180" stroke="#047857" strokeWidth="2" strokeDasharray="4 4" opacity="0.5" />
                                <path d="M100 160 Q 200 280 300 160" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" opacity="0.3" />

                                {/* Avatar 1 - Doctor */}
                                <g transform="translate(180, 70)">
                                    <circle cx="20" cy="20" r="32" fill="#065f46" stroke="#059669" strokeWidth="3" filter="url(#glow)" />
                                    <text x="20" y="26" textAnchor="middle" fill="#34d399" fontSize="18" fontWeight="bold">Dr</text>
                                    <circle cx="45" cy="5" r="7" fill="#34d399" stroke="#065f46" strokeWidth="2" />
                                </g>

                                {/* Avatar 2 - Therapist */}
                                <g transform="translate(80, 150)">
                                    <circle cx="20" cy="20" r="28" fill="#115e59" stroke="#0f766e" strokeWidth="2" />
                                    <text x="20" y="25" textAnchor="middle" fill="#2dd4bf" fontSize="14" fontWeight="bold">Psi</text>
                                </g>

                                {/* Avatar 3 - Family */}
                                <g transform="translate(260, 160)">
                                    <circle cx="20" cy="20" r="28" fill="#075985" stroke="#0284c7" strokeWidth="2" />
                                    <text x="20" y="25" textAnchor="middle" fill="#38bdf8" fontSize="14" fontWeight="bold">Fam</text>
                                </g>

                                {/* Status cards */}
                                <g transform="translate(40, 60)" className="animate-bounce" style={{ animationDuration: '6s' }}>
                                    <rect width="110" height="34" rx="8" fill="#ffffff" fillOpacity="0.08" stroke="#ffffff" strokeOpacity="0.15" />
                                    <circle cx="18" cy="17" r="6" fill="#10b981" />
                                    <text x="34" y="21" fill="#ffffff" fontSize="10" fontWeight="bold">Consulta Online</text>
                                </g>

                                <g transform="translate(250, 240)" className="animate-bounce" style={{ animationDuration: '4s' }}>
                                    <rect width="115" height="34" rx="8" fill="#ffffff" fillOpacity="0.08" stroke="#ffffff" strokeOpacity="0.15" />
                                    <circle cx="18" cy="17" r="6" fill="#f59e0b" />
                                    <text x="34" y="21" fill="#ffffff" fontSize="10" fontWeight="bold">Prontuário Ativo</text>
                                </g>
                            </svg>
                        </div>

                    </div>
                </div>
            </section>

            {/* CONDITIONAL RENDER: SEARCH RESULTS VIEW OR PORTAL HOME VIEW */}
            {isSearchResultsView ? (
                /* --- SEARCH RESULTS VIEW --- */
                <>
                    {/* RESULTS FILTER CHIPS (EXPANDIBLE INLINE WITH "+ MAIS") */}
                    <section className="bg-white border-b border-slate-200/80 shadow-sm sticky top-16 sm:top-20 z-30">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-5 space-y-4">
                            
                            {/* Row 1: Specialties */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 whitespace-nowrap">
                                    Especialidades:
                                </span>
                                <button
                                    onClick={() => { setSearchQuery(''); showToast('Filtro de especialidades limpo!') }}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                        !searchQuery
                                            ? 'bg-teal-900 border-teal-900 text-white shadow-sm'
                                            : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                                    }`}
                                >
                                    Todas
                                </button>
                                {specialtiesList.map(spec => (
                                    <button
                                        key={spec}
                                        onClick={() => {
                                            setSearchQuery(spec)
                                            showToast(`Filtrado por: ${spec}`)
                                        }}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                            searchQuery.toLowerCase() === spec.toLowerCase()
                                                ? 'bg-teal-900 border-teal-900 text-white shadow-sm'
                                                : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                                        }`}
                                    >
                                        {spec}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setExpandSpecialties(!expandSpecialties)}
                                    className="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border border-teal-200 text-teal-800 hover:bg-teal-50 flex items-center gap-1 min-h-[32px]"
                                    type="button"
                                >
                                    {expandSpecialties ? (
                                        <>
                                            <Minus className="w-3.5 h-3.5" />
                                            Menos
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3.5 h-3.5" />
                                            Mais
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Row 2: Procedures */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 whitespace-nowrap">
                                    Procedimentos:
                                </span>
                                <button
                                    onClick={() => { setSelectedProcedure(''); showToast('Filtro de procedimentos limpo!') }}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                        !selectedProcedure
                                            ? 'bg-emerald-800 border-emerald-800 text-white shadow-sm'
                                            : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                                    }`}
                                >
                                    Todos
                                </button>
                                {proceduresList.map(proc => (
                                    <button
                                        key={proc}
                                        onClick={() => {
                                            setSelectedProcedure(proc)
                                            showToast(`Procedimento: ${proc}`)
                                        }}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                            selectedProcedure === proc
                                                ? 'bg-emerald-800 border-emerald-800 text-white shadow-sm'
                                                : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                                        }`}
                                    >
                                        {proc}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setExpandProcedures(!expandProcedures)}
                                    className="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border border-emerald-250 text-emerald-800 hover:bg-emerald-50 flex items-center gap-1 min-h-[32px]"
                                    type="button"
                                >
                                    {expandProcedures ? (
                                        <>
                                            <Minus className="w-3.5 h-3.5" />
                                            Menos
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3.5 h-3.5" />
                                            Mais
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Row 3: Insurances */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-2 whitespace-nowrap">
                                    Convênios:
                                </span>
                                <button
                                    onClick={() => { setSelectedInsurance(''); showToast('Filtro de convênios limpo!') }}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                        !selectedInsurance
                                            ? 'bg-teal-700 border-teal-700 text-white shadow-sm'
                                            : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                                    }`}
                                >
                                    Todos convênios
                                </button>
                                {insurancesList.map(ins => (
                                    <button
                                        key={ins}
                                        onClick={() => {
                                            setSelectedInsurance(ins)
                                            showToast(`Convênio: ${ins}`)
                                        }}
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                                            selectedInsurance === ins
                                                ? 'bg-teal-700 border-teal-700 text-white shadow-sm'
                                                : 'bg-slate-50 border-slate-200 text-slate-650 hover:bg-slate-100'
                                        }`}
                                    >
                                        {ins}
                                    </button>
                                ))}
                                <button
                                    onClick={() => setExpandInsurances(!expandInsurances)}
                                    className="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border border-teal-200 text-teal-800 hover:bg-teal-50 flex items-center gap-1 min-h-[32px]"
                                    type="button"
                                >
                                    {expandInsurances ? (
                                        <>
                                            <Minus className="w-3.5 h-3.5" />
                                            Menos
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="w-3.5 h-3.5" />
                                            Mais
                                        </>
                                    )}
                                </button>
                            </div>

                        </div>
                    </section>

                    {/* SEARCH RESULTS LIST */}
                    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                            
                            {/* Left Results Column */}
                            <div className="lg:col-span-8 space-y-6">
                                
                                {!isLoading && (
                                    <div className="flex items-center justify-between bg-white px-5 py-4 rounded-xl border border-slate-200/85 shadow-sm">
                                        <p className="text-sm font-medium text-slate-600">
                                            Encontramos <span className="text-slate-900 font-extrabold">{filteredClinics.length}</span> clínica{filteredClinics.length !== 1 ? 's' : ''} correspondente{filteredClinics.length !== 1 ? 's' : ''}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={fetchClinics}
                                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs text-slate-500 hover:text-teal-600 font-bold border border-slate-100 rounded-lg hover:bg-slate-50 min-h-[44px]"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                Atualizar
                                            </button>
                                            <button
                                                onClick={handleClearFilters}
                                                className="text-xs text-red-650 hover:text-red-700 font-bold hover:bg-red-50/50 px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-1 min-h-[44px]"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                                Limpar Filtros
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Loading state */}
                                {isLoading && (
                                    <div className="space-y-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm animate-pulse flex flex-col gap-4">
                                                <div className="flex items-start gap-4">
                                                    <div className="w-16 h-16 bg-slate-200 rounded-xl" />
                                                    <div className="flex-1 space-y-3 py-1">
                                                        <div className="h-4 bg-slate-200 rounded w-1/3" />
                                                        <div className="h-3 bg-slate-100 rounded w-1/4" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Empty Search state */}
                                {!isLoading && filteredClinics.length === 0 && (
                                    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-12 text-center max-w-lg mx-auto">
                                        <div className="w-16 h-16 bg-teal-50 text-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <Search className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-900 mb-1.5">Nenhuma clínica encontrada</h3>
                                        <p className="text-sm text-slate-500 mb-6">
                                            Tente redefinir seus filtros ou buscar por outra palavra-chave.
                                        </p>
                                        <button
                                            onClick={handleClearFilters}
                                            className="px-6 py-2.5 bg-teal-900 text-white rounded-xl text-sm font-semibold hover:bg-teal-950 min-h-[44px]"
                                        >
                                            Limpar Filtros
                                        </button>
                                    </div>
                                )}

                                {/* Clinic Cards */}
                                {!isLoading && filteredClinics.length > 0 && (
                                    <div className="space-y-4">
                                        {filteredClinics.map(clinic => (
                                            <div
                                                key={clinic.id}
                                                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-300 overflow-hidden flex flex-col md:flex-row justify-between"
                                            >
                                                <div className="p-5 sm:p-6 flex-1 space-y-4">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                                                            <CheckCircle className="w-3 h-3 fill-emerald-100" />
                                                            Parceiro Oficial CliniGo
                                                        </span>
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-50 text-slate-650 border border-slate-100">
                                                            Selo Agendamento Online
                                                        </span>
                                                    </div>

                                                    <div className="flex gap-4">
                                                        {clinic.logo_url ? (
                                                            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-50 border border-slate-150/60 shrink-0 shadow-sm">
                                                                <Image
                                                                    src={clinic.logo_url}
                                                                    alt={clinic.name}
                                                                    fill
                                                                    className="object-cover"
                                                                    sizes="(max-width: 768px) 64px, 80px"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gradient-to-tr from-teal-50 to-emerald-50 text-teal-800 flex items-center justify-center text-lg font-bold shrink-0 border border-teal-100/60 shadow-inner">
                                                                {getInitials(clinic.name)}
                                                            </div>
                                                        )}

                                                        <div className="space-y-1">
                                                            <h2 className="text-lg sm:text-xl font-bold text-slate-900 hover:text-teal-900 transition-colors">
                                                                <Link href={`/${clinic.slug}/agendar`}>
                                                                    {clinic.name}
                                                                </Link>
                                                            </h2>
                                                            
                                                            <div className="flex items-center gap-1">
                                                                <div className="flex items-center">
                                                                    {[1, 2, 3, 4, 5].map((s) => (
                                                                        <Star
                                                                            key={s}
                                                                            className="w-3.5 h-3.5 fill-amber-400 text-amber-400"
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <span className="text-xs font-bold text-slate-800 ml-1">5.0</span>
                                                                <span className="text-xs text-slate-400">
                                                                    ({clinic.total_doctors > 0 ? clinic.total_doctors * 12 : 24} avaliações)
                                                                </span>
                                                            </div>

                                                            {clinic.address && (
                                                                <p className="text-xs sm:text-sm text-slate-500 flex items-start gap-1 font-medium leading-relaxed max-w-md">
                                                                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                                                    {clinic.address}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {clinic.specialties.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                                            {clinic.specialties.map(spec => (
                                                                <span
                                                                    key={spec}
                                                                    className="inline-block px-2.5 py-1 text-xs bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-teal-50 hover:text-teal-900 transition-colors"
                                                                >
                                                                    {spec}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Booking Widget simulator on Card */}
                                                <div className="bg-slate-50/70 md:w-64 border-t md:border-t-0 md:border-l border-slate-150 p-5 flex flex-col justify-between space-y-4 md:space-y-0">
                                                    <div className="space-y-3">
                                                        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                                                            <span>Próximos Horários</span>
                                                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-extrabold uppercase">
                                                                Disponível
                                                            </span>
                                                        </div>

                                                        <div className="grid grid-cols-3 gap-2">
                                                            <Link
                                                                href={`/${clinic.slug}/agendar`}
                                                                className="bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-lg p-2 text-center transition-all cursor-pointer block min-h-[44px]"
                                                            >
                                                                <div className="text-[9px] font-bold text-slate-400 uppercase">Seg</div>
                                                                <div className="text-xs font-extrabold text-slate-800 mt-0.5">08:00</div>
                                                            </Link>
                                                            <Link
                                                                href={`/${clinic.slug}/agendar`}
                                                                className="bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-lg p-2 text-center transition-all cursor-pointer block min-h-[44px]"
                                                            >
                                                                <div className="text-[9px] font-bold text-slate-400 uppercase">Ter</div>
                                                                <div className="text-xs font-extrabold text-slate-800 mt-0.5">10:30</div>
                                                            </Link>
                                                            <Link
                                                                href={`/${clinic.slug}/agendar`}
                                                                className="bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-lg p-2 text-center transition-all cursor-pointer block min-h-[44px]"
                                                            >
                                                                <div className="text-[9px] font-bold text-slate-400 uppercase">Qua</div>
                                                                <div className="text-xs font-extrabold text-slate-800 mt-0.5">14:00</div>
                                                            </Link>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Link
                                                            href={`/${clinic.slug}/agendar`}
                                                            className="flex items-center justify-center w-full h-10 rounded-xl bg-teal-850 hover:bg-teal-900 text-white text-xs font-bold transition-all shadow-sm min-h-[44px]"
                                                        >
                                                            Ver Agenda Completa
                                                        </Link>
                                                        
                                                        <div className="flex gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleCopyShareLink(clinic.slug)}
                                                                className="flex-1 flex items-center justify-center gap-1.5 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-semibold min-h-[44px]"
                                                            >
                                                                <Share2 className="w-3.5 h-3.5" />
                                                                Compartilhar
                                                            </button>
                                                            <Link
                                                                href={`/${clinic.slug}/agendar`}
                                                                className="flex-1 flex items-center justify-center gap-1 h-10 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-650 text-xs font-semibold min-h-[44px]"
                                                            >
                                                                Ver Perfil
                                                                <ExternalLink className="w-3.5 h-3.5" />
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </div>

                                            </div>
                                        ))}
                                    </div>
                                )}

                            </div>

                            {/* Right Results Sidebar */}
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4">
                                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
                                        <ThumbsUp className="w-4 h-4 text-emerald-600" />
                                        Opiniões Recentes
                                    </h3>
                                    <div className="space-y-4">
                                        {PATIENT_OPINIONS.map(opinion => (
                                            <div key={opinion.id} className="space-y-2 text-xs sm:text-sm border-b border-slate-50 last:border-0 pb-3 last:pb-0">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-800">{opinion.patient}</span>
                                                    <span className="text-[10px] text-slate-400">{opinion.date}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                                    ))}
                                                </div>
                                                <p className="text-slate-600 italic leading-relaxed">&quot;{opinion.comment}&quot;</p>
                                                <div className="text-[11px] text-slate-400">
                                                    Consulta com <span className="font-semibold text-slate-650">{opinion.doctor}</span> · <span className="text-teal-650">{opinion.clinic}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                        </div>
                    </main>
                </>
            ) : (
                /* --- PORTAL LANDING VIEW (DOCTORALIA STYLE) --- */
                <>
                    {/* POPULAR SPECIALTIES GRID */}
                    <section className="bg-white py-12 border-b border-slate-200">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between mb-8 pb-3 border-b border-slate-100">
                                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                                    Especialidades mais populares
                                </h2>
                                <button
                                    onClick={() => setExpandLandingSpecialties(!expandLandingSpecialties)}
                                    className="text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                                >
                                    {expandLandingSpecialties ? 'Recolher' : 'Todos'}
                                    <ChevronDown className={`w-4 h-4 transition-transform ${expandLandingSpecialties ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 items-start">
                                {landingSpecialtiesList.map((spec) => (
                                    <div key={spec.name} className="space-y-2">
                                        <button
                                            onClick={() => handleGridItemClick(spec.name)}
                                            className="font-bold text-sm text-slate-900 hover:text-teal-900 text-left hover:underline block"
                                        >
                                            {spec.name}
                                        </button>
                                        <div className="space-y-1.5">
                                            {spec.cities.map((city) => (
                                                <button
                                                    key={city}
                                                    onClick={() => handleGridItemClick(spec.name, city)}
                                                    className="text-xs text-slate-500 hover:text-teal-700 block hover:underline text-left whitespace-nowrap"
                                                >
                                                    {city}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* POPULAR SERVICES GRID */}
                    <section className="bg-white py-12 border-b border-slate-200">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="flex items-center justify-between mb-8 pb-3 border-b border-slate-100">
                                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                                    Serviços mais populares
                                </h2>
                                <button
                                    onClick={() => setExpandLandingServices(!expandLandingServices)}
                                    className="text-sm font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                                >
                                    {expandLandingServices ? 'Recolher' : 'Todos'}
                                    <ChevronDown className={`w-4 h-4 transition-transform ${expandLandingServices ? 'rotate-180' : ''}`} />
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 items-start">
                                {landingServicesList.map((service) => (
                                    <div key={service.name} className="space-y-2">
                                        <button
                                            onClick={() => handleGridItemClick(service.name)}
                                            className="font-bold text-sm text-slate-900 hover:text-teal-900 text-left hover:underline block"
                                        >
                                            {service.name}
                                        </button>
                                        <div className="space-y-1.5">
                                            {service.cities.map((city) => (
                                                <button
                                                    key={city}
                                                    onClick={() => handleGridItemClick(service.name, city)}
                                                    className="text-xs text-slate-500 hover:text-teal-700 block hover:underline text-left"
                                                >
                                                    {city}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* POPULAR INSURANCES GRID */}
                    <section className="bg-white py-12 border-b border-slate-200">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="mb-8 pb-3 border-b border-slate-100">
                                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                                    Planos de saúde mais populares
                                </h2>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 items-start">
                                {LANDING_INSURANCES.map((ins) => (
                                    <div key={ins.name} className="space-y-2">
                                        <h3 className="font-extrabold text-slate-900 text-sm">{ins.name}</h3>
                                        <div className="space-y-1.5">
                                            {ins.items.map((item) => (
                                                <button
                                                    key={item}
                                                    onClick={() => {
                                                        setSelectedInsurance(ins.name)
                                                        setSearchQuery(item)
                                                        showToast(`Filtro: ${ins.name} - ${item}`)
                                                        window.scrollTo({ top: 0, behavior: 'smooth' })
                                                    }}
                                                    className="text-xs text-slate-500 hover:text-teal-700 block hover:underline text-left"
                                                >
                                                    {item}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* HOW IT WORKS BENEFITS GRID */}
                    <section className="bg-slate-50 border-b border-slate-200 py-12 sm:py-16">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                                <div className="space-y-3 text-center sm:text-left">
                                    <div className="w-12 h-12 bg-white text-teal-700 rounded-2xl flex items-center justify-center mx-auto sm:mx-0 border border-slate-200 shadow-sm">
                                        <Search className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-base">Encontre especialistas</h3>
                                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                                        Busque por profissionais de saúde em sua região. Filtre por planos de saúde ou tratamentos.
                                    </p>
                                </div>
                                <div className="space-y-3 text-center sm:text-left">
                                    <div className="w-12 h-12 bg-white text-teal-700 rounded-2xl flex items-center justify-center mx-auto sm:mx-0 border border-slate-200 shadow-sm">
                                        <Calendar className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-base">Marque consultas</h3>
                                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                                        Escolha o profissional, dia e horário que desejar e agende sua consulta online em minutos.
                                    </p>
                                </div>
                                <div className="space-y-3 text-center sm:text-left">
                                    <div className="w-12 h-12 bg-white text-teal-700 rounded-2xl flex items-center justify-center mx-auto sm:mx-0 border border-slate-200 shadow-sm">
                                        <Bell className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-base">Receba lembretes</h3>
                                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                                        Confirmamos tudo via e-mail e enviamos lembretes de acompanhamento via WhatsApp.
                                    </p>
                                </div>
                                <div className="space-y-3 text-center sm:text-left">
                                    <div className="w-12 h-12 bg-white text-teal-700 rounded-2xl flex items-center justify-center mx-auto sm:mx-0 border border-slate-200 shadow-sm">
                                        <ThumbsUp className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-base">Avalie o serviço</h3>
                                    <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                                        Após a consulta, você pode deixar uma avaliação do profissional para orientar outros pacientes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* TWO COLUMN ROW: BLOG & OPINIONS */}
                    <section className="bg-white py-12 border-b border-slate-200">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                
                                {/* Blog Section */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-extrabold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                                        <BookOpen className="w-5 h-5 text-teal-700" />
                                        Blog para pacientes
                                    </h3>
                                    <div className="space-y-6">
                                        {BLOG_ARTICLES.map(article => (
                                            <div key={article.id} className="space-y-2 group cursor-pointer">
                                                <div className="flex items-center justify-between text-xs text-slate-400">
                                                    <span className="bg-teal-50 text-teal-800 font-bold uppercase px-2 py-0.5 rounded">
                                                        {article.category}
                                                    </span>
                                                    <span>{article.readTime}</span>
                                                </div>
                                                <h4 className="font-bold text-base text-slate-900 group-hover:text-teal-900 transition-colors">
                                                    {article.title}
                                                </h4>
                                                <p className="text-xs sm:text-sm text-slate-550 leading-relaxed">
                                                    {article.excerpt}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Opinions Section */}
                                <div className="space-y-6">
                                    <h3 className="text-lg font-extrabold text-slate-900 pb-3 border-b border-slate-100 flex items-center gap-2">
                                        <ThumbsUp className="w-5 h-5 text-emerald-600" />
                                        Opiniões mais recentes
                                    </h3>
                                    <div className="space-y-5">
                                        {PATIENT_OPINIONS.map(opinion => (
                                            <div key={opinion.id} className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-150 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-slate-800 text-sm">{opinion.patient}</span>
                                                    <span className="text-xs text-slate-400">{opinion.date}</span>
                                                </div>
                                                <div className="flex items-center">
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                                    ))}
                                                </div>
                                                <p className="text-xs sm:text-sm text-slate-650 italic leading-relaxed">
                                                    &quot;{opinion.comment}&quot;
                                                </p>
                                                <div className="text-xs text-slate-400">
                                                    Consulta com <span className="font-bold text-slate-700">{opinion.doctor}</span> · <span className="text-teal-800 font-medium">{opinion.clinic}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </section>

                    {/* HORIZONTAL CAROUSEL: NEW PROFILES */}
                    <section className="bg-slate-50 py-12 border-b border-slate-200">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="mb-8 pb-3 border-b border-slate-150 flex items-center justify-between">
                                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                                    Novos perfis no CliniGo
                                </h2>
                            </div>

                            {/* Horizontal scroll container with touch drag styling */}
                            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
                                {CAROUSEL_DOCTORS.map((doc) => (
                                    <div
                                        key={doc.name}
                                        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm shrink-0 w-64 hover:shadow-md transition-shadow flex flex-col justify-between"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-50 to-emerald-50 text-teal-850 flex items-center justify-center font-bold text-base border border-teal-100 shadow-inner">
                                                {doc.initials}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-slate-900 text-sm truncate">{doc.name}</h4>
                                                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">{doc.role}</p>
                                                <p className="text-[11px] text-slate-400 mt-0.5">{doc.local}</p>
                                            </div>
                                        </div>
                                        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                            <span className="text-slate-400">Agenda online ativa</span>
                                            <button
                                                onClick={() => handleGridItemClick(doc.role)}
                                                className="text-teal-850 font-bold hover:text-teal-950 flex items-center gap-0.5"
                                            >
                                                Ver perfil
                                                <ChevronRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* PROMOTIONAL BANNERS GRID */}
                    <section className="bg-white py-12 sm:py-16">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                
                                {/* Banner 1: CliniGo Pro */}
                                <div className="bg-teal-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between items-start space-y-6 relative overflow-hidden shadow-xl shadow-teal-900/10">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                                    <div className="space-y-3">
                                        <span className="inline-block px-3 py-1 bg-white/10 text-teal-300 text-xs font-extrabold rounded-full uppercase tracking-wider border border-white/5">
                                            Para Clínicas e Profissionais
                                        </span>
                                        <h3 className="text-2xl font-extrabold">CliniGo Pro</h3>
                                        <p className="text-xs sm:text-sm text-teal-100 leading-relaxed">
                                            Adicione sua clínica no nosso marketplace, configure agendas ilimitadas e multiplique seus agendamentos particulares 24 horas por dia.
                                        </p>
                                    </div>
                                    <Link
                                        href="/trial"
                                        className="inline-flex items-center justify-center px-5 py-2.5 bg-white text-teal-900 hover:bg-teal-50 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md min-h-[44px]"
                                    >
                                        Saiba Mais
                                    </Link>
                                </div>

                                {/* Banner 2: Noa Notes */}
                                <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 sm:p-8 flex flex-col justify-between items-start space-y-6 relative overflow-hidden shadow-xl shadow-rose-100/10">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-200/20 rounded-full blur-2xl pointer-events-none" />
                                    <div className="space-y-3 text-slate-800">
                                        <span className="inline-block px-3 py-1 bg-rose-150 text-rose-800 text-xs font-extrabold rounded-full uppercase tracking-wider border border-rose-200/30">
                                            Inteligência Artificial
                                        </span>
                                        <h3 className="text-2xl font-extrabold text-slate-900">Noa Notes por CliniGo</h3>
                                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                                            Transcreva suas sessões de terapia ou consultas em segundos com IA. Geração automática de evoluções SOAP estruturadas de forma rápida e segura.
                                        </p>
                                    </div>
                                    <Link
                                        href="/trial"
                                        className="inline-flex items-center justify-center px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all shadow-md min-h-[44px]"
                                    >
                                        Experimentar Grátis
                                    </Link>
                                </div>

                            </div>
                        </div>
                    </section>
                </>
            )}

            {/* COMPREHENSIVE FOOTER */}
            <footer className="bg-white text-slate-500 border-t border-slate-200 py-12 sm:py-16">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        
                        {/* Column 1 */}
                        <div className="space-y-4">
                            <h4 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider">Serviços</h4>
                            <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
                                <li><button onClick={() => handleGridItemClick('Psicólogo')} className="hover:text-emerald-700 transition-colors text-left">Psicólogo</button></li>
                                <li><button onClick={() => handleGridItemClick('Psiquiatra')} className="hover:text-emerald-700 transition-colors text-left">Psiquiatra</button></li>
                                <li><button onClick={() => handleGridItemClick('Fonoaudiólogo')} className="hover:text-emerald-700 transition-colors text-left">Fonoaudiólogo</button></li>
                                <li><button onClick={() => handleGridItemClick('Terapeuta Ocupacional')} className="hover:text-emerald-700 transition-colors text-left">Terapeutas Ocupacionais</button></li>
                            </ul>
                        </div>

                        {/* Column 2 */}
                        <div className="space-y-4">
                            <h4 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider">Pacientes</h4>
                            <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
                                <li><Link href="/login" className="hover:text-emerald-700 transition-colors">Portal do Paciente</Link></li>
                                <li><button onClick={handleClearFilters} className="hover:text-emerald-700 transition-colors text-left">Pesquisa Geral</button></li>
                                <li><Link href="/sobre" className="hover:text-emerald-700 transition-colors">Segurança de Dados</Link></li>
                                <li><Link href="/help" className="hover:text-emerald-700 transition-colors">Central de Ajuda</Link></li>
                            </ul>
                        </div>

                        {/* Column 3 */}
                        <div className="space-y-4">
                            <h4 className="text-slate-900 font-extrabold text-xs uppercase tracking-wider">Para Clínicas</h4>
                            <ul className="space-y-2.5 text-xs sm:text-sm font-medium">
                                <li><Link href="/trial" className="hover:text-emerald-700 transition-colors">Planos de Gestão</Link></li>
                                <li><Link href="/partners" className="hover:text-emerald-700 transition-colors">Você atua na saúde?</Link></li>
                                <li><Link href="/termos" className="hover:text-emerald-700 transition-colors">Termos de Uso</Link></li>
                            </ul>
                        </div>

                        {/* Column 4 */}
                        <div className="space-y-4">
                            <Image
                                src="/logo-clinigo.png"
                                alt="CliniGo"
                                width={120}
                                height={32}
                                className="h-7 w-auto"
                                style={{ width: 'auto', height: 'auto' }}
                            />
                            <p className="text-[11px] sm:text-xs leading-relaxed text-slate-400 font-medium">
                                CliniGo Tecnologia e Gestão de Saúde Ltda.<br />
                                CNPJ: 45.210.669/0001-02<br />
                                São Paulo, Brasil.
                            </p>
                        </div>

                    </div>

                    <div className="h-px bg-slate-150 my-8 sm:my-10" />

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] sm:text-xs text-slate-400 font-medium">
                        <p>© {new Date().getFullYear()} CliniGo. Todos os direitos reservados. Cuidar de quem precisa.</p>
                        <div className="flex gap-4">
                            <span className="hover:underline cursor-pointer">Brasil</span>
                            <span className="hover:underline cursor-pointer">México</span>
                            <span className="hover:underline cursor-pointer">Colômbia</span>
                            <span className="hover:underline cursor-pointer">Espanha</span>
                        </div>
                    </div>
                </div>
            </footer>

        </div>
    )
}
