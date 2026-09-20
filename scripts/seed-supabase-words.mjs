#!/usr/bin/env node
/**
 * Seed public.words from the game lexicon (answers + tiers).
 * Usage: node scripts/seed-supabase-words.mjs
 * Requires DATABASE_URL in .env (pooler URL).
 */
import { readFileSync } from "node:fs";
import pg from "pg";

function loadEnv() {
  const raw = readFileSync(new URL("../.env", import.meta.url), "utf8");
  return Object.fromEntries(
    raw
      .split("\n")
      .filter((l) => l.includes("=") && !l.startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i), l.slice(i + 1)];
      }),
  );
}

function extractAnswers(src) {
  const m = src.match(/export const ANSWERS: string\[\] = (\[[\s\S]*?\]);/);
  if (!m) throw new Error("ANSWERS not found");
  return JSON.parse(m[1]);
}

function extractTiers(src) {
  const m = src.match(
    /export const WORD_TIERS: Record<string, UsageTier> = (\{[\s\S]*?\});/,
  );
  if (!m) throw new Error("WORD_TIERS not found");
  // strip `as const`
  const cleaned = m[1].replace(/ as const/g, "");
  // quote-safe enough for our file format
  return Function(`"use strict"; return (${cleaned});`)();
}

const env = loadEnv();
const answers = extractAnswers(
  readFileSync(new URL("../src/lib/game/words-data.ts", import.meta.url), "utf8"),
);
const tiers = extractTiers(
  readFileSync(new URL("../src/lib/game/word-tiers.ts", import.meta.url), "utf8"),
);

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
});

await client.connect();
await client.query("begin");
try {
  // Upsert in batches
  const batch = 200;
  for (let i = 0; i < answers.length; i += batch) {
    const slice = answers.slice(i, i + batch);
    const values = [];
    const params = [];
    let p = 1;
    for (let j = 0; j < slice.length; j++) {
      const word = slice[j];
      const tier = tiers[word] ?? "familiar";
      const sortIndex = i + j;
      values.push(`($${p++}, $${p++}, $${p++}, true, true)`);
      params.push(word, tier, sortIndex);
    }
    await client.query(
      `
      insert into public.words (word, tier, sort_index, is_answer, is_guessable)
      values ${values.join(",")}
      on conflict (word) do update set
        tier = excluded.tier,
        sort_index = excluded.sort_index,
        is_answer = true,
        is_guessable = true
      `,
      params,
    );
  }
  await client.query("commit");
  const { rows } = await client.query(`
    select tier, count(*)::int as n from public.words where is_answer group by 1 order by 1
  `);
  console.log("seeded answers", answers.length, rows);
} catch (e) {
  await client.query("rollback");
  throw e;
} finally {
  await client.end();
}
