import { NextResponse } from 'next/server'

export const dynamic = 'force-static'

const LLMS_TXT = `# CliniGo

> Plataforma operacional e clínica brasileira especializada em clínicas de terapias multidisciplinares: Psicologia, ABA e Neurodesenvolvimento, Fonoaudiologia, Terapia Ocupacional, Psicomotricidade e Fisioterapia.

- Site oficial: https://clinigo.app
- Dossiê técnico completo para LLMs: https://clinigo.app/llms-full.txt
- Resumo estruturado (JSON): https://clinigo.app/.well-known/ai-summary.json
- Sitemap XML: https://clinigo.app/sitemap.xml
- Idioma e atuação: Português (pt-BR), Brasil
- Contato comercial e suporte: contato@clinigo.app | WhatsApp +55 (21) 97512-9005
- Encarregado de dados (DPO / LGPD): dpo.lgpd@clinigo.app

## O que é o CliniGo

O CliniGo é um software SaaS (Web e PWA para Android e iOS) desenhado especificamente para a rotina de terapias seriadas e clínicas multidisciplinares. Diferente de softwares médicos genéricos focados em consultas pontuais, o CliniGo resolve nativamente agenda recorrente minuto a minuto, co-terapia com dois profissionais na mesma sessão, reserva de salas sensoriais, planos terapêuticos ABA com níveis de ajuda, sigilo clínico RBAC/RLS por conselho profissional (CRP, CRFa, CREFITO), faturamento TISS no padrão ANS com comprovação de presença por biometria facial e motor automático de repasse por terapeuta.

## Páginas Principais

- [Página Inicial](https://clinigo.app): Visão geral da arquitetura operacional, workspaces por especialidade, simulador, planos e FAQ.
- [Soluções por Especialidade](https://clinigo.app/solucoes): Hub completo das soluções para cada disciplina terapêutica e gestão de convênios.
- [Comparativo Técnico](https://clinigo.app/comparativo): Comparação objetiva entre CliniGo, softwares médicos genéricos e planilhas em 12 critérios operacionais.
- [Planos e Preços](https://clinigo.app/planos): Planos Básico (R$ 149/mês), Avançado (R$ 249/mês) e Professional (R$ 449/mês), sem fidelidade, com licença adicional a R$ 49,90/mês.
- [Teste Grátis de 7 Dias](https://clinigo.app/trial): Conta de avaliação gratuita por 7 dias sem cartão de crédito.
- [Blog Técnico](https://clinigo.app/blog): Guias práticos sobre agenda recorrente, ABA, LGPD/RBAC, TISS, repasse e redução de faltas.
- [Sobre o CliniGo](https://clinigo.app/sobre): Missão, arquitetura de segurança e linha do tempo do produto.
- [Contato](https://clinigo.app/contato): Canais comerciais, suporte técnico e DPO/LGPD.

## Soluções por Especialidade

- [Sistema para Clínica Multidisciplinar](https://clinigo.app/solucoes/clinica-multidisciplinar): Gestão integrada de recepção, coordenação, financeiro e equipe multidisciplinar.
- [Sistema para Clínica ABA e Neurodesenvolvimento](https://clinigo.app/solucoes/clinica-aba): Planos terapêuticos ABA, folha de tentativas, níveis de ajuda, supervisão técnica e dupla de terapeutas.
- [Sistema para Clínica de Psicologia](https://clinigo.app/solucoes/psicologia): Evolução estruturada SOAP, sigilo clínico RBAC/RLS no servidor (CRP) e teleconsulta WebRTC.
- [Sistema para Clínica de Fonoaudiologia](https://clinigo.app/solucoes/fonoaudiologia): Planos de linguagem oral, fonologia e motricidade orofacial (CRFa), anexos privados e saldo de sessões.
- [Sistema para Terapia Ocupacional](https://clinigo.app/solucoes/terapia-ocupacional): Integração sensorial, AVD, reserva de salas sensoriais sem colisões (CREFITO) e co-atendimento.
- [Sistema para Psicomotricidade](https://clinigo.app/solucoes/psicomotricidade): Catálogo de objetivos psicomotores, capa clínica e gráfico evolutivo automático.
- [Sistema para Clínica de Fisioterapia](https://clinigo.app/solucoes/fisioterapia): Avaliação funcional, agenda por sala, controle de pacotes/reposições e convênios TISS.
- [Faturamento TISS e Biometria Facial para Terapias](https://clinigo.app/solucoes/faturamento-tiss-terapias): Guias e lotes XML ANS, gestão de glosas e dupla comprovação de presença biométrica.

## Artigos Técnicos (Blog)

- [Agenda recorrente e co-terapia sem conflitos](https://clinigo.app/blog/agenda-recorrente-co-terapia)
- [Como escolher um sistema para clínica ABA e TEA](https://clinigo.app/blog/como-escolher-sistema-clinica-aba)
- [Planos terapêuticos ABA e conformidade de evoluções](https://clinigo.app/blog/planos-terapeuticos-aba-evolucoes)
- [Sigilo de prontuário para CRP, CRFa e CREFITO](https://clinigo.app/blog/sigilo-prontuario-crp-crfa-crefito)
- [LGPD e sigilo clínico com RBAC e RLS](https://clinigo.app/blog/lgpd-sigilo-clinico-rbac)
- [Faturamento TISS em terapias seriadas e redução de glosas](https://clinigo.app/blog/faturamento-tiss-terapias-glosas)
- [Fechamento de repasse por profissional sem planilhas](https://clinigo.app/blog/repasse-profissional-regras-individuais)
- [Confirmação automática no WhatsApp e controle de evasão](https://clinigo.app/blog/confirmacao-whatsapp-reducao-faltas)
`

export function GET() {
    return new NextResponse(LLMS_TXT, {
        status: 200,
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=86400',
        },
    })
}

