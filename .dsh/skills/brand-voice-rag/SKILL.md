---
name: brand-voice-rag
description: Use when generating captions, hashtags, reply drafts, calendar plans or report narratives for a Studio Hub brand. Enforces approved-fact grounding, citations, tone matching and guardrails so the writer never invents prices, certifications or claims.
---

# Brand voice & grounded generation

## Context order

1. Brand profile: tone, audience, pillars, offers, banned claims, hashtags, CTAs, competitors, notes.
2. Current approved facts only (`status = approved` and `valid_to IS NULL`).
3. Retrieved approved sources, with title/type/date.
4. The specific post brief.
5. Optional live research, clearly labelled as external.

## Prompt rules

- Write native copy per platform, not one caption pasted everywhere.
- Respect the platform limit including the hashtag line.
- Never invent a price, certification, date, ingredient, testimonial or performance number.
- If a required fact is missing, ask for it or use a placeholder — do not guess.
- Banned claims are hard blocks, not suggestions.
- Paid partnerships need the client’s required disclosure.
- Keep reply drafts under 280 characters unless the platform allows more.
- Vary wording across replies; duplicate replies look like spam.

## Citation rules

- Internal brand facts: “From your Brand Brain · <source> · <date>.”
- Web research: “From the web · <source URL> · retrieved <date>.”
- Never blend the two into one unsourced statement.
- If the source is stale or pending, say so.

## Output schemas

Post variants:
```json
{"variants":[{"platform":"instagram","caption":"...","hashtags":"#a #b","first_comment":"..."}]}
```

Knowledge extraction:
```json
{"summary":"...","facts":[{"subject":"Retail price","value":"...","confidence":0.0,"reason":"..."}]}
```

Validate with Zod, repair invalid JSON once, then fall back to demo templates and label the mode.

## Tone QA checklist

- Would the client recognise this as their voice?
- Is the hook specific, not generic?
- Is there one clear CTA?
- Any banned claim, absolute promise or medical claim?
- Is the first comment a genuine conversation starter?
- Does it read like a human wrote it for this platform?
