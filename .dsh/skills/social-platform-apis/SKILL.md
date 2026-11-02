---
name: social-platform-apis
description: Use when implementing or debugging publishing, first comments, comment replies, likes, tagging, collaborators, stories or analytics for Facebook, Instagram, TikTok, X, LinkedIn or YouTube. Encodes the capability matrix, approval gates and assisted-mode fallbacks for Studio Hub.
---

# Social platform APIs for Studio Hub

## Non-negotiables

- Do not use unofficial/private APIs, scraping, password login or automation that violates platform terms.
- Every adapter must expose a `capabilities()` map. The UI renders actions from that map. Unsupported actions become **assisted tasks**, not silent failures.
- Token refresh happens before publish. If refresh fails, mark the channel `needs_reconnect` and pause dependent posts.
- Publishing is idempotent. One target + one version = one idempotency key. On retry, check for an existing external post ID first.
- Auto-engagement is capped and killable. Complaints, legal, health and refund comments always escalate to a human.

## Capability matrix (verify at adapter build time)

| Platform | Publish | First comment | Reply | Like comment | Tag / collaborate | Stories | Gate |
|---|---|---|---|---|---|---|---|
| Facebook Page | text, photo, video, Reel, link | yes | yes | verify Pages API | mentions in text; limited tags | Page Stories (verify) | Meta App Review |
| Instagram | image, Reel, carousel, Story | yes | yes | yes since Apr 2026 (FB-linked) | `user_tags`; collaborators on feed/Reels | media only | Meta App Review |
| TikTok | Direct Post after audit (video/photo) | no | partner-gated | no | `@` in caption | no | Content Posting audit |
| X | text, media, thread | yes via self-reply | yes | yes | `@` text | no | pay-per-use credits |
| LinkedIn | member or organization | yes | yes nested | yes | URN mentions | no | Community Management API |
| YouTube | video/Short upload | yes top-level | yes | no official | no | Shorts = video | OAuth verification + quota |

## Adapter contract

```ts
interface SocialAdapter {
  platform: Platform;
  capabilities(): CapabilitySet;
  validate(input: PublishInput): ValidationResult;
  upload(asset: AssetRef): Promise<PlatformMediaRef>;
  publish(input: PublishInput): Promise<PublishResult>;
  comment(mediaId: string, text: string): Promise<ExternalComment>;
  reply(commentId: string, text: string): Promise<ExternalComment>;
  likeComment?(commentId: string): Promise<void>;
  listComments(mediaId: string, cursor?: string): Promise<CommentPage>;
  metrics(mediaId: string): Promise<MetricSnapshot[]>;
}
```

## Media specs to validate before scheduling

- Instagram feed: 4:5 to 1.91:1. Reels/Stories: 9:16. Carousel: up to 10 items.
- TikTok: 9:16 vertical. Confirm the current duration limit at build time.
- YouTube: 16:9 long-form, 9:16 Shorts. Thumbnail 1280×720.
- X: 1:1, 16:9 or 4:5; up to 4 images.
- LinkedIn: 1:1, 4:5 or 16:9.
- Facebook: feed 4:5/1.91:1; Reels/Stories 9:16.

## Approval runbook

- Meta: developer app → business verification → App Review for `pages_manage_posts`, `pages_read_engagement`, `pages_manage_engagement`, `instagram_basic`, `instagram_content_publish`, `instagram_manage_comments`, `instagram_manage_engagement`, `business_management`; privacy policy + data deletion callback + screencast.
- Google: Cloud project → YouTube Data API → OAuth consent screen verification for upload scope.
- LinkedIn: app → Community Management API / Marketing Developer Platform access → company page admin.
- X: developer account → credits → spending limit.
- TikTok: developer app → Content Posting API audit.

## Assisted mode (until approvals land)

Generate a post kit with: caption, hashtags, first comment, media spec, character count, deep link. Record `mark posted`, the external URL if the user pastes it, and start the engagement watcher. This is a first-class workflow, not a hack.
