import { redirect } from 'next/navigation'

interface PageProps {
    params: Promise<{ clinic_slug: string }>
}

export default async function ClinicPage({ params }: PageProps) {
    const { clinic_slug } = await params

    redirect(`/${clinic_slug}/agendar`)
}

