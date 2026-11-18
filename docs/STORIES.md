# Stories: what can and cannot be scheduled

Status: **Story Planner built.** It schedules the 9:16 creative and the exact sticker script, reminds you at the due time, and records the post. It does **not** pretend to inject interactive stickers through an API, because the platforms do not allow it.

## The platform limits

### Instagram Stories

Instagram’s Content Publishing API supports publishing Story media (`media_type=STORIES`) for professional accounts: an image or video, with optional user tags. It does **not** support interactive stickers:

> “Publishing stickers (i.e., link, poll, location) is not supported; however mentioning users without a sticker is supported.”
>
> — [Meta, IG User Media reference](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/media)

So a scheduled poll, question box, quiz, countdown, event or link sticker cannot be placed by an API. Instagram Story auto-publishing without stickers is technically possible with a direct Meta integration, but it is a separate adapter, needs Meta App Review/advanced access, and still has no stickers.

### TikTok Stories

TikTok’s Content Posting API publishes videos and photo posts. Its documentation lists no Story option, and third-party tools that publish through the API cannot create a TikTok Story. TikTok Stories are posted from the app. Interactive stickers are an in-app editing feature and are not exposed by the API. See the [Content Posting API docs](https://developers.tiktok.com/docs/en/content-posting-api-get-started).

## What the Story Planner does

1. **Create a story plan** at `/stories/new`:
   - platform: Instagram or TikTok;
   - 9:16 image or video (under 50 MB);
   - publish date/time;
   - one sticker: poll, question, quiz, countdown, event or link;
   - production notes: safe area, tags, music, secondary stickers.
2. **The worker checks every 60 seconds.** At the scheduled time it moves the plan to **Ready to post** and sends an in-app notification with the sticker script.
3. **Open the platform** from the detail page. Download the creative, post it as a Story, add the native sticker, publish.
4. **Mark posted.** The record is stored and shown in `/stories`.

The worker is required for the reminder/status change. On a laptop it must be running; on a VPS it runs as its own container.

## What is automated vs native

| Step | Automated | Native |
|---|---|---|
| 9:16 creative storage and download | ✅ | — |
| Sticker copy (poll question/options, event details, link) | ✅ | — |
| Scheduled reminder and posted record | ✅ | — |
| Posting the Story to Instagram/TikTok | ❌ | ✅ |
| Adding the interactive sticker | ❌ | ✅ |
| Viewing sticker responses | ❌ | ✅ |

This is not a workaround for a missing feature in the app; it is the platform contract. Any tool claiming API-scheduled interactive Stories is either sending a reminder (and calling it scheduling) or using automation that violates the platform terms.

## Data model

`story_plans`:

- identity: `id`, `brand_id`, `created_by`, timestamps;
- plan: `platform`, `title`, `caption`, `scheduled_at`, `status` (`draft`/`scheduled`/`ready`/`posted`), `posted_at`;
- creative: `asset_id` → `assets` (image/video, 50 MB max);
- sticker: `sticker_json` (one sticker object);
- notes.

`StorySticker` union in `src/lib/types.ts`:

```ts
{ type: "poll", question, options[] }
{ type: "question", prompt }
{ type: "quiz", question, options[], answer }
{ type: "countdown", title, endsAt }
{ type: "event", title, startsAt, location }
{ type: "link", url, label }
```

## Worker

`scripts/worker.ts` finds `status='scheduled' AND scheduled_at <= now`, sets `status='ready'`, and creates a notification per user:

- title: `Story due: …`
- body: platform + sticker summary
- link: `/stories/<id>`
- dedupe: `story:<id>:<user>`

It never calls Upload-Post or a platform publisher for a story plan. This preserves the free upload quota for feed posts and avoids fake "published" records.

## Future options

- **Instagram plain Story auto-publish** — possible through a direct Meta Graph adapter (no stickers), behind Meta review and a public media URL. It would be a separate "automatic plain Story" mode, clearly labelled.
- **Baked-in poll graphics** — you can put a visual poll in the image, but it is not tappable. The planner does not call that an interactive sticker.
- **TikTok** — no Story API path exists. Keep it assisted.
- **Push notifications / WhatsApp reminders** — currently in-app notifications; email/push is a later slice.

## Files

| File | Role |
|---|---|
| `src/lib/stories.ts` | data, sticker parsing, due plans, summaries |
| `src/app/actions/stories.ts` | create, mark posted, reschedule, delete |
| `src/app/api/stories/upload/route.ts` | 9:16 creative upload into assets |
| `src/components/stories/story-form.tsx` | story composer + sticker builder |
| `src/app/(app)/stories/page.tsx` | queue |
| `src/app/(app)/stories/new/page.tsx` | create |
| `src/app/(app)/stories/[id]/page.tsx` | sticker script, open app, mark posted |
| `scripts/worker.ts` | due-story notification |

## Test checklist

1. Create a story plan with a poll; verify it appears under Scheduled.
2. Set it 1–2 minutes ahead; keep the worker running.
3. At the due time, verify status becomes Ready and a notification appears.
4. Open the detail; download the creative; copy the sticker plan.
5. Mark posted; verify it moves to Posted.
6. Create a TikTok story plan; verify the same flow and that it never tries an API publish.
7. Confirm Upload-Post usage does not increase for a story plan.
