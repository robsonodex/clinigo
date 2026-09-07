---
trigger: always_on
---

# Universal Rules (TIER 0) - AG Kit

> Always-active rules that apply to every request, regardless of domain.

---

## 🌐 Language Handling

When user's prompt is NOT in English:

1. **Internally translate** for better comprehension
2. **Respond in user's language** - match their communication
3. **Code comments/variables** remain in English

---

---

## 🧹 Clean Code (Global Mandatory)

**ALL code MUST follow `@[skills/clean-code]` rules. No exceptions.**

- **Code**: Concise, direct, no over-engineering. Self-documenting.
- **Testing**: Mandatory. Pyramid (Unit > Int > E2E) + AAA Pattern.
- **Performance**: Measure first. Adhere to current Core Web Vitals standards.
- **Infra/Safety**: 5-Phase Deployment. Verify secrets security.

---

## PADRÃO SAAS MÉDICO CORPORATIVO PREMIUM INTERNACIONAL (MANDATÓRIO E INVIOLÁVEL)

O CliniGo é uma plataforma médica corporativa de padrão premium internacional. Todo desenvolvimento, alteração visual, texto e resposta de IA DEVE seguir rigorosamente este padrão:

1. **ZERO EMOJIS (Proibição Absoluta)**:
   - É TERMINANTEMENTE PROIBIDO o uso de caracteres de emojis em qualquer parte do sistema: interface do usuário (UI), botões, títulos, subtítulos, cards, tooltips, modais, badges, placeholders, alertas, notificações, mensagens de sistema ou respostas da IA/Copilot.

2. **Iconografia Sóbria e Profissional**:
   - Utilize exclusivamente ícones vetoriais sóbrios (Lucide Icons) com traço fino e neutro.
   - É proibido o uso de ícones festivos, infantis, mágicos ou espalhafatosos (ex: `Sparkles`, `PartyPopper`, varinhas, confetes ou efeitos de glitter/estrelas em recursos de sistema).
   - Para datas e eventos, use ícones neutros como `Calendar` ou `CalendarDays`. Para instituições e empresas, use `Building2`. Para equipes e cargos, use `Users`.

3. **Design Visual, Cores e Acabamento**:
   - Padrão visual elegante, sóbrio e hospitalar/clínico de alto escalão (similar a Epic Systems, Cerner ou Stripe).
   - Proibido o uso de gradientes arco-íris, cores de neon, bordas extravagantes ou animações desnecessárias.
   - Use paletas neutras (Slate, Zinc, Gray) combinadas com o verde cirúrgico/esmeralda institucional (`emerald-700/800` ou `teal`), com contrastes adequados e tipografia refinada.

4. **Co-Branding e Proporções de Marca**:
   - Logotipos institucionais (CliniGo e clínicas parceiras) devem respeitar rigorosamente as proporções estéticas e travas de contenção (altura padronizada de 26px, `object-contain`, divisores neutros e sem distorção).

5. **Tom de Comunicação**:
   - Tom estritamente formal, corporativo, técnico, claro e respeitoso.
   - Nunca use gírias, exclamações infantis ou linguagem informal. Respostas de sistema e da IA devem transmitir solidez, segurança médica e credibilidade jurídica/LGPD.

---

## PROTOCOLO DE DEPLOY EM PRODUÇÃO (MANDATÓRIO)

Para publicar em produção e garantir visibilidade imediata no dashboard da Vercel (time `nodexs-projects-8a6ee1f1`):
```bash
git push origin master
npx vercel --prod --yes --scope nodexs-projects-8a6ee1f1
```
Nunca utilize apenas `vercel --prod` sem npx e sem o escopo oficial, pois causará erro de permissão ("Not authorized") ou comando não encontrado no Windows.

---

