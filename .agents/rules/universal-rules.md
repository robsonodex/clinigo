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

## 🚫 PROIBIÇÃO ABSOLUTA DE EMOJIS (SaaS Médico Premium Internacional)

O CliniGo é uma plataforma médica corporativa de padrão premium internacional. É TERMINANTEMENTE PROIBIDO o uso de emojis em qualquer parte do sistema:
1. **Interface do Usuário (UI)**: botões, títulos, subtítulos, cards, tooltips, modais, alertas, placeholders ou badges NUNCA devem conter caracteres de emoji.
2. **Respostas da IA / Copilot**: as respostas geradas pela IA devem ser estritamente profissionais, corporativas, diretas e objetivas, sem emojis.
3. **Iconografia Sóbria**: utilize exclusivamente ícones vetoriais sóbrios (Lucide Icons) em cores neutras. Proibido qualquer efeito espalhafatoso de neon ou ícones infantis.
4. **Comunicação Geral**: tom técnico, sóbrio, formal e direto.

---

