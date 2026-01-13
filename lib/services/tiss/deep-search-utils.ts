// lib/services/tiss/deep-search-utils.ts
/**
 * DEEP SEARCH UTILITIES - Navegação Resiliente em Objetos Complexos
 * 
 * Problema: XML parseado tem profundidade/namespaces variáveis:
 * - Unimed: guia.ans:dados.ans:pagamento
 * - Bradesco: guia.dados.pagamento
 * - SulAmérica: guia.dadosPagamento
 * 
 * Solução: Busca recursiva que ignora namespaces e profundidade.
 */

/**
 * Busca uma chave em um objeto de forma recursiva
 * Ignora prefixos de namespace (ans:, tiss:, etc)
 */
export function findKeyInObject<T = any>(
    obj: any,
    targetKey: string,
    options: {
        ignoreNamespace?: boolean;
        maxDepth?: number;
        caseInsensitive?: boolean;
    } = {}
): T | undefined {
    const {
        ignoreNamespace = true,
        maxDepth = 10,
        caseInsensitive = false,
    } = options;

    function normalize(key: string): string {
        let normalized = key;

        // Remover namespace (ans:, tiss:, etc)
        if (ignoreNamespace && key.includes(':')) {
            normalized = key.split(':').pop()!;
        }

        // Case insensitive
        if (caseInsensitive) {
            normalized = normalized.toLowerCase();
        }

        return normalized;
    }

    function search(current: any, depth: number): T | undefined {
        if (depth > maxDepth || current === null || current === undefined) {
            return undefined;
        }

        // Se não for objeto, retornar undefined
        if (typeof current !== 'object') {
            return undefined;
        }

        const normalizedTarget = normalize(targetKey);

        // Verificar keys do objeto atual
        for (const key of Object.keys(current)) {
            if (normalize(key) === normalizedTarget) {
                return current[key] as T;
            }
        }

        // Busca recursiva em valores
        for (const value of Object.values(current)) {
            if (value && typeof value === 'object') {
                const result = search(value, depth + 1);
                if (result !== undefined) {
                    return result;
                }
            }
        }

        return undefined;
    }

    return search(obj, 0);
}

/**
 * Busca múltiplas chaves alternativas (fallback chain)
 * Retorna o primeiro match encontrado
 */
export function findFirstKey<T = any>(
    obj: any,
    keys: string[],
    options?: Parameters<typeof findKeyInObject>[2]
): T | undefined {
    for (const key of keys) {
        const result = findKeyInObject<T>(obj, key, options);
        if (result !== undefined) {
            return result;
        }
    }
    return undefined;
}

/**
 * Busca todos os valores de uma chave em um objeto (retorna array)
 * Útil para encontrar todas as ocorrências de "glosa" em diferentes níveis
 */
export function findAllKeys<T = any>(
    obj: any,
    targetKey: string,
    options: Parameters<typeof findKeyInObject>[2] = {}
): T[] {
    const results: T[] = [];
    const {
        ignoreNamespace = true,
        maxDepth = 10,
        caseInsensitive = false,
    } = options;

    function normalize(key: string): string {
        let normalized = key;
        if (ignoreNamespace && key.includes(':')) {
            normalized = key.split(':').pop()!;
        }
        if (caseInsensitive) {
            normalized = normalized.toLowerCase();
        }
        return normalized;
    }

    function search(current: any, depth: number): void {
        if (depth > maxDepth || current === null || current === undefined) {
            return;
        }

        if (typeof current !== 'object') {
            return;
        }

        const normalizedTarget = normalize(targetKey);

        for (const [key, value] of Object.entries(current)) {
            if (normalize(key) === normalizedTarget) {
                results.push(value as T);
            }

            if (value && typeof value === 'object') {
                search(value, depth + 1);
            }
        }
    }

    search(obj, 0);
    return results;
}

/**
 * Extrai texto de um valor (trata #text, objetos, arrays)
 * Útil para parsers XML que retornam estruturas mistas
 */
