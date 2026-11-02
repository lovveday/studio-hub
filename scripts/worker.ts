import crypto from "node:crypto";
import { all, get, run } from "../src/lib/db";
import type { Post } from "../src/lib/types";

const TICK_MS = 60_000;

type UserRow = { id: string; name: string };

function notify(input: {
  userId: string;
  brandId: string;
  type: string;
  title: string;
  body: string;
  link: string;
  dedupeKey: string;
}) {
  run(
    `INSERT OR IGNORE INTO notifications
     (id, user_id, brand_id, type, title, body, link, dedupe_key, read_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
    [
      crypto.randomUUID(),
      input.userId,
      input.brandId,
      input.type,
      input.title,
      input.body,
      input.link,
      input.dedupeKey,
      new Date().toISOString(),
    ]
  );
}

function log(action: string, detail: string) {
  run(
    `INSERT INTO activity_log (id, brand_id, user_id, action, entity, entity_id, detail, created_at)
     VALUES (?, NULL, NULL, ?, 'system', NULL, ?, ?)`,
    [crypto.randomUUID(), action, detail, new Date().toISOString()]
  );
}

function tick() {
  const users = all<UserRow>("SELECT id, name FROM users");
  const now = new Date();
  const nowIso = now.toISOString();
  const in48 = new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString();
  const today = nowIso.slice(0, 10);
  let dueCount = 0;
  let prepCount = 0;
  let overdueCount = 0;

  const due = all<Post>(
    `SELECT * FROM posts WHERE status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= ?`,
    [nowIso]
  );
  for (const post of due) {
    run("UPDATE posts SET status = 'ready', updated_at = ? WHERE id = ?", [nowIso, post.id]);
    for (const user of users) {
      notify({
        userId: user.id,
        brandId: post.brand_id,
        type: "publish",
        title: `Ready to post: ${post.title}`,
        body: "The scheduled time has arrived. Open the post kit, copy the copy, and mark it posted.",
        link: `/posts/${post.id}`,
        dedupeKey: `due:${post.id}:${user.id}`,
      });
    }
    log("Post due", `${post.title} moved to ready`);
    dueCount += 1;
  }

  const prep = all<Post>(
    `SELECT * FROM posts
     WHERE status IN ('draft','needs_review') AND scheduled_at IS NOT NULL
       AND scheduled_at > ? AND scheduled_at <= ?`,
    [nowIso, in48]
  );
  for (const post of prep) {
    for (const user of users) {
      notify({
        userId: user.id,
        brandId: post.brand_id,
        type: "prep",
        title: `Prep now: ${post.title}`,
        body: "This post is inside the 48-hour prep window and still needs copy or approval.",
        link: `/posts/${post.id}`,
        dedupeKey: `prep:${post.id}:${today}:${user.id}`,
      });
    }
    prepCount += 1;
  }

  const overdue = all<Post>(
    `SELECT * FROM posts
     WHERE status IN ('draft','needs_review','approved') AND scheduled_at IS NOT NULL AND scheduled_at < ?`,
    [nowIso]
  );
  for (const post of overdue) {
    for (const user of users) {
      notify({
        userId: user.id,
        brandId: post.brand_id,
        type: "overdue",
        title: `Overdue: ${post.title}`,
        body: "The scheduled time has passed and the post is not published.",
        link: `/posts/${post.id}`,
        dedupeKey: `overdue:${post.id}:${today}:${user.id}`,
      });
    }
    overdueCount += 1;
  }

  const counts = {
    posts: Number(get<{ c: number }>("SELECT count(*) AS c FROM posts")?.c ?? 0),
    notifications: Number(get<{ c: number }>("SELECT count(*) AS c FROM notifications")?.c ?? 0),
  };
  console.log(
    `[worker ${new Date().toLocaleTimeString("en-GB")}] due=${dueCount} prep=${prepCount} overdue=${overdueCount} posts=${counts.posts} notifications=${counts.notifications}`
  );
}

console.log("Studio Hub worker started. Checking every 60 seconds. Press Ctrl+C to stop.");
tick();
setInterval(tick, TICK_MS);
