import { SpecialtyTemplateConfig } from './types'
import { FISIOTERAPIA_TEMPLATE } from './templates/fisioterapia'
import { FONOAUDIOLOGIA_TEMPLATE } from './templates/fonoaudiologia'
import { INTERVENCAO_PRECOCE_ABA_TEMPLATE } from './templates/intervencao-precoce-aba'
import { PSICOLOGIA_TEMPLATE } from './templates/psicologia'
import { TERAPIA_OCUPACIONAL_TEMPLATE } from './templates/terapia-ocupacional'

export const SESSION_PLANS_REGISTRY: Record<string, SpecialtyTemplateConfig> = {
    fisioterapia: FISIOTERAPIA_TEMPLATE,
    fonoaudiologia: FONOAUDIOLOGIA_TEMPLATE,
    intervencao_precoce_aba: INTERVENCAO_PRECOCE_ABA_TEMPLATE,
    'intervencao-precoce-aba': INTERVENCAO_PRECOCE_ABA_TEMPLATE,
    psicologia: PSICOLOGIA_TEMPLATE,
    terapia_ocupacional: TERAPIA_OCUPACIONAL_TEMPLATE,
    'terapia-ocupacional': TERAPIA_OCUPACIONAL_TEMPLATE,
}

export function getSpecialtyTemplate(
    specialty: string
): SpecialtyTemplateConfig | undefined {
    const key = specialty.toLowerCase()
    return SESSION_PLANS_REGISTRY[key]
}
