# Automatic publishing with Upload-Post

Status: **implemented.** Upload-Post is the no-app-review publishing path. Assisted mode remains the fallback, and the hub keeps its own calendar, approvals, assets, reports and audit log.

## Why this provider

Creating a Meta app is possible, but advanced client access needs App Review + Business Verification. X needs paid credits. TikTok needs a Content Posting API audit and is likely to reject an internal agency tool. LinkedIn company pages need Community Management approval.

Upload-Post carries those approvals for you:

- one API key instead of five OAuth builds;
- one request can publish the same post to several platforms;
- per-platform results, including a URL or a failure reason;
- comments, analytics and webhooks are available on the same account;
- the free plan is enough to prove the integration.

Official docs: <https://docs.upload-post.com/> · API reference: <https://docs.upload-post.com/api/reference> · OpenAPI: <https://docs.upload-post.com/openapi.json>

## Plan limits (verify before paying)

| | Free | Paid (Basic) |
|---|---|---|
| Uploads | **10 / month** | Unlimited |
| Profiles | **2** | 5 client profiles |
| TikTok | **Not available** | Available |
| Comments / analytics / webhooks | Included | Included |
| Price | $0 | ~$24/mo, ~$16/mo annual |

One multi-platform post counts as **one upload**, not one per platform. The hub batches all supported variants of a post into a single Upload-Post request for that reason.

The free plan has **2 profiles**, so with three brands only two can have a dedicated Upload-Post profile. The third brand stays on assisted mode until you remove a profile or upgrade. A profile is the destination: each brand should have its own profile so a post for Lumen Skin cannot go to Copper & Co's accounts.

## Setup

1. Create an Upload-Post account and copy the API key from the dashboard.
2. Add to `.env.local`:

```bash
UPLOADPOST_API_KEY=...
UPLOADPOST_PLAN=free          # free | paid
UPLOADPOST_FREE_LIMIT=10
UPLOADPOST_API_BASE=https://api.upload-post.com
# APP_URL must be reachable by the browser for the connect redirect:
APP_URL=http://localhost:3000
```

3. Restart the server.
4. Open **Settings → Automatic publishing**.
5. Pick the active brand, choose a profile username, and press **Create profile & connect accounts**.
6. Upload-Post opens its secure connect page. Connect the social accounts that belong to that brand.
7. Return to Settings and press **Refresh**. The connected platforms appear as chips.
8. Repeat for the second brand. The third stays on assisted mode while the free plan is active.

The API key never reaches the browser. The connect page uses a short-lived Upload-Post JWT.

## What the adapter does

For each post, `publishPost`:

1. Looks up the brand's Upload-Post profile.
2. Reads the post's media: one video, up to 10 images, or no media (text).
3. Partitions the variants into **supported** and **fallback**:
   - video: TikTok, Instagram, YouTube, Facebook, LinkedIn, X;
   - photos: TikTok, Instagram, Facebook, LinkedIn, X (YouTube is not a photo network);
   - text: X, LinkedIn, Facebook;
   - TikTok is excluded on the free plan;
   - anything else becomes an assisted attempt.
4. Sends **one** request with all supported platforms:
   - `POST /api/upload` for video;
   - `POST /api/upload_photos` for images;
   - `POST /api/upload_text` for text.
5. Maps per-platform results back to `publish_attempts`. A published result stores its URL/ID; a skipped or failed platform becomes `assisted_required` with the provider's reason.
6. Writes the post status and the activity log exactly like the existing publisher.

The request includes:

- `user` = the brand's profile username;
- `platform[]` for each supported variant;
- `<platform>_title` from the variant caption + hashtags;
- `<platform>_first_comment` when the variant has a first comment;
- `external_id` = the hub post ID;
- `request_id` + `Idempotency-Key` derived from the post and variant IDs, so a timeout retry does not double-publish;
- `async_upload=true`; the adapter polls `/api/uploadposts/status` until completed/failed (up to 2 minutes).

## Free-tier fallback

The user-facing promise is: **automatic while the free credits last, assisted after that.**

