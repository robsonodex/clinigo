/**
 * Schema.org structured data for clinic pages
 * Improves SEO and rich snippets in search results
 */

import { ClinicTheme } from '@/types/clinic-theme'

// =============================================================================
// Types
// =============================================================================

interface ClinicSchemaData {
    name: string
    slug: string
    address?: string | null
    phone?: string | null
    email?: string | null
    logo_url?: string | null
    rating?: number
    totalReviews?: number
    priceRange?: string
    openingHours?: Record<string, string> | null
    theme?: Partial<ClinicTheme> | null
}

interface DoctorSchemaData {
    name: string
    specialty: string
    crm: string
    photo_url?: string | null
    clinicName: string
}

// =============================================================================
// Schema Generators
// =============================================================================

/**
 * Generate MedicalClinic schema
 */
export function generateClinicSchema(clinic: ClinicSchemaData): object {
    const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'MedicalClinic',
        name: clinic.name,
        url: `https://clinigo.app/${clinic.slug}`,
    }

    if (clinic.address) {
        schema.address = {
            '@type': 'PostalAddress',
            streetAddress: clinic.address,
            addressCountry: 'BR',
        }
    }

    if (clinic.phone) {
        schema.telephone = clinic.phone
    }

    if (clinic.email) {
        schema.email = clinic.email
    }

    if (clinic.logo_url) {
        schema.image = clinic.logo_url
        schema.logo = clinic.logo_url
    }

    if (clinic.rating && clinic.totalReviews) {
        schema.aggregateRating = {
            '@type': 'AggregateRating',
            ratingValue: clinic.rating.toFixed(1),
            reviewCount: clinic.totalReviews,
            bestRating: '5',
            worstRating: '1',
        }
    }

    if (clinic.priceRange) {
        schema.priceRange = clinic.priceRange
    }

    // Opening hours
    if (clinic.openingHours && typeof clinic.openingHours === 'object' && Object.keys(clinic.openingHours).length > 0) {
        const hours = Object.entries(clinic.openingHours)
            .filter(([, time]) => typeof time === 'string' && time.length > 0)
            .map(([day, time]) => {
                const dayMap: Record<string, string> = {
                    'Segunda': 'Monday',
                    'Terça': 'Tuesday',
                    'Quarta': 'Wednesday',
                    'Quinta': 'Thursday',
                    'Sexta': 'Friday',
                    'Sábado': 'Saturday',
                    'Domingo': 'Sunday',
                }
                const timeStr = String(time)
                return {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: dayMap[day] || day,
                    opens: timeStr.split('-')[0]?.trim() || '',
                    closes: timeStr.split('-')[1]?.trim() || '',
                }
            })
        if (hours.length > 0) {
            schema.openingHoursSpecification = hours
        }
    }

    // Service available
    schema.availableService = {
        '@type': 'MedicalService',
        name: 'Consulta Médica',
        description: 'Agendamento de consultas médicas online e presenciais',
    }

    return schema
}

/**
 * Generate Physician schema for doctors
 */
export function generateDoctorSchema(doctor: DoctorSchemaData): object {
    const schema: Record<string, unknown> = {
        '@context': 'https://schema.org',
        '@type': 'Physician',
        name: doctor.name,
        medicalSpecialty: doctor.specialty,
        identifier: {
            '@type': 'PropertyValue',
            name: 'CRM',
            value: doctor.crm,
        },
        worksFor: {
            '@type': 'MedicalClinic',
            name: doctor.clinicName,
        },
    }

    if (doctor.photo_url) {
        schema.image = doctor.photo_url
    }

    return schema
}

/**
 * Generate BreadcrumbList schema
 */
export function generateBreadcrumbSchema(items: { name: string; url: string }[]): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    }
}

/**
 * Generate LocalBusiness schema with medical focus
 */
export function generateLocalBusinessSchema(clinic: ClinicSchemaData): object {
    return {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        '@id': `https://clinigo.app/${clinic.slug}`,
        name: clinic.name,
        image: clinic.logo_url,
        telephone: clinic.phone,
        email: clinic.email,
        address: clinic.address ? {
            '@type': 'PostalAddress',
            streetAddress: clinic.address,
            addressCountry: 'BR',
        } : undefined,
        aggregateRating: clinic.rating ? {
            '@type': 'AggregateRating',
            ratingValue: clinic.rating,
            reviewCount: clinic.totalReviews,
        } : undefined,
    }
}

// =============================================================================
// React Component for injecting schemas
// =============================================================================

interface SchemaScriptProps {
    schema: object | object[]
}

export function SchemaScript({ schema }: SchemaScriptProps) {
    const schemas = Array.isArray(schema) ? schema : [schema]

    return (
        <>
            {schemas.map((s, i) => (
                <script
                    key={i}
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
                />
            ))}
        </>
    )
}
