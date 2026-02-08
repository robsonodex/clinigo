/**
 * Clinic Theme Types
 * Defines the structure for clinic public page customization
 */

// =============================================================================
// Color Palette Types
// =============================================================================

export interface ThemeColors {
    /** Primary brand color (buttons, links, accents) */
    primary: string
    /** Secondary brand color (complementary elements) */
    secondary: string
    /** Accent color (CTAs, highlights) */
    accent: string
    /** Background color */
    background: string
    /** Main text color */
    text: string
    /** Muted/secondary text color */
    muted: string
}

// =============================================================================
// Typography Types
// =============================================================================

export type FontFamily = 'Inter' | 'Poppins' | 'Montserrat' | 'Roboto' | 'Outfit'
export type HeadingWeight = 600 | 700 | 800

export interface ThemeTypography {
    fontFamily: FontFamily
    headingWeight: HeadingWeight
}

// =============================================================================
// Hero Section Types
// =============================================================================

export interface ThemeHero {
    /** Main headline */
    title: string | null
    /** Subtitle/tagline */
    subtitle: string | null
    /** Video URL for background (autoplay muted loop) */
    video_url?: string | null
    /** Background image URL (fallback if no video) */
    background_image_url?: string | null
    /** CTA button text */
    cta_text: string
}

// =============================================================================
// Display Settings Types
// =============================================================================

export interface ThemeDisplay {
    /** Show consultation prices on doctor cards */
    show_prices: boolean
    /** Show reviews section */
    show_reviews: boolean
    /** Show doctor photos or use placeholder */
    show_doctor_photos: boolean
    /** Show specialties grid section */
    show_specialties_grid: boolean
    /** Show location map section */
    show_map: boolean
    /** Show FAQ section */
    show_faq: boolean
    /** Show "Powered by CliniGo" in footer (auto-disabled on premium+) */
    show_clinigo_branding: boolean
}

// =============================================================================
// Content/Text Customization Types
// =============================================================================

export interface ThemeContent {
    // Hero Section
    /** Small tag above title (e.g., "Saúde Digital") */
    hero_tag: string | null

    // Feature Cards (the 4 feature cards on homepage)
    feature1_title: string | null
    feature1_description: string | null
    feature2_title: string | null
    feature2_description: string | null
    feature3_title: string | null
    feature3_description: string | null
    feature4_title: string | null
    feature4_description: string | null

    // Stats Labels
    stat1_label: string | null
    stat2_label: string | null
    stat3_label: string | null

    // Section Titles
    specialties_title: string | null
    specialties_subtitle: string | null
    doctors_title: string | null
    doctors_subtitle: string | null
    about_title: string | null
    contact_title: string | null
    contact_subtitle: string | null
}

// =============================================================================
// SEO Settings Types
// =============================================================================

export interface ThemeSEO {
    /** Custom page title (defaults to clinic name) */
    meta_title: string | null
    /** Meta description for search engines */
    meta_description: string | null
    /** SEO keywords */
    keywords: string[]
    /** Open Graph image URL */
    og_image_url?: string | null
}

// =============================================================================
// Page Template Types
// =============================================================================

export type PageTemplate = 'glassmorphism' | 'swiss-minimal' | 'aurora-neon' | 'classic-medical' | 'modern-minimal' | 'corporate-healthcare' | 'swiss-clean'

export const PAGE_TEMPLATES: { id: PageTemplate; name: string; description: string }[] = [
    {
        id: 'classic-medical',
        name: 'Clássico Médico',
        description: 'Layout tradicional de clínica, fundo branco, hero centrado, grid de serviços'
    },
    {
        id: 'modern-minimal',
        name: 'Moderno Minimal',
        description: 'Muito espaço em branco, tipografia grande, layout split lateral'
    },
    {
        id: 'corporate-healthcare',
        name: 'Corporativo Saúde',
        description: 'Visual institucional com header navy, estruturado e profissional'
    },
    {
        id: 'swiss-clean',
        name: 'Swiss Clean',
        description: 'Design suíço com grid rigoroso, tipografia pesada, serviços numerados'
    },
    {
        id: 'glassmorphism',
        name: 'Glassmorphism',
        description: 'Design escuro premium com efeitos de vidro e gradientes animados'
    },
    {
        id: 'swiss-minimal',
        name: 'Swiss Minimal',
        description: 'Design editorial minimalista com tipografia bold e grid rígido'
    },
    {
        id: 'aurora-neon',
        name: 'Aurora Neon',
        description: 'Design futurista com aurora boreal animada e gradientes neon'
    }
]

// =============================================================================
// Advanced Customization Types (Enterprise)
// =============================================================================

export interface ThemeAdvanced {
    /** Custom CSS to inject */
    custom_css?: string | null
    /** Custom HTML to inject in <head> */
    custom_head_html?: string | null
}

// =============================================================================
// Complete Theme Interface
// =============================================================================

export interface ClinicTheme {
    /** Selected page template */
    template: PageTemplate
    colors: ThemeColors
    typography: ThemeTypography
    hero: ThemeHero
    content: ThemeContent
    display: ThemeDisplay
    seo: ThemeSEO
    advanced?: ThemeAdvanced
}

// =============================================================================
// White-Label Tiers
// =============================================================================

export type WhiteLabelTier = 'default' | 'premium' | 'enterprise'