The adapter enforces it in this order:

| Situation | Behaviour | Attempt status |
|---|---|---|
| No `UPLOADPOST_API_KEY` | Existing assisted kit | `assisted_required` |
| No profile mapped for the brand | Existing assisted kit | `assisted_required` |
| 10/10 uploads used | No request is made; reason includes the reset date | `assisted_required` |
| Provider returns 429 | Mark the month exhausted; reason includes reset | `assisted_required` |
| TikTok on Free | Excluded before the request | `assisted_required` |
| Platform not connected in Upload-Post | The other platforms still publish | `assisted_required` for that platform |
| Platform unsupported for the media type | Text/photo limitation | `assisted_required` |
| Provider auth/network/5xx error | The batch falls back | `assisted_required` |
| Provider still processing after 2 minutes | Marked failed with a “check before retrying” message | `failed` |

The monthly counter lives in `provider_usage`:

- one row per provider + UTC month (`YYYY-MM`);
- `used`, `limit_value`, `last_reset`, `exhausted`;
- updated from the API's `usage` block when present, otherwise incremented once per accepted request;
- the provider is the source of truth; if the local count is lower than the account's real count, the next 429 corrects it.

Reset date shown in Settings is the first day of the next UTC month. If Upload-Post's billing date differs, the `last_reset` from the API is displayed and the next 429 is still handled safely.

## Media requirements

- **Video:** local file or a public R2 URL. R2 without `R2_PUBLIC_BASE_URL` cannot be sent (Upload-Post needs a public HTTPS URL); those variants fall back to assisted.
- **Photos:** up to 10 images, local or public R2 URLs.
- **Text:** caption only.
- **Audio/files:** not a publishable media type; the post falls back to assisted.

The existing asset limits still apply (300 MB upload; video platform limits are enforced by Upload-Post).

## What is not built yet

- Comment ingestion and reply sync from Upload-Post webhooks (the provider supports it; the hub's inbox is still seeded/manual).
- Analytics sync into `metrics_daily`.
- Automatic refresh of profile connections on page load (the Refresh button is explicit).
- Deleting the remote Upload-Post profile when removing the local mapping; the local remove is non-destructive.
- Upload-Post scheduled posts (`scheduled_date`); the hub schedules and calls the provider at publish time.

## Test checklist

1. Without a key: Settings shows “No API key”; a post still produces assisted attempts.
2. With a key but no profile: publish produces assisted attempts with “No automatic publisher…”.
3. Map a profile and connect at least X + LinkedIn: publish a text post; verify one request, two published results, and one upload consumed.
4. Publish a video post to X + LinkedIn + TikTok on Free: verify X/LinkedIn publish, TikTok is assisted with the paid-plan message, and only one upload is consumed.
5. Set `provider_usage` to `used=10, limit=10` for the current month: publish; verify **no network request** and every target is assisted with the reset date.
6. Return `used=0`: publish again; verify the counter increments once for a multi-platform post.
7. Simulate a 429 from the provider (or set a wrong key): verify the fallback and the reason in the publish log.
8. Delete the local profile; verify the remote profile is untouched and the brand falls back to assisted.

## Files

| File | Role |
|---|---|
| `src/lib/providers/uploadpost.ts` | API client, profiles, quota, batching, polling, fallback |
| `src/lib/publishers/index.ts` | Chooses the provider, writes per-platform attempts |
| `src/components/provider-settings.tsx` | Settings card |
| `src/app/actions/provider.ts` | Connect, refresh, remove |
| `src/lib/db.ts` | `provider_profiles`, `provider_usage` |
| `src/lib/types.ts` | `ProviderProfile`, `ProviderUsage` |

## Postiz relationship

Postiz is **not required** for this path. It remains optional if you want its separate scheduler/team UI. It does not remove app approvals, and a self-hosted deployment still needs your platform credentials. See [POSTIZ-ZERO-BUDGET.md](./POSTIZ-ZERO-BUDGET.md#do-we-still-need-postiz).
