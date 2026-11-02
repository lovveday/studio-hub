# Agent skills to install before the next build slice

DSH loads skills from these folders (highest priority first):

1. `<repo>/.dsh/skills/<name>/SKILL.md` — project-scoped
2. `<repo>/.agents/skills/<name>/SKILL.md`
3. `C:\Users\23481\.dsh\skills\<name>/SKILL.md` — global
4. `C:\Users\23481\.agents\skills\<name>/SKILL.md`

Each skill is **one folder with `SKILL.md` at its root**. No nesting. The frontmatter needs a `description`; that is what the model sees in the catalog.

After installing, restart/reload the DSH profile and start a new session. The catalog is read at session start.

## 1. Frontend taste & UI craft

| Skill | Why | Install |
|---|---|---|
| **taste-skill** (`design-taste-frontend`) | Premium layout, type, spacing, motion; stops generic AI UI. Use `minimalist` or `soft` for dashboards. | `npx skills add https://github.com/Leonxlnx/taste-skill` then make sure the folder lands in `~/.dsh/skills/` |
| **frontend-design** | Distinctive visual direction for React/Tailwind. | Copy `skills/frontend-design` from `anthropics/skills` |
| **ui-ux-pro-max** | Styles, palettes, font pairings, UX rules. | Clone `nextlevelbuilder/ui-ux-pro-max-skill`, copy the folder with `SKILL.md` to `~/.dsh/skills/ui-ux-pro-max/` |
| **web-design-guidelines** | Accessibility/UX audit before shipping. | Copy `skills/web-design-guidelines` from `anthropics/skills` |
| **ui-styling** | shadcn/ui + Radix + Tailwind, dark mode, responsive. | Copy `skills/ui-styling` from `anthropics/skills` |
| **design-system** | Token architecture and component specs. | Copy `skills/design-system` from `anthropics/skills` |
| **theme-factory** | Themes for the app and report decks. | Copy `skills/theme-factory` from `anthropics/skills` |
| **impeccable** | End-to-end UI critique/polish. | Copy if present in `anthropics/skills`; otherwise use `web-design-guidelines` + taste |

Quick install for the Anthropic set:

```powershell
git clone https://github.com/anthropics/skills $env:TEMP\anthropic-skills
$dest = "$env:USERPROFILE\.dsh\skills"
New-Item -ItemType Directory -Force $dest | Out-Null
foreach ($name in @("frontend-design","web-design-guidelines","ui-styling","design-system","theme-factory","brand","react-best-practices","composition-patterns","react-view-transitions","webapp-testing","slides")) {
  Copy-Item -Recurse "$env:TEMP\anthropic-skills\skills\$name" "$dest\$name"
}
```

## 2. Build quality

| Skill / plugin | Why | Install |
|---|---|---|
| **superpowers-dsh** (plugin) | TDD, writing plans, systematic debugging, code review, verification before completion. | `npx @deepseek-ai/dsh plugin --profile desktop add github:StartOver000/SuperPower-dsh` then restart |
| **webapp-testing** | Playwright UI verification. | Included in the Anthropic set above |
| **react-best-practices** | Next.js/React performance. | Included above |
| **composition-patterns** | Scalable React composition. | Included above |
| **react-view-transitions** | Native-feeling transitions. | Included above |

> The active DSH profile is **desktop**, not `web`. Use `--profile desktop`.

## 3. Project skills already in this repo

These are authored for this hub and live in `.dsh/skills/`:

| Skill | What it encodes |
|---|---|
| `social-platform-apis` | Capability matrix, limits, OAuth scopes, assisted-mode boundaries |
| `knowledge-inbox` | WhatsApp/Opus formats, ingestion pipeline, fact review |
| `brand-voice-rag` | Brand context, citations, guardrails, prompt rules |
| `data-lifecycle` | Retention, archival, partitioning, quotas |
| `design-system-hub` | The app’s tokens, components, editorial dashboard style |

## 4. Optional, later

- **office-pptx / office-export-pdf / office-render** — already available in this session; use for inspecting generated report decks.
- **slides** — design language for report templates.
- **brand** — brand voice and visual identity frameworks; useful for the Brand Brain schema.

## Verify

1. Restart the app/profile.
2. Start a new session.
3. Ask: “Which skills are available?” The catalog should list the new ones.
4. If a skill does not appear, check that `SKILL.md` is directly inside `~/.dsh/skills/<name>/` (not one folder deeper) and that the frontmatter has a `description`.
