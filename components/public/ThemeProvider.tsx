'use client'

import { createContext, useContext, ReactNode, useMemo } from 'react'
import {
    ClinicTheme,
    DEFAULT_THEME,
    mergeWithDefaultTheme,
    WhiteLabelTier,
    TIER_FEATURES,
    TierFeatures,
    shouldShowBranding
} from '@/types/clinic-theme'

// =============================================================================
// Context Type
// =============================================================================

interface ThemeContextValue {
    theme: ClinicTheme
    tier: WhiteLabelTier
    tierFeatures: TierFeatures
    showBranding: boolean
    cssVariables: Record<string, string>
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// =============================================================================
// CSS Variables Generator
// =============================================================================

function generateCSSVariables(theme: ClinicTheme): Record<string, string> {
    return {
        '--theme-primary': theme.colors.primary,
        '--theme-secondary': theme.colors.secondary,
        '--theme-accent': theme.colors.accent,
        '--theme-background': theme.colors.background,
        '--theme-text': theme.colors.text,
        '--theme-muted': theme.colors.muted,
        '--theme-font-family': theme.typography.fontFamily,
        '--theme-heading-weight': String(theme.typography.headingWeight),
    }
}

// =============================================================================
// Google Fonts URL Generator
// =============================================================================

const GOOGLE_FONTS_URLS: Record<string, string> = {
    Inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
    Poppins: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap',
    Montserrat: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&display=swap',
    Roboto: 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
    Outfit: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap',
}

// =============================================================================
// Provider Props
// =============================================================================

interface ThemeProviderProps {
    children: ReactNode
    theme?: Partial<ClinicTheme> | null
    planType: string
}

// =============================================================================
// Theme Provider Component
// =============================================================================

export function ThemeProvider({ children, theme: partialTheme, planType }: ThemeProviderProps) {
    const value = useMemo(() => {
        // Merge with defaults
        const theme = partialTheme ? mergeWithDefaultTheme(partialTheme) : DEFAULT_THEME

        // Determine tier
        const tierMap: Record<string, WhiteLabelTier> = {
            STARTER: 'default',
            BASIC: 'default',
            PROFESSIONAL: 'premium',
            ENTERPRISE: 'enterprise',
            NETWORK: 'enterprise',
        }
        const tier = tierMap[planType] || 'default'

        // Get tier features
        const tierFeatures = TIER_FEATURES[tier]

        // Determine if branding should show
        const showBranding = shouldShowBranding(planType, theme.display.show_clinigo_branding)

        // Generate CSS variables
        const cssVariables = generateCSSVariables(theme)

        return {
            theme,
            tier,
            tierFeatures,
            showBranding,
            cssVariables,
        }
    }, [partialTheme, planType])

    const fontUrl = GOOGLE_FONTS_URLS[value.theme.typography.fontFamily]

    return (
        <ThemeContext.Provider value={value}>
            {/* Inject Google Font */}
            {fontUrl && (
                <link rel="stylesheet" href={fontUrl} />
            )}

            {/* Inject CSS Variables */}
            <style dangerouslySetInnerHTML={{
                __html: `
          :root {
            ${Object.entries(value.cssVariables)
                        .map(([key, val]) => `${key}: ${val};`)
                        .join('\n            ')}
          }
          
          /* Theme utility classes */
          .text-theme-primary { color: var(--theme-primary); }
          .bg-theme-primary { background-color: var(--theme-primary); }
          .border-theme-primary { border-color: var(--theme-primary); }
          
          .text-theme-secondary { color: var(--theme-secondary); }
          .bg-theme-secondary { background-color: var(--theme-secondary); }
          
          .text-theme-accent { color: var(--theme-accent); }
          .bg-theme-accent { background-color: var(--theme-accent); }
          
          .bg-theme-background { background-color: var(--theme-background); }
          .text-theme-text { color: var(--theme-text); }
          .text-theme-muted { color: var(--theme-muted); }
          
          .font-theme { font-family: var(--theme-font-family), system-ui, sans-serif; }
          .font-theme-heading { 
            font-family: var(--theme-font-family), system-ui, sans-serif;
            font-weight: var(--theme-heading-weight);
          }
          
          /* Primary button style */
          .btn-theme-primary {
            background-color: var(--theme-primary);
            color: white;
            transition: all 0.2s ease;
          }
          .btn-theme-primary:hover {
            filter: brightness(0.9);
          }
          
          /* Accent button style */
          .btn-theme-accent {
            background-color: var(--theme-accent);
            color: white;
            transition: all 0.2s ease;
          }
          .btn-theme-accent:hover {
            filter: brightness(0.9);
          }
        `
            }} />

            {/* Inject custom CSS if enterprise tier */}
            {value.tierFeatures.canUseCustomCSS && value.theme.advanced?.custom_css && (
                <style dangerouslySetInnerHTML={{ __html: value.theme.advanced.custom_css }} />
            )}

            {/* Inject custom head HTML if enterprise tier */}
            {value.tierFeatures.canUseCustomCSS && value.theme.advanced?.custom_head_html && (
                <div dangerouslySetInnerHTML={{ __html: value.theme.advanced.custom_head_html }} />
            )}

            {children}
        </ThemeContext.Provider>
    )
}

// =============================================================================
// Hook
// =============================================================================

export function useClinicTheme() {
    const context = useContext(ThemeContext)
    if (!context) {
        throw new Error('useClinicTheme must be used within a ThemeProvider')
    }
    return context
}

// =============================================================================
// Utility Hook: Get specific color
// =============================================================================

export function useThemeColor(colorKey: keyof ClinicTheme['colors']) {
    const { theme } = useClinicTheme()
    return theme.colors[colorKey]
}

// =============================================================================
// Utility Hook: Check if section should be displayed
// =============================================================================

export function useDisplaySetting(settingKey: keyof ClinicTheme['display']) {
    const { theme } = useClinicTheme()
    return theme.display[settingKey]
}
