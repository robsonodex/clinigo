import PageSkeleton from '@/components/ui/page-skeleton'

export default function PacientesLoading() {
    return <PageSkeleton variant="table" titleWidth="w-36" showStats showFilters rows={10} />
}
