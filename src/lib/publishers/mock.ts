import crypto from "node:crypto";
import type { PublishInput, PublishResult, SocialAdapter } from "./types";

/**
 * Local-only publisher used by the demo accounts.
 * It never touches a real social network.
 */
export class MockAdapter implements SocialAdapter {
  platform = "mock";

  async publish(input: PublishInput): Promise<PublishResult> {
    if (!input.variant.caption.trim()) {
      return { status: "failed", error: "Caption is empty." };
    }
    const id = `mock-${input.variant.platform}-${crypto.randomUUID().slice(0, 8)}`;
    return {
      status: "published",
      externalId: id,
      externalUrl: `https://example.com/mock/${id}`,
    };
  }
}
