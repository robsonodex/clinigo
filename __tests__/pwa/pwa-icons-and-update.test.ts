import fs from 'fs'
import path from 'path'

const ROOT = process.cwd()

function readPngDimensions(filePath: string): { width: number; height: number; colorType: number } {
    const buf = fs.readFileSync(filePath)
    // PNG signature check
    expect(buf[0]).toBe(0x89)
    expect(buf[1]).toBe(0x50)
    expect(buf[2]).toBe(0x4e)
    expect(buf[3]).toBe(0x47)
    return {
        width: buf.readUInt32BE(16),
        height: buf.readUInt32BE(20),
        colorType: buf[25],
    }
}

describe('PWA Icons, Manifests e Atualização de Marca (v2)', () => {
    it.each(['public/site.webmanifest', 'public/manifest.json'])(
        '%s deve apontar para ícones versionados v2 separados (any e maskable) e start_url /?pwa_v=2',
        (relPath) => {
            const raw = fs.readFileSync(path.join(ROOT, relPath), 'utf8')
            const manifest = JSON.parse(raw)

            expect(manifest.id).toBe('/')
            expect(manifest.start_url).toBe('/?pwa_v=2')
            expect(manifest.scope).toBe('/')
            expect(manifest.display).toBe('standalone')
            expect(Array.isArray(manifest.icons)).toBe(true)
            expect(manifest.icons).toHaveLength(4)

            const purposes = manifest.icons.map((i: { purpose: string }) => i.purpose)
            expect(purposes.filter((p: string) => p === 'any')).toHaveLength(2)
            expect(purposes.filter((p: string) => p === 'maskable')).toHaveLength(2)

            for (const icon of manifest.icons) {
                expect(icon.src).toContain('-v2.png')
                const fullPath = path.join(ROOT, 'public', icon.src)
                expect(fs.existsSync(fullPath)).toBe(true)
                const { width, height } = readPngDimensions(fullPath)
                expect(`${width}x${height}`).toBe(icon.sizes)
            }
        }
    )

    it('deve possuir apple-touch-icon-v2.png 180x180 opaco (sem canal alpha) para iOS', () => {
        const iconPath = path.join(ROOT, 'public/apple-touch-icon-v2.png')
        expect(fs.existsSync(iconPath)).toBe(true)
        const { width, height, colorType } = readPngDimensions(iconPath)
        expect(width).toBe(180)
        expect(height).toBe(180)
        // PNG colorType 2 = RGB sem alpha (exigido pelo iOS para não renderizar fundo preto)
        expect(colorType).toBe(2)
    })

    it('app/layout.tsx e app/(pwa)/layout.tsx devem referenciar manifests v2 sem duplicidade e com viewportFit cover', () => {
        const rootLayout = fs.readFileSync(path.join(ROOT, 'app/layout.tsx'), 'utf8')
        const pwaLayout = fs.readFileSync(path.join(ROOT, 'app/(pwa)/layout.tsx'), 'utf8')

        expect(rootLayout).toContain("manifest: '/site.webmanifest?v=2'")
        expect(rootLayout).not.toContain('<link rel="manifest"')
        expect(rootLayout).toContain('/apple-touch-icon-v2.png')
        expect(rootLayout).toContain("viewportFit: 'cover'")

        expect(pwaLayout).toContain("manifest: '/manifest.json?v=2'")
        expect(pwaLayout).toContain('/icons/clinigo-pwa-512-v2.png')
        expect(pwaLayout).toContain("viewportFit: 'cover'")
    })

    it('Service Worker e utilitário PWA devem registrar mesmo com readyState complete e limpar caches v2', () => {
        const sw = fs.readFileSync(path.join(ROOT, 'public/sw.js'), 'utf8')
        const pwaUtil = fs.readFileSync(path.join(ROOT, 'lib/utils/pwa.ts'), 'utf8')

        expect(sw).toContain('clinigo-cleanup-v2')
        expect(sw).toContain('CLEAR_ALL_CACHES')
        expect(pwaUtil).toContain("document.readyState === 'complete'")
        expect(pwaUtil).toContain("updateViaCache: 'none'")
        expect(pwaUtil).not.toContain('window.confirm')
    })

    it('PWAInitializer deve exibir novo ícone, detectar ?pwa_v=2, notificar apps antigos em standalone e não usar navigator.share no iOS', () => {
        const comp = fs.readFileSync(path.join(ROOT, 'components/pwa-initializer.tsx'), 'utf8')

        expect(comp).toContain('/icons/clinigo-pwa-192-v2.png')
        expect(comp).toContain("currentUrl.searchParams.get('pwa_v') === '2'")
        expect(comp).toContain('Atualização do aplicativo disponível')
        expect(comp).toContain('Atualizar aplicativo agora')
        expect(comp).not.toContain('navigator.share')
    })
})

