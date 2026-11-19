import Link from 'next/link'
import Image from 'next/image'
import { FOOTER_CONTENT } from './content'

export function FooterSection() {
    return (
        <footer className="bg-white border-t border-[#E6E8E5] text-sm pb-[max(2rem,env(safe-area-inset-bottom))]">
            <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-14 pb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12">
                    <div className="col-span-2 md:col-span-1">
                        <Image
                            src="/logo_black.svg"
                            alt="CliniGo"
                            width={148}
                            height={48}
                            unoptimized
                            className="h-[44px] w-auto object-contain mb-4"
                        />
                        <p className="text-xs sm:text-sm text-[#4B5B56] leading-relaxed">
                            {FOOTER_CONTENT.description}
                        </p>
                    </div>

                    {FOOTER_CONTENT.columns.map((col) => (
                        <div key={col.title}>
                            <h3 className="font-tech-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#0F1F1B] mb-4">
                                {col.title}
                            </h3>
                            <ul className="space-y-2.5 text-sm text-[#4B5B56]">
                                {col.links.map((link) => (
                                    <li key={link.label}>
                                        {link.href.startsWith('#') ? (
                                            <a
                                                href={link.href}
                                                className="hover:text-[#0F1F1B] transition-colors"
                                            >
                                                {link.label}
                                            </a>
                                        ) : (
                                            <Link
                                                href={link.href}
                                                className="hover:text-[#0F1F1B] transition-colors"
                                            >
                                                {link.label}
                                            </Link>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="pt-6 border-t border-[#E6E8E5] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#4B5B56]">
                    <span>{FOOTER_CONTENT.copyright}</span>
                    <a
                        href="https://nodexsolucoes.com.br"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
                    >
                        <span>Desenvolvido por</span>
                        <Image
                            src="/nodex-logo.png"
                            alt="Nodex Soluções"
                            width={76}
                            height={22}
                            className="h-5 w-auto rounded bg-[#0F1F1B] px-1.5 py-0.5"
                        />
                    </a>
                </div>
            </div>
        </footer>
    )
}
