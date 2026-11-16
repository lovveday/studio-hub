# Virality Lab

Status: **built and running in the demo.** The lab turns a competitor clip into a cited teardown and a brand-safe adaptation brief. It is a research tool, not a reposter.

## What it answers

1. Why did this clip hold attention in the first three seconds?
2. What is the timed structure, and what evidence supports each beat?
3. What is the smallest, safest way to reuse the *structure* for one of our brands?
4. How much of the new script still echoes the source?
5. What should we test next, and what would count as a result?

It does **not** claim to know the creator's views, retention, saves, revenue or whether the clip "went viral". No performance number is invented or inferred.

## The three inputs

| Mode | What it accepts | What the lab reads | Honesty label |
|---|---|---|---|
| **Upload** | MP4/MOV/WebM, up to 100 MB | Gemini File API video (or captured frames if video fails), plus any transcript/caption | `Video analysis` / `Frame analysis` |
| **Link** | Public TikTok, Instagram, YouTube, Facebook, LinkedIn or X URL | Public oEmbed/OpenGraph metadata, plus the transcript or caption you paste | `Transcript` / `Metadata only` |
| **Paste** | A script, transcript or on-screen text | The text | `Transcript` |

A link is never downloaded. Instagram and X usually block public page metadata; the UI then asks for the transcript instead of pretending to have read the video.

## Pipeline

```
upload ──► browser captures up to 8 frames + duration/dimensions
             │
             ├─ Gemini File API: upload → poll ACTIVE → video teardown
             │      └─ on failure: captured frames + transcript → vision teardown
             ├─ on failure: transcript/caption → text teardown
             └─ on failure: deterministic teardown from the supplied text
                             │
                             ▼
                    timeline, hook, CTA, hypotheses
                             │
                             ▼
        adaptation brief grounded in approved brand facts
                             │
                             ▼
        wording overlap check (4-word sequences)
             └─ over 20%: ask the model to rewrite the echoes, check again
                             │
                             ▼
       save teardown + brief + score → delete the uploaded source clip
```

The background job writes `stage` to the row (`saving-source`, `reading-source`, `writing-teardown`, `grounding-brief`, `checking-wording`, `ready`). The page polls `/api/virality/[id]`; you can leave and return.

## Grounding rules

The adaptation prompt receives the brand profile and **only approved, current facts**. After generation, every returned `facts_used` value must match an approved fact or it is dropped. The lab also scans the copy for:

- banned claims from the brand profile;
- efficacy verbs (`calms`, `heals`, `repairs`, `boosts`, …) that do not appear in an approved fact;
- prices (`₦…`) that do not appear in an approved fact;
- reuse of the source creator's footage, voice or phrasing.

These add guardrails to the brief; they do not silently rewrite the copy. A human still approves the draft.

## Wording check

`compareWording(sourceText, draftText)`:

1. Lowercase and tokenise both texts.
2. Build all 4-word sequences ("4-grams").
3. Mark every draft word that is part of a sequence present in the source.
4. Score = marked draft words ÷ all draft words.

The score is the share of the *draft* that repeats the source in the same order. Matching phrases are listed so they can be rewritten.

| Score | Label | What to do |
|---|---|---|
| under 8% | Safe range | Structure is borrowed; wording is not. |
| 8–20% | Check the echo | Read the listed phrases and rewrite the ones that carry the idea. |
| over 20% | Rewrite before publishing | The model gets one tightening pass with the offending phrases; if it is still high, the brief says so. |
| no source text | Not compared | The page says so; it does not show 0% as a pass. |

The score is a wording heuristic, not a plagiarism detector. It does not catch paraphrases, translated wording or visual copying.

## Test log

The two-variant plan is not just copy: it can be run and recorded on the teardown page.

- **Status:** `planned` → `running` → `complete`.
- **Inputs:** an A value, a B value, a winner and a short note. Leaving the winner empty auto-picks the higher number; override it when lower is better (for example cost per result).
- **Result:** the page shows the winner, both values and the relative difference. A tie is a valid result.
- **Library:** completed tests feed the **Test outcomes** block in the pattern library, grouped by the winning variant name.
- **PDF:** the exported brief adds `Result: <variant> won (<A> vs <B>)` to the test box.
- **Audit:** every save writes an activity-log entry.

The result is user-entered, not scraped from a platform. A test can be edited or reopened; the lab does not pretend a test ran automatically.

## Source handling and privacy

- Uploaded clips are written to `storage/virality/<id>/source.*`, sent to Gemini, and deleted from local storage after the teardown is saved.
- Gemini files are deleted with `DELETE /v1beta/files/{name}` in a `finally` block; Google also expires files after 48 hours.
- Captured JPEG frames stay in `storage/virality/<id>/frame-*.jpg` so the storyboard still works. Deleting the teardown removes the directory.
- A failed analysis keeps the source so Retry can work without another upload. Deleting the teardown removes it.
- The link reader only allows public social hosts and never fetches private addresses or downloads media.
- The app sends the clip to Gemini; the UI states that before the upload. Do not upload material you do not have the right to research.

## Fallbacks

The lab should still produce a useful page when the model is unavailable:

