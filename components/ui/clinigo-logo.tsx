'use client'

import { cn } from '@/lib/utils'

interface CliniGoLogoProps {
    /** 'light' = para fundos claros (Clini preto), 'dark' = para fundos escuros (Clini branco) */
    variant?: 'light' | 'dark'
    /** Tamanho em pixels para altura */
    size?: number
    /** Classes CSS adicionais */
    className?: string
}

/**
 * Logo CliniGo em SVG
 * - variant="dark" → Clini branco, Go verde (para páginas escuras)
 * - variant="light" → Clini preto, Go verde (para páginas claras)
 * - SEM fundo verde, totalmente transparente
 */
export function CliniGoLogo({
    variant = 'dark',
    size = 40,
    className
}: CliniGoLogoProps) {
    const cliniColor = variant === 'dark' ? '#FFFFFF' : '#0D3B2D'
    const goColor = '#10B981' // Emerald sempre
    const iconColor = '#10B981'

    const width = size * 4 // Proporção 4:1
    const height = size

    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 160 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('flex-shrink-0', className)}
        >
            {/* Ícone - Cruz médica estilizada */}
            <g>
                {/* Círculo externo */}
                <circle cx="20" cy="20" r="16" stroke={iconColor} strokeWidth="2" fill="none" />

                {/* Cruz */}
                <path
                    d="M20 10V30M10 20H30"
                    stroke={iconColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                />

                {/* Check pequeno */}
                <path
                    d="M14 20L18 24L26 16"
                    stroke={iconColor}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
            </g>

            {/* Texto "Clini" */}
            <text
                x="44"
                y="27"
                fontSize="22"
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
                fill={cliniColor}
            >
                Clini
            </text>

            {/* Texto "Go" */}
            <text
                x="102"
                y="27"
                fontSize="22"
                fontWeight="700"
                fontFamily="system-ui, -apple-system, sans-serif"
                fill={goColor}
            >
                Go
            </text>
        </svg>
    )
}

/**
 * Logo apenas texto (sem ícone) para espaços menores
 */
export function CliniGoLogoText({
    variant = 'dark',
    size = 24,
    className
}: CliniGoLogoProps) {
    const cliniColor = variant === 'dark' ? '#FFFFFF' : '#0D3B2D'
    const goColor = '#10B981'

    return (
        <span className={cn('font-bold flex-shrink-0', className)} style={{ fontSize: size }}>
            <span style={{ color: cliniColor }}>Clini</span>
            <span style={{ color: goColor }}>Go</span>
        </span>
    )
}

export default CliniGoLogo
