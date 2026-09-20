import { useEffect, useState } from "react";
import {
  fetchLeaderboard,
  isSupabaseConfigured,
  type LeaderboardRow,
} from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function LeaderboardPanel({
  currentUserId,
  onNeedAuth,
}: {
  currentUserId?: string | null;
  onNeedAuth?: () => void;
}) {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchLeaderboard(20)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "تعذّر تحميل لوحة الصدارة");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [configured]);

  if (!configured) {
    return (
      <p className="mt-5 text-sm leading-6 text-muted">
        لوحة الصدارة تحتاج اتصال Supabase.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium">لوحة الصدارة</p>
        {!currentUserId && onNeedAuth && (
          <button
            type="button"
            onClick={onNeedAuth}
            className="text-xs font-medium text-accent"
          >
            سجّل للظهور هنا
          </button>
        )}
      </div>

      {loading && (
        <p className="rounded-xl bg-bg px-3 py-4 text-sm text-muted">جاري التحميل…</p>
      )}
      {error && <p className="text-sm text-absent">{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p className="rounded-xl bg-bg px-3 py-4 text-sm text-muted">
          لا نتائج بعد — العب كلمة اليوم وأنت مسجّل لتظهر هنا.
        </p>
      )}
      {!loading && rows.length > 0 && (
        <ol className="divide-y divide-line overflow-hidden rounded-xl bg-bg">
          {rows.map((row, i) => {
            const mine = currentUserId && row.user_id === currentUserId;
            const name =
              row.display_name?.trim() ||
              `لاعب ${row.user_id.slice(0, 4)}`;
            return (
              <li
                key={row.user_id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5",
                  mine && "bg-accent/10",
                )}
              >
                <span className="w-6 text-center text-sm tabular-nums text-muted">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                  {name}
                  {mine ? " · أنت" : ""}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted">
                  {row.wins} فوز · سلسلة {row.current_streak}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
