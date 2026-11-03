import type { AssetRow, Post, PostVariant, SocialAccount } from "../types";

export type PublishInput = {
  post: Post;
  variant: PostVariant;
  assets: AssetRow[];
  account: SocialAccount;
};

export type PublishResult = {
  status: "published" | "assisted_required" | "failed";
  externalId?: string;
  externalUrl?: string;
  error?: string;
};

export interface SocialAdapter {
  platform: string;
  publish(input: PublishInput): Promise<PublishResult>;
}