| Failure | Behaviour | Mode label |
|---|---|---|
| Gemini video unavailable / busy | Try the captured frames + transcript | `Frame analysis` |
| Vision unavailable | Try transcript/caption text | `Transcript` |
| All AI unavailable | Deterministic teardown from the supplied text | `Demo fallback` |
| Adaptation unavailable | Deterministic brief from the teardown + approved facts | `Template` badge on the brief |
| No source text at all | Visual-only teardown; wording check says `Not compared` | `Video analysis` |
| Upload over 100 MB | Rejected before upload with a trim instruction | — |

The deterministic teardown quotes the supplied text, estimates timings from word count and labels its confidence low. It never invents visual detail.

## Model configuration

`.env.local`:

```bash
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3.6-flash
GEMINI_MODEL_FALLBACKS=gemini-3.6-flash,gemini-3.1-flash-lite
```

`gemini-2.5-flash` is retired for new keys and returns 404. The client tries the primary model, then each fallback on 404/429/5xx. A busy model is retried on the next one instead of failing the teardown. DeepSeek remains a text-only fallback for the rest of the app; video and vision need Gemini.

## Data model

`virality_analyses` (SQLite, `src/lib/db.ts`):

- identity: `id`, `brand_id`, `created_by`, timestamps;
- source: `source_type`, `source_url`, `source_title`, `platform`, `creator`, `caption`, `transcript`, `duration_seconds`, `width`, `height`, `mime_type`, `file_path`, `poster_path`, `frames_json`, `metadata_json`, `source_deleted_at`;
- output: `teardown_json`, `adaptation_json`, `similarity_json`, `mode`, `confidence`;
- test log: `test_status`, `test_a_value`, `test_b_value`, `test_winner`, `test_notes`, `test_started_at`, `test_completed_at`;
- job: `status` (`processing`/`ready`/`failed`), `stage`, `error`.

Parsed types live in `src/lib/virality-types.ts`.

## Files

| File | Role |
|---|---|
| `src/lib/virality.ts` | DB, file storage, pipeline, link metadata, samples |
| `src/lib/virality-ai.ts` | Prompts, Gemini File API, normalisers, deterministic fallbacks, similarity |
| `src/lib/virality-samples.ts` | Three illustrative, brand-specific sample teardowns |
| `src/app/(app)/virality/page.tsx` | Library, patterns, guardrails |
| `src/app/(app)/virality/new/page.tsx` | Input form and processing state |
| `src/app/(app)/virality/[id]/page.tsx` | Teardown, evidence, brief, checks, test log |
| `src/lib/virality-pdf.ts` | Two-page PDF brief, including the logged test result |
| `src/components/virality/new-teardown.tsx` | Upload/link/paste client, frame capture |
| `src/components/virality/processing.tsx` | Stage poller |
| `src/components/virality/beat-ruler.tsx` | Timed structure bar |
| `src/components/virality/similarity-meter.tsx` | Wording-overlap gauge |
| `src/components/virality/cover.tsx` | Real frame, remote thumbnail or typographic cover |
| `src/app/api/virality/*` | Analyze, status, link metadata, frames |
| `src/app/actions/virality.ts` | Delete, retry, rewrite, sample, create draft post, test log |

## Manual test checklist

1. Load the sample: `/virality` → **Load sample**. Check the brief uses the current approved price and the wording check is 0–8%.
2. Upload a short vertical clip (< 30 MB). Confirm the storyboard frames are distinct and the source file disappears from `storage/virality/<id>/` after `ready`.
3. Paste a YouTube link and a transcript; confirm metadata fills and the link does not download video.
4. Paste a script only; confirm the teardown is labelled `Transcript` and its pacing says it was estimated.
5. Open a brief with no source text and confirm the wording check says `Not compared`, not 0%.
6. Click **Create draft post** and confirm it lands on `/posts/<id>` as a draft with the caption and first comment.
7. In **Two-variant test**, enter A=4.8, B=3.9, status **Complete**, leave the winner empty and save. Confirm the winner auto-picks A, the banner shows the 23.1% difference, the library's **Test outcomes** shows 1 win, and the PDF includes the result.
8. Reset the test fields to `planned` and confirm the library returns to "No completed tests yet".
9. **Rewrite brief** and confirm the facts, guardrails and overlap score refresh.
10. **Delete** a teardown and confirm the row and its storage directory are gone.
11. Stop the server, set `GEMINI_API_KEY=` and repeat step 4; confirm the deterministic fallback still produces a brief and labels it `Template`.
12. Switch brands and load a sample for Copper & Co and Northstar Fit; confirm the price and product change with the brand.

## Limits and next steps

- A video read can take 30–90 seconds; a large upload can take several minutes. The job survives page navigation but not a server restart.
- No ffmpeg: frame capture and pacing rely on the browser and Gemini. A dedicated media worker would make cuts, OCR and audio features measurable rather than inferred.
- No comment, retention or revenue data, so "why it worked" stays a hypothesis.
- No cross-brand pattern rollups yet; the pattern library and test outcomes are per brand.
- Draft generation is platform-formatted for one channel or all six; it does not yet attach the source media or schedule the post.
