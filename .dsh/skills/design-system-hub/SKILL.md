---
name: design-system-hub
description: Use when building or polishing Studio Hub UI. Encodes the editorial studio aesthetic, tokens, component patterns and interaction rules so new screens feel like the same product.
---

# Studio Hub design system

## Direction

Editorial studio, not generic SaaS. Warm paper background, ink sidebar, serif display headings, generous whitespace, a single vivid coral accent, teal for positive states, gold for attention.

## Tokens

- Ink `#111318`; ink-soft `#1B1D22`
- Paper `#F7F5F0`; cream `#EFEAE0`; line `#E2DDD2`
- Coral `#FF5A36`; coral-soft `#FFE7DF`
- Teal `#0FA3A3`; teal-soft `#DFF4F1`
- Gold `#C98B3C`; gold-soft `#F8ECD9`
- Muted `#6B665C`
- Display: Georgia / serif. Body: system sans.

## Patterns

- Cards: 22px radius, 1px line border, white fill, very soft shadow.
- Page header: uppercase eyebrow, 30–36px serif title, one-sentence description, actions right.
- Tables/lists: 5px/4px padding rhythm, 11–13px body, uppercase 9–10px labels with letter-spacing.
- Status: colour + text, never colour alone. Draft neutral, review gold, approved teal, scheduled ink, ready coral, published teal, failed red.
- Primary button: ink fill. Action button: coral. Secondary: white + line border.
- Previews must look like the actual platform, not a generic textarea.
- Empty states explain the next action; no dead ends.

## Motion

- Subtle fade-up on page entry, 150ms hover transitions, no bounce.
- Prefer CSS transitions. Avoid animation libraries unless they earn their weight.

## Accessibility

- Focus rings visible (`ring-coral/20`).
- Contrast: body text on paper must pass AA; muted is for secondary only.
- Every icon-only button needs a title/aria-label.
- Never use colour as the only status cue.
- Forms: label + hint + error, 40px minimum height.

## Copy

Short, direct, warm. No “revolutionise”, “unleash”, “supercharge”. Labels are verbs where possible. Numbers are formatted en-GB.
