import { useEffect, useState } from "react";
import { MAX_GUESSES, WORD_LENGTH } from "@/lib/game/normalize";
import type { LetterStatus } from "@/lib/game/evaluate";
import { sfxFlip } from "@/lib/game/audio";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<LetterStatus | "empty" | "tbd", string> = {
  empty: "border-tile-border bg-tile-empty text-fg",
  tbd: "border-fg/70 bg-bg-elevated text-fg",
  correct: "border-correct bg-correct text-correct-fg",
  present: "border-present bg-present text-present-fg",
  absent: "border-absent bg-absent text-absent-fg",
};

function Tile({
  letter,
  status,
  delay,
  index,
  revealing,
  bounce,
  ghost,
  typed,
}: {
  letter: string;
  status: LetterStatus | "empty" | "tbd";
  delay: number;
  index: number;
  revealing: boolean;
  bounce: boolean;
  ghost?: string;
  typed: boolean;
}) {
  const [shown, setShown] = useState<LetterStatus | "empty" | "tbd">(
    revealing ? "tbd" : status,
  );
  const [flipping, setFlipping] = useState(false);

  useEffect(() => {
    if (!revealing || status === "empty" || status === "tbd") {
      setShown(status);
      setFlipping(false);
      return;
    }
    setShown("tbd");
    setFlipping(true);
    const tick = window.setTimeout(() => {
      try {
        sfxFlip(index);
      } catch {
        /* audio optional */
      }
    }, delay);
    const mid = window.setTimeout(() => setShown(status), delay + 250);
    const end = window.setTimeout(() => setFlipping(false), delay + 500);
    return () => {
      window.clearTimeout(tick);
      window.clearTimeout(mid);
      window.clearTimeout(end);
    };
  }, [revealing, status, delay, letter, index]);

  const display = letter || (!revealing && shown === "empty" ? ghost : "") || "";

  return (
    <div className="tile aspect-square w-full [perspective:600px]">
      <div
        className={cn(
          "tile-inner flex h-full w-full items-center justify-center rounded-[20%] border-2 text-[length:calc(var(--tile)*0.52)] font-bold leading-none",
          STATUS_CLASS[shown],
          flipping && "flip",
          bounce && "win",
          typed && letter && !revealing && "pop",
          !letter && ghost && shown === "empty" && "text-subtle",
        )}
        style={{
          animationDelay: flipping ? `${delay}ms` : bounce ? `${delay}ms` : undefined,
        }}
      >
        <span className="select-none">{display}</span>
      </div>
    </div>
  );
}

export function Board({
  guesses,
  evaluations,
  current,
  answer,
  status,
  revealing,
  shake,
  hintedCols,
}: {
  guesses: string[];
  evaluations: LetterStatus[][];
  current: string;
  answer: string;
  status: "playing" | "won" | "lost";
  revealing: boolean;
  shake: boolean;
  hintedCols: number[];
}) {
  const rows = Array.from({ length: MAX_GUESSES }, (_, r) => {
    const submitted = guesses[r];
    const isCurrent = r === guesses.length && status === "playing";
    const letters = submitted
      ? Array.from(submitted)
      : isCurrent
        ? Array.from(current)
        : [];
    return { letters, evals: evaluations[r], isCurrent, submitted: Boolean(submitted) };
  });

  return (
    <div
      className="mx-auto grid w-full max-w-[min(100%,calc(var(--tile)*5+16px))] gap-1.5"
      role="grid"
      aria-label="لوحة التخمين"
    >
      {rows.map((row, r) => {
        const shaking = shake && row.isCurrent;
        const bouncing = status === "won" && r === guesses.length - 1 && !revealing;
        const rowRevealing = revealing && r === guesses.length - 1;
        return (
          <div
            key={r}
            className={cn("grid grid-cols-5 gap-1.5", shaking && "row-shake")}
            role="row"
          >
            {Array.from({ length: WORD_LENGTH }, (_, c) => {
              const letter = row.letters[c] ?? "";
              const statusTile: LetterStatus | "empty" | "tbd" = row.submitted
                ? (row.evals?.[c] ?? "absent")
                : letter
                  ? "tbd"
                  : "empty";
              const ghost =
                !letter && hintedCols.includes(c) ? answer[c] : undefined;
              return (
                <Tile
                  key={c}
                  letter={letter}
                  status={statusTile}
                  delay={c * 300}
                  index={c}
                  revealing={rowRevealing}
                  bounce={bouncing}
                  ghost={ghost}
                  typed={row.isCurrent}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