export function extractText(value: any): string | undefined {
    if (value === null || value === undefined) {
        return undefined;
    }

    // Se for string, retornar diretamente
    if (typeof value === 'string') {
        return value.trim();
    }

    // Se for número, converter
    if (typeof value === 'number') {
        return value.toString();
    }

    // Se for objeto com #text (fast-xml-parser)
    if (typeof value === 'object' && value['#text'] !== undefined) {
        return extractText(value['#text']);
    }

    // Se for array, pegar primeiro elemento
    if (Array.isArray(value) && value.length > 0) {
        return extractText(value[0]);
    }

    return undefined;
}

/**
 * Extrai número de um valor (com parsing seguro)
 */
export function extractNumber(value: any): number | undefined {
    const text = extractText(value);

    if (!text) return undefined;

    // Remover símbolos de moeda e espaços
    const cleaned = text.replace(/[R$\s]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);

    return isNaN(parsed) ? undefined : parsed;
}

/**
 * Extrai boolean de um valor
 */
export function extractBoolean(value: any): boolean | undefined {
    const text = extractText(value);

    if (!text) return undefined;

    const normalized = text.toLowerCase().trim();

    // Valores truthy
    if (['true', '1', 's', 'sim', 'yes', 'y'].includes(normalized)) {
        return true;
    }

    // Valores falsy
    if (['false', '0', 'n', 'não', 'nao', 'no'].includes(normalized)) {
        return false;
    }

    return undefined;
}

/**
 * Busca com múltiplos critérios (OR lógico)
 * Ex: buscar campo que pode ser "valorTotal" OU "valorTotalGuia" OU "valor"
 */
export function findByPattern(
    obj: any,
    patterns: RegExp[],
    options: Parameters<typeof findKeyInObject>[2] = {}
): any {
    const { maxDepth = 10 } = options;

    function search(current: any, depth: number): any {
        if (depth > maxDepth || !current || typeof current !== 'object') {
            return undefined;
        }

        for (const [key, value] of Object.entries(current)) {
            // Testar key contra todos os patterns
            for (const pattern of patterns) {
                if (pattern.test(key)) {
                    return value;
                }
            }

            // Busca recursiva
            if (value && typeof value === 'object') {
                const result = search(value, depth + 1);
                if (result !== undefined) {
                    return result;
                }
            }
        }

        return undefined;
    }

    return search(obj, 0);
}

/**
 * Normaliza array (força conversão de objeto único em array)
 * XML parsers retornam objeto quando há 1 item, array quando há 2+
 */
export function normalizeArray<T>(value: T | T[] | undefined): T[] {
    if (value === undefined || value === null) {
        return [];
    }

    if (Array.isArray(value)) {
        return value;
    }

    return [value];
}

/**
 * Busca valor em caminho com suporte a array/objeto
 * Ex: guia.dados[0].pagamento ou guia.dados.pagamento
 */
export function getPath(obj: any, path: string[]): any {
    let current = obj;

    for (const segment of path) {
        if (!current) return undefined;

        // Tentar com namespace
        if (current[segment] !== undefined) {
            current = current[segment];
            continue;
        }

        // Tentar sem namespace
        const withoutNs = segment.split(':').pop()!;
        if (current[withoutNs] !== undefined) {
            current = current[withoutNs];
            continue;
        }

        // Se for array, tentar primeiro elemento
        if (Array.isArray(current) && current.length > 0) {
            current = current[0];

            if (current[segment] !== undefined) {
                current = current[segment];
                continue;
            }

            if (current[withoutNs] !== undefined) {
                current = current[withoutNs];
                continue;
            }
        }

        return undefined;
    }

    return current;
}

/**
 * Debug helper: lista todas as chaves disponíveis em um objeto (flat)
 */
export function listAllKeys(obj: any, maxDepth: number = 5): string[] {
    const keys = new Set<string>();

    function collect(current: any, depth: number, prefix: string = ''): void {
        if (depth > maxDepth || !current || typeof current !== 'object') {
            return;
        }

        for (const [key, value] of Object.entries(current)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;
            keys.add(fullKey);

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                collect(value, depth + 1, fullKey);
            }
        }
    }

    collect(obj, 0);
    return Array.from(keys).sort();
}
