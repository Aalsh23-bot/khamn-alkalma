#!/usr/bin/env node
/**
 * Upsert client VALID_GUESSES + ANSWERS into public.words.
 * Usage: node scripts/seed-guess-lexicon.mjs
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

function extractArray(src, name) {
  const m = src.match(
    new RegExp(`export const ${name}: string\\[\\] = (\\[[\\s\\S]*?\\]);`),
  );
  if (!m) throw new Error(`${name} not found`);
  return JSON.parse(m[1]);
}

const env = loadEnv();
const dataSrc = readFileSync(
  new URL("../src/lib/game/words-data.ts", import.meta.url),
  "utf8",
);
const ANSWERS = new Set(extractArray(dataSrc, "ANSWERS"));
const GUESSES = extractArray(dataSrc, "VALID_GUESSES");

const client = new pg.Client({
  connectionString: env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const all = new Map();
for (const w of GUESSES) {
  all.set(w, {
    word: w,
    is_answer: ANSWERS.has(w),
    is_guessable: true,
    tier: ANSWERS.has(w) ? "common" : "familiar",
  });
}
for (const w of ANSWERS) {
  if (!all.has(w)) {
    all.set(w, {
      word: w,
      is_answer: true,
      is_guessable: true,
      tier: "common",
    });
  } else {
    all.get(w).is_answer = true;
  }
}

const rows = [...all.values()];
console.log("upserting", rows.length, "words…");

await client.query("begin");
try {
  const chunk = 200;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const values = [];
    const params = [];
    let p = 1;
    for (const r of slice) {
      values.push(`($${p++}, $${p++}, $${p++}, $${p++}, true)`);
      params.push(r.word, r.tier, r.is_answer, r.is_guessable);
    }
    await client.query(
      `insert into public.words (word, tier, is_answer, is_guessable, active)
       values ${values.join(",")}
       on conflict (word) do update set
         tier = excluded.tier,
         is_answer = excluded.is_answer,
         is_guessable = excluded.is_guessable,
         active = true,
         updated_at = now()`,
      params,
    );
  }
  await client.query("commit");
  const count = await client.query(
    `select count(*)::int as n,
            count(*) filter (where is_guessable and active)::int as guesses,
            count(*) filter (where is_answer and active)::int as answers
     from public.words`,
  );
  console.log("done", count.rows[0]);
} catch (e) {
  await client.query("rollback");
  console.error(e);
  process.exitCode = 1;
} finally {
  await client.end();
}
