import PageSkeleton from '@/components/ui/page-skeleton'

export default function CrmLoading() {
    return <PageSkeleton variant="table" titleWidth="w-24" showStats showFilters rows={8} />
}
