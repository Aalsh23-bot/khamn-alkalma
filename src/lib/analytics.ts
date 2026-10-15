import { Capacitor } from "@capacitor/core";
import { getSupabase } from "@/lib/supabase/client";
import { durableSetItem } from "@/lib/game/durable-storage";

const DEVICE_KEY = "khamsa_anon_device_id_v1";
const QUEUE_KEY = "khamsa_analytics_queue_v1";
const MAX_QUEUE = 40;
const FLUSH_EVERY_MS = 8_000;

export type AnalyticsEventName =
  | "app_open"
  | "game_start"
  | "game_end"
  | "hint_used"
  | "ad_watched"
  | "ad_error"
  | "purchase"
  | "stage_progress"
  | "ad_report";

export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

type QueuedEvent = {
  name: AnalyticsEventName;
  payload: AnalyticsPayload;
  created_at: string;
};

function readQueue(): QueuedEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(events: QueuedEvent[]) {
  try {
    const trimmed = events.slice(-MAX_QUEUE);
    const raw = JSON.stringify(trimmed);
    localStorage.setItem(QUEUE_KEY, raw);
    durableSetItem(QUEUE_KEY, raw);
  } catch {
    /* ignore */
  }
}

/** Stable anonymous device id (UUID). Never IDFA / email / account. */
export function getAnonymousDeviceId(): string {
  if (typeof window === "undefined") return "server";
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
      durableSetItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushAnalytics();
  }, FLUSH_EVERY_MS);
}

/** Queue an anonymous product event (batched to Supabase). */
export function trackEvent(name: AnalyticsEventName, payload: AnalyticsPayload = {}): void {
  if (typeof window === "undefined") return;
  const queue = readQueue();
  queue.push({
    name,
    payload: {
      ...payload,
      platform: Capacitor.getPlatform(),
    },
    created_at: new Date().toISOString(),
  });
  writeQueue(queue);
  scheduleFlush();
}

export async function flushAnalytics(): Promise<void> {
  if (flushing) return;
  const sb = getSupabase();
  if (!sb) return;
  const queue = readQueue();
  if (queue.length === 0) return;
  flushing = true;
  try {
    const deviceId = getAnonymousDeviceId();
    const rows = queue.map((e) => ({
      device_id: deviceId,
      name: e.name,
      payload: e.payload,
      created_at: e.created_at,
      app_version: "1.0.2",
      platform:
        typeof e.payload.platform === "string" ? e.payload.platform : Capacitor.getPlatform(),
    }));
    const { error } = await sb.from("analytics_events").insert(rows);
    if (!error) writeQueue([]);
  } catch {
    /* keep queue for retry */
  } finally {
    flushing = false;
  }
}

/** Report a bad ad — also stored in ad_reports via dedicated helper. */
export async function submitAdReport(input: {
  reason: string;
  note?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "الخدمة غير متاحة الآن" };
  const deviceId = getAnonymousDeviceId();
  const row = {
    device_id: deviceId,
    reason: input.reason.slice(0, 80),
    note: (input.note ?? "").slice(0, 500) || null,
    app_version: "1.0.2",
    platform: Capacitor.getPlatform(),
  };
  try {
    const { error } = await sb.from("ad_reports").insert(row);
    if (error) return { ok: false, error: error.message };
    trackEvent("ad_report", { reason: row.reason });
    // Best-effort notify edge function (email). Failures are non-blocking.
    try {
      await sb.functions.invoke("ad-report-notify", { body: row });
    } catch {
      /* email optional */
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "تعذّر الإرسال" };
  }
}
