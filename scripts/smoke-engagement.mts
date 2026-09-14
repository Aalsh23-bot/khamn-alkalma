import {
  encodeChallenge,
  decodeChallenge,
  randomChallengeAnswer,
} from "../src/lib/game/challenge.ts";
import { evaluateNewAchievements } from "../src/lib/game/achievement-logic.ts";
import { defaultAchievements } from "../src/lib/game/achievements.ts";
import { defaultStats, defaultStages } from "../src/lib/game/storage.ts";
import { buildMonthCells, shiftMonth } from "../src/lib/game/calendar.ts";

const a = randomChallengeAnswer();
const code = encodeChallenge(a);
const back = decodeChallenge(code);
console.log({ a, code, back, ok: back === a });

const bad = decodeChallenge("zzzzzz");
console.log({ bad });

const cells = buildMonthCells("2026-09");
console.log({ cells: cells.length, first: cells.find(Boolean), month: shiftMonth("2026-09", -1) });

const newly = evaluateNewAchievements(defaultAchievements(), {
  stats: { ...defaultStats(), currentStreak: 7, maxStreak: 7, wins: 1 },
  stages: { ...defaultStages(), unlocked: 100 },
  won: true,
  guessCount: 1,
  stageLevel: 100,
  mode: "daily",
});
console.log({ newly });
