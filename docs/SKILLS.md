# Agent skills — installed

This file replaces the earlier “to install” list. Everything below is installed and visible in the DSH skill catalog now.

## Where they live

- `C:\Users\23481\.dsh\skills\<name>\SKILL.md` — global
- `C:\Users\23481\.agents\skills\<name>\SKILL.md` — shared with other agents (DSH reads it)
- `<repo>\.dsh\skills\<name>\SKILL.md` — project-scoped

DSH reads the catalog at session start, but the running session picked up the new skills without a restart.

## Installed external skills (37)

### Frontend taste, design and UI craft

| Skill | Source | Notes |
|---|---|---|
| `design-taste-frontend` | `Leonxlnx/taste-skill` via `npx skills add ... -g --all --copy` | Installed at `~/.agents/skills`; taste/anti-slop direction |
| `frontend-design` | `anthropics/skills` | Distinctive UI direction |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` (sparse clone) | Full skill: data, references, search scripts |
| `ui-styling` | `mrgoonie/claudekit-skills` (sparse clone) | Full skill incl. references/scripts/fonts |
| `design-system` | `Tyler-R-Kendrick/agent-skills` | Token architecture and design-system process |
| `baseline-ui` | `ui-skills` npm package 0.2.4 | Deslop/polish constraints |
| `improve-ui` | `ui-skills` npm package | Read-only design audit and handoff plans |
| `ui-skills-root` | `ui-skills` npm package | Router for the UI skill set |
| `fixing-accessibility` | `ui-skills` npm package | WCAG fixes |
| `fixing-metadata` | `ui-skills` npm package | Titles, OG, canonical, JSON-LD |
| `fixing-motion-performance` | `ui-skills` npm package | Jank and compositor fixes |
| `web-design-guidelines` | `vercel-labs/agent-skills` | Web Interface Guidelines audit |
| `impeccable` | `pbakaus/impeccable` (sparse clone) | Full skill: references, agents, scripts |
| `brand-guidelines` | `anthropics/skills` | Brand application |
| `theme-factory` | `anthropics/skills` | Themes for UI and report decks |
| `web-artifacts-builder` | `anthropics/skills` | Complex React/Tailwind artifacts |

### React / Next.js engineering

| Skill | Source |
|---|---|
| `vercel-react-best-practices` | `vercel-labs/agent-skills` |
| `vercel-composition-patterns` | `vercel-labs/agent-skills` |
| `vercel-react-view-transitions` | `vercel-labs/agent-skills` |

### Build discipline (Superpowers for DSH)

Installed from `StartOver000/SuperPower-dsh` — 15 DSH-adapted skills. The plugin/CLI install hung, so the skills were copied directly into `~/.dsh/skills`. They work as normal skills; the plugin bootstrap is not required.

`brainstorming` · `writing-plans` · `executing-plans` · `subagent-driven-development` · `dispatching-parallel-agents` · `systematic-debugging` · `test-driven-development` · `verification-before-completion` · `requesting-code-review` · `receiving-code-review` · `finishing-a-development-branch` · `using-git-worktrees` · `using-superpowers` · `writing-skills` · `diagnosing-superpowers`

### Utility

| Skill | Source |
|---|---|
| `webapp-testing` | `anthropics/skills` — Playwright UI verification |
| `skill-creator` | `anthropics/skills` — author/optimize skills |
| `writing-guidelines` | `vercel-labs/agent-skills` — docs/prose audit |

## Project skills (already in the repo)

These encode Studio Hub’s own rules and take priority for product-specific work:

- `social-platform-apis`
- `knowledge-inbox`
- `brand-voice-rag`
- `data-lifecycle`
- `design-system-hub`

## Already built into DSH (no install)

`office`, `office-docx`, `office-xlsx`, `office-pptx`, `office-export-pdf`, `office-recalculate`, `office-render`, `diagnose-windows-sandbox-acl`.

## Not installed, and why

- **`slides`** — not present in the current `anthropics/skills` repo. The report deck uses `office-pptx` + `theme-factory` instead.
- **`ui-ux-pro-max` via `npx skills add`** — the GitHub clone repeatedly failed with `early EOF`. A sparse clone succeeded and the full skill (SKILL.md + data + references + scripts) is installed.
- **`superpowers-dsh` as a plugin** — `npx @deepseek-ai/dsh plugin --profile desktop add ...` hung for hours and never modified the profile. The 15 skills were copied instead; no profile changes were made.
- **`npx ui-skills`** — this is an interactive router CLI, not an installer. It hung on this machine. Its shipped skill folders were extracted from the npm tarball and installed directly.

## How to use them in this repo

| Task | Load |
|---|---|
| Any new UI or redesign | `design-taste-frontend`, `frontend-design`, `ui-ux-pro-max`, `baseline-ui` |
| Audit/polish an existing screen | `baseline-ui`, `web-design-guidelines`, `improve-ui`, `fixing-accessibility` |
| React/Next.js performance or refactor | `vercel-react-best-practices`, `vercel-composition-patterns` |
| Page/route transitions | `vercel-react-view-transitions`, `fixing-motion-performance` |
| Build a feature with tests | `brainstorming`, `writing-plans`, `test-driven-development`, `verification-before-completion` |
| Diagnose a bug | `systematic-debugging` |
| Review before merge | `requesting-code-review`, `receiving-code-review` |
| Report deck design | `theme-factory`, `office-pptx` |
| Product-specific behaviour | the five project skills above |

## Verification

- `~/.dsh/skills` contains 36 skill folders.
- `~/.agents/skills` contains `design-taste-frontend`.
- `.dsh/skills` contains the 5 project skills.
- All appear in the live catalog (the system reminder in this session lists them).
- `ui-ux-pro-max/scripts/search.py` runs successfully with the workspace Python. Its `SKILL.md` path was adjusted from `${CLAUDE_PLUGIN_ROOT}/...` to `<skill-base-dir>/scripts/search.py` so it resolves correctly inside DSH.
- `design-taste-frontend` lives in `~/.agents/skills`; DSH reads that directory too.
- `npm run typecheck` and `npm run build` still pass.