export interface PublicPageSettings {
    /** Is the public page enabled */
    enabled: boolean
    /** Custom domain (Enterprise only) */
    custom_domain: string | null
    /** White-label tier based on plan */
    white_label_tier: WhiteLabelTier
    /** When the page was first published */
    published_at: string | null
}

// =============================================================================
// Plan to Tier Mapping
// =============================================================================

export const PLAN_TO_TIER: Record<string, WhiteLabelTier> = {
    STARTER: 'default',
    BASIC: 'default',
    PROFESSIONAL: 'premium',
    ENTERPRISE: 'enterprise',
    NETWORK: 'enterprise',
}

// =============================================================================
// Tier Feature Flags
// =============================================================================

export interface TierFeatures {
    /** Can remove CliniGo branding */
    canRemoveBranding: boolean
    /** Can use custom CSS */
    canUseCustomCSS: boolean
    /** Can use custom domain */
    canUseCustomDomain: boolean
    /** Can use advanced SEO */
    canUseAdvancedSEO: boolean
    /** Can upload custom fonts */
    canUseCustomFonts: boolean
}

export const TIER_FEATURES: Record<WhiteLabelTier, TierFeatures> = {
    default: {
        canRemoveBranding: false,
        canUseCustomCSS: false,
        canUseCustomDomain: false,
        canUseAdvancedSEO: false,
        canUseCustomFonts: false,
    },
    premium: {
        canRemoveBranding: true,
        canUseCustomCSS: true,
        canUseCustomDomain: false,
        canUseAdvancedSEO: true,
        canUseCustomFonts: true,
    },
    enterprise: {
        canRemoveBranding: true,
        canUseCustomCSS: true,
        canUseCustomDomain: true,
        canUseAdvancedSEO: true,
        canUseCustomFonts: true,
    },
}

// =============================================================================
// Default Theme
// =============================================================================

export const DEFAULT_THEME: ClinicTheme = {
    template: 'glassmorphism',
    colors: {
        primary: '#0EA5E9',
        secondary: '#10B981',
        accent: '#F59E0B',
        background: '#FFFFFF',
        text: '#1F2937',
        muted: '#6B7280',
    },
    typography: {
        fontFamily: 'Inter',
        headingWeight: 700,
    },
    hero: {
        title: null,
        subtitle: null,
        video_url: null,
        background_image_url: null,
        cta_text: 'Agendar Consulta',
    },
    content: {
        hero_tag: null,
        feature1_title: null,
        feature1_description: null,
        feature2_title: null,
        feature2_description: null,
        feature3_title: null,
        feature3_description: null,
        feature4_title: null,
        feature4_description: null,
        stat1_label: null,
        stat2_label: null,
        stat3_label: null,
        specialties_title: null,
        specialties_subtitle: null,
        doctors_title: null,
        doctors_subtitle: null,
        about_title: null,
        contact_title: null,
        contact_subtitle: null,
    },
    display: {
        show_prices: false,
        show_reviews: true,
        show_doctor_photos: true,
        show_specialties_grid: true,
        show_map: true,
        show_faq: true,
        show_clinigo_branding: true,
    },
    seo: {
        meta_title: null,
        meta_description: null,
        keywords: [],
        og_image_url: null,
    },
    advanced: {
        custom_css: null,
        custom_head_html: null,
    },
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to filter out empty values from an object
 */
function filterEmptyValues<T>(obj: T | undefined | null): Partial<T> {
    if (!obj || typeof obj !== 'object') return {} as Partial<T>

    const filtered: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        // Skip undefined, null, and empty objects
        if (value === undefined || value === null) continue
        if (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0) continue
        filtered[key] = value
    }
    return filtered as Partial<T>
}

/**
 * Merge partial theme with defaults
 * Properly handles undefined, null, and empty object values
 */
export function mergeWithDefaultTheme(partialTheme: Partial<ClinicTheme>): ClinicTheme {
    const colors = filterEmptyValues(partialTheme?.colors)
    const typography = filterEmptyValues(partialTheme?.typography)
    const hero = filterEmptyValues(partialTheme?.hero)
    const content = filterEmptyValues(partialTheme?.content)
    const display = filterEmptyValues(partialTheme?.display)
    const seo = filterEmptyValues(partialTheme?.seo)
    const advanced = filterEmptyValues(partialTheme?.advanced)

    return {
        template: partialTheme?.template || DEFAULT_THEME.template,
        colors: { ...DEFAULT_THEME.colors, ...colors },
        typography: { ...DEFAULT_THEME.typography, ...typography },
        hero: { ...DEFAULT_THEME.hero, ...hero },
        content: { ...DEFAULT_THEME.content, ...content },
        display: { ...DEFAULT_THEME.display, ...display },
        seo: { ...DEFAULT_THEME.seo, ...seo },
        advanced: { ...DEFAULT_THEME.advanced, ...advanced },
    }
}

/**
 * Get tier features for a plan type
 */
export function getTierFeatures(planType: string): TierFeatures {
    const tier = PLAN_TO_TIER[planType] || 'default'
    return TIER_FEATURES[tier]
}

/**
 * Check if branding should be shown
 */
export function shouldShowBranding(planType: string, displaySetting: boolean): boolean {
    const features = getTierFeatures(planType)
    // If user can remove branding and has it disabled, don't show
    if (features.canRemoveBranding && !displaySetting) {
        return false
    }
    // Default tier always shows branding
    return true
}
