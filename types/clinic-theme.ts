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
    colors: ThemeColors
    typography: ThemeTypography
    hero: ThemeHero
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
    const display = filterEmptyValues(partialTheme?.display)
    const seo = filterEmptyValues(partialTheme?.seo)
    const advanced = filterEmptyValues(partialTheme?.advanced)

    return {
        colors: { ...DEFAULT_THEME.colors, ...colors },
        typography: { ...DEFAULT_THEME.typography, ...typography },
        hero: { ...DEFAULT_THEME.hero, ...hero },
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
