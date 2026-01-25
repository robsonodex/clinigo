/**
 * Lazy Imports for Heavy Components
 * Code splitting strategy for optimal bundle size
 */
import dynamic from 'next/dynamic'
import React from 'react'

// Skeleton components for loading states
const CalendarSkeleton = (): React.JSX.Element => (
    <div className= "w-full h-[600px] animate-pulse bg-gray-100 rounded-lg" />
)

const DashboardSkeleton = (): React.JSX.Element => (
    <div className= "grid grid-cols-1 md:grid-cols-3 gap-4" >
    {
        [1, 2, 3].map((i) => (
            <div key= { i } className = "h-32 animate-pulse bg-gray-100 rounded-lg" />
        ))
    }
    </div>
)

const EditorSkeleton = (): React.JSX.Element => (
    <div className= "w-full h-[400px] animate-pulse bg-gray-100 rounded-lg" />
)

const LoadingSpinner = (): React.JSX.Element => (
    <div className= "flex items-center justify-center h-64" >
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
        </div>
)

// Dashboard components (carregam sob demanda)
export const LazyCalendar = dynamic(
    () => import('@/components/dashboard/calendar').then(mod => mod.Calendar),
    {
        loading: () => <CalendarSkeleton />,
        ssr: false // Cliente only para performance
    }
)

export const LazyFinancialDashboard = dynamic(
    () => import('@/components/dashboard/financial-dashboard').then(mod => mod.FinancialDashboard),
    {
        loading: () => <DashboardSkeleton />,
        ssr: true
    }
)

export const LazyTISSPanel = dynamic(
    () => import('@/components/tiss/tiss-panel').then(mod => mod.TISSPanel),
    {
        loading: () => <LoadingSpinner />,
        ssr: false
    }
)

// Rich text editor (pesado, só carrega quando necessário)
export const LazyRichTextEditor = dynamic(
    () => import('@/components/dashboard/rich-text-editor').then(mod => mod.RichTextEditor),
    {
        loading: () => <EditorSkeleton />,
        ssr: false // Não funciona no servidor
    }
)

// Video call (carrega apenas na sala)
export const LazyVideoCallRoom = dynamic(
    () => import('@/components/video/VideoCallRoom').then(mod => mod.VideoCallRoom),
    {
        loading: () => <LoadingSpinner />,
        ssr: false
    }
)
