# 300 MB uploads with Cloudflare R2

## How it works

- The browser asks `POST /api/uploads/init` for an upload.
- **R2 configured:** the server creates an S3 multipart upload and returns presigned part URLs. The browser uploads 16 MB parts in parallel (3 at a time) **directly to R2**. The app server never receives the file bytes.
- **R2 not configured:** the browser falls back to 8 MB chunks sent to `PUT /api/uploads/local`. The server appends them to `storage/assets/`.
- On completion the server verifies the size, marks the asset `ready`, links it to the post, and shows it in the Creative card.
- Max file size: **300 MB**. Allowed: image, video, audio; any MIME is stored, with `kind` derived from the MIME type.

## R2 setup

1. Cloudflare dashboard → R2 → create a bucket (e.g. `my-social-hub-media`).
2. Create an **R2 API token** with Object Read & Write permission for that bucket.
3. Note the **Account ID**, **Access Key ID**, **Secret Access Key**.
4. Enable public access for previews:
   - either connect a custom domain (e.g. `media.yourdomain.com`), or
   - enable the `r2.dev` public URL for testing.
5. Add to `.env.local`:

```env
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=my-social-hub-media
R2_PUBLIC_BASE_URL=https://media.yourdomain.com
```

6. Restart the app. Settings → Media storage should show **R2** and **Public previews: Yes**.

## R2 CORS

Browsers upload directly to R2, so the bucket needs a CORS rule. In the R2 bucket → Settings → CORS:

```json
[
  {
    "AllowedOrigins": [
      "https://hub.yourdomain.com",
      "http://localhost:3000"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

`ExposeHeaders: ["ETag"]` is required. Without it the browser cannot read the part ETags and the upload cannot complete.

## Why this is fast

- The file goes from the browser to R2, not through the app server.
- Parallel parts use more of the connection.
- The server only signs URLs, so it stays responsive.
- 300 MB is still limited by your upload bandwidth; this design just avoids adding a second bottleneck.

## Local development

Without R2, the local fallback works and has no cloud dependency. It is slower because bytes pass through the Next.js server, and it stores files on local disk. Good for development; use R2 in production.

## Operational limits

- R2 free tier: 10 GB storage. A 300 MB video is ~0.3 GB, so about 33 videos fill the free tier.
- Add per-brand quotas and R2 lifecycle rules before onboarding many clients.
- The original master is kept; transcoded derivatives are temporary.
- Thumbnails/proxies are a worker job (next slice); for now the browser previews the original.

## Test without R2

1. Open a post → Creative → **Add up to 300 MB**.
2. Choose a 20–50 MB video.
3. Watch the progress/speed bar.
4. The file appears in the Creative card after completion.

The local path was tested end-to-end with a 20 MB file (three 8 MB chunks) and completed successfully.
