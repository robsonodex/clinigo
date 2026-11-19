import { Instrument_Serif, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'

const plusJakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-jakarta',
    display: 'swap',
})

const instrumentSerif = Instrument_Serif({
    subsets: ['latin'],
    weight: '400',
    style: ['normal', 'italic'],
    variable: '--font-instrument',
    display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '600'],
    variable: '--font-mono-tech',
    display: 'swap',
})

/** Variaveis de fonte da landing (home oficial e rotas de previa). */
export const landingFontVariables = `${plusJakarta.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable}`

