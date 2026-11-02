export type Platform =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "x"
  | "linkedin"
  | "youtube";

export type PlatformMeta = {
  label: string;
  short: string;
  color: string;
  soft: string;
  limit: number;
  handleHint: string;
  deepLink: (text: string) => string;
  mediaSpec: string;
  assistedNote: string;
};

export const PLATFORMS: Record<Platform, PlatformMeta> = {
  facebook: {
    label: "Facebook",
    short: "FB",
    color: "#1877F2",
    soft: "#E7F0FF",
    limit: 63206,
    handleHint: "Page composer",
    deepLink: () => "https://www.facebook.com/",
    mediaSpec: "Feed 4:5 or 1.91:1 · Reels 9:16 · Stories 9:16",
    assistedNote: "Open your Page, paste the caption, attach the media, then paste the first comment.",
  },
  instagram: {
    label: "Instagram",
    short: "IG",
    color: "#E1306C",
    soft: "#FFE9F2",
    limit: 2200,
    handleHint: "Feed, Reel or Story",
    deepLink: () => "https://www.instagram.com/",
    mediaSpec: "Feed 4:5 · Reels 9:16 · Stories 9:16 · carousel 10 items",
    assistedNote: "Choose Feed / Reel / Story, paste the caption, attach the media, then post the first comment.",
  },
  tiktok: {
    label: "TikTok",
    short: "TT",
    color: "#111111",
    soft: "#EFEFEF",
    limit: 2200,
    handleHint: "Video / photo post",
    deepLink: () => "https://www.tiktok.com/upload",
    mediaSpec: "9:16 vertical · MP4/MOV · check current duration limit",
    assistedNote: "Upload the vertical video, paste the caption, and add the first comment natively if available.",
  },
  x: {
    label: "X",
    short: "X",
    color: "#111111",
    soft: "#EFEFEF",
    limit: 280,
    handleHint: "Post or thread",
    deepLink: (text) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text.slice(0, 280))}`,
    mediaSpec: "1:1, 16:9 or 4:5 · up to 4 images · short video",
    assistedNote: "X opens with the text pre-filled. Attach media and post the first comment as a self-reply.",
  },
  linkedin: {
    label: "LinkedIn",
    short: "LI",
    color: "#0A66C2",
    soft: "#E8F1FB",
    limit: 3000,
    handleHint: "Personal or company page",
    deepLink: () => "https://www.linkedin.com/feed/?shareActive=true",
    mediaSpec: "1:1, 4:5 or 16:9 · PDF carousel · video",
    assistedNote: "Open the composer, paste the caption, attach media, and add the first comment.",
  },
  youtube: {
    label: "YouTube",
    short: "YT",
    color: "#FF0000",
    soft: "#FFECEC",
    limit: 5000,
    handleHint: "Video or Short",
    deepLink: () => "https://studio.youtube.com",
    mediaSpec: "16:9 long-form · 9:16 Shorts · thumbnail 1280×720",
    assistedNote: "Upload the video, paste the description, set the thumbnail, and pin a first comment.",
  },
};

export const PLATFORM_ORDER: Platform[] = [
  "instagram",
  "facebook",
  "tiktok",
  "x",
  "linkedin",
  "youtube",
];

export function platformMeta(platform: string): PlatformMeta {
  return PLATFORMS[platform as Platform] ?? PLATFORMS.instagram;
}

export function isPlatform(value: string): value is Platform {
  return value in PLATFORMS;
}
