/**
 * RevenueCat server webhook: credits consumable hint packs that may have been
 * missed by the client (e.g. purchase on another device, restore gap).
 *
 * Secrets: SUPABASE_SERVICE_ROLE_KEY, REVENUECAT_WEBHOOK_SECRET
 * Auth: Authorization header must equal REVENUECAT_WEBHOOK_SECRET
 *       (configure the same value in RevenueCat → Integrations → Webhooks)
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const PACKS: Record<string, number> = {
  hints_5: 5,
  hints_20: 20,
  hints_60: 60,
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizePackId(raw: string): keyof typeof PACKS | null {
  const id = (raw ?? "").trim();
  if (!id) return null;
  if (id in PACKS) return id as keyof typeof PACKS;
  for (const pack of Object.keys(PACKS)) {
    if (id === pack || id.endsWith(`.${pack}`) || id.endsWith(`_${pack}`)) {
      return pack as keyof typeof PACKS;
    }
  }
  return null;
}

/** Resolve Supabase user uuid from RevenueCat app_user_id / aliases. */
function resolveUserId(appUserId: string, aliases: string[] = []): string | null {
  const candidates = [appUserId, ...aliases];
  for (const c of candidates) {
    const raw = (c ?? "").trim();
    if (!raw) continue;
    if (UUID_RE.test(raw)) return raw;
    const prefixed = raw.match(/^user_([0-9a-f-]{36})$/i);
    if (prefixed?.[1] && UUID_RE.test(prefixed[1])) return prefixed[1];
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }
  if (req.method !== "POST") {
    return json(405, { error: "method" });
  }

  const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET") ?? "";
  if (!webhookSecret) {
    return json(503, { error: "webhook_secret_missing" });
  }

  const auth = req.headers.get("Authorization") ?? "";
  const provided = auth.replace(/^Bearer\s+/i, "").trim();
  if (!provided || provided !== webhookSecret) {
    return json(401, { error: "unauthorized" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "server_misconfigured" });
  }

  let payload: {
    api_version?: string;
    event?: {
      type?: string;
      product_id?: string;
      transaction_id?: string;
      app_user_id?: string;
      aliases?: string[];
      environment?: string;
    };
  };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const event = payload.event;
  const type = event?.type ?? "";
  // Consumable hint packs arrive as NON_RENEWING_PURCHASE.
  if (type !== "NON_RENEWING_PURCHASE" && type !== "INITIAL_PURCHASE") {
    return json(200, { ok: true, ignored: true, type });
  }

  const productId = normalizePackId(event?.product_id ?? "");
  const transactionId = (event?.transaction_id ?? "").trim();
  if (!productId || transactionId.length < 4) {
    return json(200, { ok: true, ignored: true, reason: "not_a_hint_pack" });
  }

  const userId = resolveUserId(event?.app_user_id ?? "", event?.aliases ?? []);
  if (!userId) {
    // Purchase bound to a non-Supabase RC anonymous id — client restore will claim it after login/anon bind.
    return json(200, { ok: true, ignored: true, reason: "no_supabase_user" });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.rpc("credit_hint_purchase_for_user", {
    p_user_id: userId,
    p_transaction_id: transactionId,
    p_product_id: productId,
    p_store_product_id: event?.product_id ?? productId,
    p_hints: PACKS[productId],
    p_device_id: null,
  });

  if (error) {
    const code = (error as { code?: string }).code ?? "";
    const msg = error.message ?? "";
    if (code === "23505" && /hint_purchase_ledger|transaction_id/i.test(msg)) {
      return json(200, { ok: true, already_credited: true });
    }
    return json(500, { error: error.message });
  }

  return json(200, {
    ok: true,
    balance: data,
    product_id: productId,
    user_id: userId,
  });
});
