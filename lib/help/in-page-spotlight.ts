/**
 * Motor de orientação visual in-page (CliniGo Guided Spotlight)
 * — Ao clicar em um passo da Ajuda Lateral, rola suavemente até a funcionalidade
 *   na própria página (sem sair da rota atual) e aplica um pulsar suave editorial.
 */

export const HELP_SPOTLIGHT_CLASS = 'clinigo-help-spotlight';
export const HELP_SPOTLIGHT_DURATION_MS = 3800;

let activeElement: HTMLElement | null = null;
let activeTimer: ReturnType<typeof setTimeout> | null = null;

export interface SpotlightResolution {
    found: boolean;
    matchedTarget: string | null;
    isFallback: boolean;
}

/**
 * Remove imediatamente qualquer destaque ativo na página.
 */
export function clearHelpSpotlight(): void {
    if (activeTimer) {
        clearTimeout(activeTimer);
        activeTimer = null;
    }
    if (activeElement) {
        activeElement.classList.remove(HELP_SPOTLIGHT_CLASS);
        activeElement.removeAttribute('data-help-spotlight-active');
        activeElement = null;
    }
}

/**
 * Localiza o primeiro elemento visível dentre uma lista ordenada de `data-help-target`
 * (alvo principal primeiro; alvos de orientação/pré-requisito em seguida).
 */
export function resolveHelpSpotlightTarget(
    targets: string[],
    doc: Document | null = typeof document !== 'undefined' ? document : null
): { element: HTMLElement | null; matchedTarget: string | null; isFallback: boolean } {
    if (!doc || !Array.isArray(targets) || targets.length === 0) {
        return { element: null, matchedTarget: null, isFallback: false };
    }

    for (let i = 0; i < targets.length; i += 1) {
        const key = targets[i];
        if (!key) continue;
        const el = doc.querySelector<HTMLElement>(`[data-help-target="${key}"]`);
        if (el) {
            return {
                element: el,
                matchedTarget: key,
                isFallback: i > 0,
            };
        }
    }

    return { element: null, matchedTarget: null, isFallback: false };
}

/**
 * Rola suavemente até o elemento-alvo na mesma página e aplica o pulsar suave por ~3,8s.
 */
export function triggerHelpSpotlight(
    targets: string[],
    options?: {
        durationMs?: number;
        onResolved?: (res: SpotlightResolution) => void;
    }
): SpotlightResolution {
    clearHelpSpotlight();

    const { element, matchedTarget, isFallback } = resolveHelpSpotlightTarget(targets);
    if (!element || !matchedTarget) {
        const notFound: SpotlightResolution = {
            found: false,
            matchedTarget: null,
            isFallback: false,
        };
        options?.onResolved?.(notFound);
        return notFound;
    }

    // Força reinício limpo da animação caso o usuário clique no mesmo passo novamente
    element.classList.remove(HELP_SPOTLIGHT_CLASS);
    void element.offsetWidth;

    if (typeof element.scrollIntoView === 'function') {
        element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }

    element.classList.add(HELP_SPOTLIGHT_CLASS);
    element.setAttribute('data-help-spotlight-active', 'true');
    activeElement = element;

    const duration = options?.durationMs ?? HELP_SPOTLIGHT_DURATION_MS;
    activeTimer = setTimeout(() => {
        clearHelpSpotlight();
    }, duration);

    const resolved: SpotlightResolution = {
        found: true,
        matchedTarget,
        isFallback,
    };
    options?.onResolved?.(resolved);
    return resolved;
}
