# Brand Guidelines — Can I Have Sex Today

> **The idea in one line:** a bold, blunt question answered by a calm, beautiful, ad-free tool.
> **The signature move:** *bold question, quiet answer.* The name carries the edge; everything else is quiet.

---

## 1. Positioning

**Who it's for:** people practicing fertility awareness who want to know one thing — *am I fertile today?*

**What it is:** a calm, ad-free, privacy-first app that answers today's biological fertility question from real signals (cervical mucus, basal temperature, LH tests, bleeding). It does **not** predict periods, generate a future "safe-days" calendar, or promise contraception. If uncertain, it assumes fertile.

**Positioning statement:**
> For people practicing fertility awareness, **Can I Have Sex Today** is a calm, ad-free app that answers one honest question — *am I fertile today?* — without the predictions, clutter, or data-harvesting of Flo and Clue.

**Why we win (structural, not cosmetic):** incumbents have soft names on loud, cluttered, ad-driven apps. We have a bold name on a quiet, respectful one. That posture can't be copied.

### Brand pillars
1. **Direct** — answers the real question, no euphemism, no dark patterns.
2. **Calm** — restrained design, no notification spam, no gamification, no ads.
3. **Yours** — privacy-first, you own your data, ad-free, self-hostable.
4. **Honest** — only today; "assume fertile if unsure"; never overpromises.

### Taglines (calm voice)
- A fertility app that respects your attention.
- One honest question. One calm answer.
- No predictions. Just today.

---

## 2. Voice & tone — *calm & plain-spoken*

Plain words. Short sentences. Second person ("you"). Confident, but humble about uncertainty. **The name is bold so the copy doesn't have to be** — let the name carry the edge; keep everything else gentle.

| Do | Don't |
|----|-------|
| "You're likely fertile today." | "⚠️ HIGH RISK!!" |
| "Not enough signal yet — assume fertile to be safe." | "We can't predict anything 🤷" |
| "Your data stays yours." | "Military-grade encryption for your privacy!" |
| "Log today to see your status." | "Don't break your streak!" |

**Rules**
- No fear, no hype, no shame, no moralizing about sex.
- Exclamation marks are rare; emoji never appear in-product.
- Explain jargon the first time (BBT, LH, mucus) or avoid it.
- Be honest about uncertainty — it builds trust.

---

## 3. Gender-neutral language (non-negotiable)

Default to **"you / your."** This is a category differentiator — Flo/Clue lean "women's health"; we don't.

- ✅ your body · your cycle · people who track their cycle · you
- ❌ women · girls · feminine · "for her" · pink-coded framing
- Use clinical terms ("people who menstruate") only where medically necessary; default to second person.

---

## 4. Logo & wordmark

**Primary lockup:** `canihave` *sex* `.today` — **all ink** (foreground color), with *sex* in **italic** as a subtle wink. Emphasis comes from italic + weight, **not color** (drop the rose).

- Weights: `canihave` / `.today` = 700; *sex* = 800 italic.
- Light mode = ink on light; dark mode = white on black. Always monochrome.
- Clear space: min ½ cap-height on all sides.

**Don't:**
- ❌ color "sex" pink/rose/red
- ❌ gradients, outlines, drop shadows
- ❌ cursive / script fonts (remove `Dancing Script` from the stack)
- ❌ flowers, petals, hearts, mascots

**App icon (open — needs design):** a single, calm mark that says "today, one answer." Candidates: one filled dot `•` on a neutral field; a single highlighted day in a minimal grid; a single tick. Monochrome first; an icon may use the one blue accent.

---

## 5. Color

**Discipline that makes it feel calm:** color carries **meaning, never decoration.** The interface is ink + grey. The *only* accent is the interactive blue. Status colors appear *only* on fertility status.

### Brand / system (ink monochrome + one blue)
| Token | Light | Dark |
|-------|-------|------|
| Background | `#F2F2F7` | `#000000` |
| Card / surface | `#FFFFFF` | `#1C1C1E` |
| Popover / sheet | `#FFFFFF` | `#2C2C2E` |
| Ink (primary text) | `#000000` | `#FFFFFF` |
| Muted text | `#636366` | `#8E8E93` |
| Hairline / input | `#E5E5EA` | `#38383A` |
| **Accent (interactive)** | `#007AFF` | `#0A84FF` |
| Destructive | `#FF3B30` | `#FF453A` |

### Status colors (meaning only — consolidate to these)
> Today's screen currently mixes `red-500`, `--risk-high`, and `--destructive`. Pick **one** canonical iOS-system set:

| Status | Meaning | Light | Dark |
|--------|---------|-------|------|
| 🔴 High / Fertile | high chance today | `#FF3B30` | `#FF453A` |
| 🟠 Unsure / Medium | assume fertile | `#FF9500` | `#FF9F0A` |
| 🟢 Low / Not fertile | low chance today | `#34C759` | `#32D74B` |

---

## 6. Typography

**Typeface:** `Inter` for everything (system fallback). Ruthless consistency over variety. *Optional:* `Inter Display` / `Inter Tight` for the wordmark only. **Remove `Dancing Script`.**

| Role | Size | Weight | Tracking |
|------|------|--------|----------|
| Hero status | 42px | 800 | -0.05em |
| Screen title | 30px | 800 | -0.04em |
| Wordmark | 22px | 700/800 | tight |
| Section value | 17–20px | 700 | tight |
| Body | 15px | 400–500 | normal |
| Label | 12px | 600 | normal |
| Micro-label (uppercase) | 10px | 600 | +0.08em |

Rules: tracking-tight on large display type; **UPPERCASE + letter-spacing** for the smallest labels; weight range 400–800.

---

## 7. Layout & UI system

- **iOS inset-grouped** lists on a `#F2F2F7` / `#000` canvas.
- Radius **14px** (12px on short screens).
- **One primary action per screen.** Pill buttons. Hairline separators.
- Generous whitespace; every element earns its place. **Default to removing.**
- Full light/dark parity.

---

## 8. Iconography & motion

- **Icons:** `lucide-react`, stroke ~2.5, ink by default. Color an icon *only* to signal status.
- **Motion:** subtle and calm. `active:scale 0.98–0.99`, `fade-in 300ms`. No bounce, no confetti, no streak animations. Respect `prefers-reduced-motion`.

---

## 9. Privacy & trust as brand expression

"**No tracking. No ads. Your data stays yours.**" Surface it; don't bury it. Plain-language privacy. The medical disclaimer ("not medical advice; does not guarantee pregnancy prevention") is part of the honest brand — present and calm, never alarmist.

---

## 10. What we are NOT (anti-patterns vs. Flo / Clue)

- ❌ pink/purple gradients, flowers, petals, cutesy mascots
- ❌ streaks, badges, points, gamification
- ❌ nagging push notifications
- ❌ ads, upsell interstitials, selling data
- ❌ fake certainty / future-prediction theater
- ❌ gendered "women's health" framing
