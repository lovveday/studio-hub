import { all, getDb } from "../src/lib/db";

getDb();
const tables = [
  "users",
  "brands",
  "brand_facts",
  "knowledge_items",
  "posts",
  "post_variants",
  "comments",
  "notifications",
  "metrics_daily",
  "reports",
];

console.log("Studio Hub database initialised at data/app.db");
for (const table of tables) {
  const row = all<{ c: number }>(`SELECT count(*) AS c FROM ${table}`)[0];
  console.log(`  ${table.padEnd(18)} ${row?.c ?? 0}`);
}
