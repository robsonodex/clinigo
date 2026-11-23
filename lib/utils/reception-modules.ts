export type ReceptionModuleKey = 'tvPanel' | 'totem' | 'faceCheckin' | 'qrScanner'

export interface ReceptionVisibleModules {
    tvPanel: boolean
    totem: boolean
    faceCheckin: boolean
    qrScanner: boolean
}

export interface ReceptionModuleOption {
    key: ReceptionModuleKey
    label: string
    description: string
}

export const DEFAULT_RECEPTION_VISIBLE_MODULES: ReceptionVisibleModules = {
    tvPanel: true,
    totem: true,
    faceCheckin: true,
    qrScanner: true,
}

export const RECEPTION_MODULE_OPTIONS: readonly ReceptionModuleOption[] = [
    {
        key: 'tvPanel',
        label: 'Painel de TV',
        description: 'Abrir, copiar link e configurar TV de chamadas',
    },
    {
        key: 'totem',
        label: 'Auto Atendimento',
        description: 'Abrir e copiar link do Totem digital',
    },
    {
        key: 'faceCheckin',
        label: 'Check-in Facial',
        description: 'Atalho para reconhecimento biométrico',
    },
    {
        key: 'qrScanner',
        label: 'Escanear QR Code',
        description: 'Confirmar chegada pelo celular do paciente',
    },
] as const

export const RECEPTION_PREFERENCES_ALLOWED_ROLES: readonly string[] = [
    'RECEPTIONIST',
    'CLINIC_ADMIN',
    'STAFF',
    'SUPER_ADMIN',
] as const

export function normalizeReceptionModules(raw: unknown): ReceptionVisibleModules {
    if (!raw || typeof raw !== 'object') {
        return { ...DEFAULT_RECEPTION_VISIBLE_MODULES }
    }
    const input = raw as Record<string, unknown>
    return {
        tvPanel: typeof input.tvPanel === 'boolean' ? input.tvPanel : true,
        totem: typeof input.totem === 'boolean' ? input.totem : true,
        faceCheckin: typeof input.faceCheckin === 'boolean' ? input.faceCheckin : true,
        qrScanner: typeof input.qrScanner === 'boolean' ? input.qrScanner : true,
    }
}

export function countVisibleReceptionModules(modules: ReceptionVisibleModules): number {
    return (
        Number(modules.tvPanel) +
        Number(modules.totem) +
        Number(modules.faceCheckin) +
        Number(modules.qrScanner)
    )
}

export function getReceptionModulesStorageKey(clinicId: string): string {
    return `clinigo_reception_visible_modules_${clinicId}`
}

export function getReceptionModulesGridClass(visibleCount: number): string {
    switch (visibleCount) {
        case 1:
            return 'grid grid-cols-1 sm:max-w-md gap-3'
        case 2:
            return 'grid grid-cols-1 sm:grid-cols-2 gap-3'
        case 3:
            return 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'
        default:
            return 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3'
    }
}
