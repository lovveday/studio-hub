# API connections and keys

Studio Hub can be configured from the app. Provider keys are encrypted with the deployment key and never returned to the browser after saving.

## Required for the core loop

| Capability | Key | Notes |
|---|---|---|
| AI writing and extraction | Gemini | DeepSeek is an optional text-only fallback |
| Vision / Virality Lab | Gemini | No alternative adapter yet |
| Voice | Deepgram **or** Whisper **or** Gemini | Auto order: Deepgram → Whisper → Gemini |
| Primary publishing | Upload-Post | 10 free uploads/month, 2 profiles, no TikTok on Free |
| Secondary publishing | SocialAPI.ai Hobby | 2 brands, 10 posts/month; used after Upload-Post is exhausted |

## Optional

| Capability | Keys |
|---|---|
| Large media / public URLs | R2 account ID, access key, secret, bucket, public base URL |
| Direct OAuth | Meta App ID/secret, Google client ID/secret, LinkedIn client ID/secret, X client ID/secret, TikTok client key/secret |
| Text fallback | DeepSeek |
| Email/WhatsApp/Market Pulse | Not wired yet; keys do not unlock a feature yet |

## Where to enter them

**Settings → API connections**:

1. **Primary publishing** — Upload-Post key, plan, free limit.
2. **Secondary publishing** — SocialAPI key, free limit, brand connection and per-platform account links.
3. **AI and voice** — Gemini, DeepSeek, Deepgram, Whisper (OpenAI/Groq/self-hosted), preferred transcription provider.
4. **Large media storage** — R2 fields.
5. **Direct platform apps** — optional OAuth apps.
6. **App URL and support** — public URL used in callbacks and approval links.

Every card has Save, Test (where applicable) and Remove.

## Encryption key

If `APP_ENCRYPTION_KEY` is set, it is used. Otherwise the app creates:

```text
data/.app-key
```

The app and worker share it. Include `data/` in backups. Losing `.app-key` means saved provider keys must be re-entered. The key never leaves the server.

## Whisper presets

| Provider | Base URL | Model |
|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `whisper-1` |
| Groq | `https://api.groq.com/openai/v1` | `whisper-large-v3-turbo` |
| Self-hosted | your endpoint, e.g. `http://localhost:8000/v1` | your served model |

A local HTTP endpoint requires **Allow local/private Whisper endpoint** and is restricted to localhost/private IPs. HTTPS is required for remote endpoints.

## SocialAPI

- Base URL: `https://api.social-api.ai/v1`
- Auth: `Authorization: Bearer sapi_key_...`
- Hobby: 2 brands, 10 posts/month.
- Connecting a platform opens SocialAPI's consent page and returns to `/api/providers/socialapi/callback`.
- The free plan may not cover every platform/brand; uncovered targets remain assisted.

## Failure routing

1. Upload-Post while quota remains.
2. SocialAPI after Upload-Post is exhausted/unavailable.
3. Assisted mode when both are exhausted or the platform/account is unsupported.

A timeout from a provider is **not** retried on the other provider, to avoid duplicate posts. Check the provider before retrying an ambiguous result.

## Environment fallback

Existing `.env.local` keys continue to work and are marked “environment” in the UI. Saving a key in the app moves that provider to the encrypted vault. No provider key needs to remain in `.env.local` for a new install.
