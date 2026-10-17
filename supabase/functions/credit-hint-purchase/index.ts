/**
 * Credits hint packs ONLY after RevenueCat verifies the store transaction
 * belongs to the authenticated (or anonymous) app user. Product + hint count
 * come from RevenueCat subscriber data — never from the client body.
 *
 * Secrets: SUPABASE_SERVICE_ROLE_KEY, REVENUECAT_SECRET_KEY, SUPABASE_ANON_KEY
 * Auth: Bearer user JWT (required; anonymous OK)
 *
 * Body (purchase): { transaction_id, app_user_id?, device_id? }
 * Body (sync/restore): { sync: true, app_user_id?, device_id? }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const PACKS: Record<string, number> = {
  hints_5: 5,
  hints_20: 20,
  hints_60: 60,
};

type RcNonSub = {
  id?: string;
  store_transaction_id?: string;
  purchase_date?: string;
};

type FoundPurchase = {
  productId: keyof typeof PACKS;
  storeProductId: string;
  transactionId: string;
  hints: number;
};

function cors(res: Response) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Access-Control-Allow-Headers",
    "authorization, x-client-info, apikey, content-type",
  );
  return new Response(res.body, { status: res.status, headers });
}

function json(status: number, body: Record<string, unknown>) {
  return cors(
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
}

/** Map RevenueCat / store product identifiers to our pack ids. */
function normalizePackId(raw: string): keyof typeof PACKS | null {
  const id = raw.trim();
  if (!id) return null;
  if (id in PACKS) return id as keyof typeof PACKS;
  for (const pack of Object.keys(PACKS)) {
    if (id === pack || id.endsWith(`.${pack}`) || id.endsWith(`_${pack}`)) {
      return pack as keyof typeof PACKS;
    }
  }
  return null;
}

function transactionMatches(entry: RcNonSub, transactionId: string): boolean {
  const tid = transactionId.trim();
  if (!tid) return false;
  const ids = [entry.id, entry.store_transaction_id]
    .filter(Boolean)
    .map((x) => String(x).trim());
  // Exact match only — never substring / includes.
  return ids.some((id) => id === tid);
}

function entryTransactionId(entry: RcNonSub): string | null {
  const tid = (entry.store_transaction_id || entry.id || "").trim();
  return tid.length >= 4 ? tid : null;
}

async function fetchSubscriberNonSubs(
  secret: string,
  appUserId: string,
): Promise<Record<string, RcNonSub[]>> {
  const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return {};
  const body = await res.json();
  const nons = body?.subscriber?.non_subscriptions;
  if (!nons || typeof nons !== "object") return {};
  return nons as Record<string, RcNonSub[]>;
}

function listPurchasesFromSubscriber(
  nons: Record<string, RcNonSub[]>,
): FoundPurchase[] {
  const out: FoundPurchase[] = [];
  for (const [rawProduct, list] of Object.entries(nons)) {
    const productId = normalizePackId(rawProduct);
    if (!productId || !Array.isArray(list)) continue;
    const hints = PACKS[productId];
    for (const entry of list) {
      const transactionId = entryTransactionId(entry);
      if (!transactionId) continue;
      out.push({
        productId,
        storeProductId: rawProduct,
        transactionId,
        hints,
      });
    }
  }
  return out;
}

async function findVerifiedPurchase(opts: {
  secret: string;
  appUserIds: string[];
  transactionId: string;
}): Promise<FoundPurchase | null> {
  for (const appUserId of opts.appUserIds) {
    const nons = await fetchSubscriberNonSubs(opts.secret, appUserId);
    for (const [rawProduct, list] of Object.entries(nons)) {
      const productId = normalizePackId(rawProduct);
      if (!productId || !Array.isArray(list)) continue;
      const matched = list.find((e) => transactionMatches(e, opts.transactionId));
      if (!matched) continue;
      // Always persist the canonical store transaction id from RevenueCat
      // (same id used by restore/webhook) — never the client-supplied string.
      const canonical = entryTransactionId(matched);
      if (!canonical) continue;
      return {
        productId,
        storeProductId: rawProduct,
        transactionId: canonical,
        hints: PACKS[productId],
      };
    }
  }
  return null;
}

/** Minimal service-role client surface (avoids Deno createClient generic noise). */
type AdminClient = {
  from: (
    table: string,
  ) => {
    select: (cols: string) => {
      eq: (
        col: string,
        val: string,
      ) => {
        maybeSingle: () => Promise<{ data: { balance?: number; transaction_id?: string } | null }>;
      };
    };
  };
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string; code?: string } | null }>;
};

async function creditForUser(
  admin: AdminClient,
  opts: {
    userId: string;
    transactionId: string;
    productId: string;
    storeProductId: string;
    hints: number;
    deviceId: string | null;
  },
): Promise<{ balance: number; already_credited: boolean }> {
  // Peek ledger first so we can report already_credited without treating
  // unrelated unique violations as success.
  const { data: existing } = await admin
    .from("hint_purchase_ledger")
    .select("transaction_id")
    .eq("transaction_id", opts.transactionId)
    .maybeSingle();

  const { data, error } = await admin.rpc("credit_hint_purchase_for_user", {
    p_user_id: opts.userId,
    p_transaction_id: opts.transactionId,
    p_product_id: opts.productId,
    p_store_product_id: opts.storeProductId,
    p_hints: opts.hints,
    p_device_id: opts.deviceId,
  });

  if (error) {
    // Only treat ledger primary-key conflict as already credited.
    const code = (error as { code?: string }).code ?? "";
    const msg = error.message ?? "";
    if (
      existing ||
      (code === "23505" && /hint_purchase_ledger|transaction_id/i.test(msg))
    ) {
      const { data: row } = await admin
        .from("hint_balances")
        .select("balance")
        .eq("user_id", opts.userId)
        .maybeSingle();
      return {
        balance: Number(row?.balance ?? 0),
        already_credited: true,
      };
    }
    throw new Error(error.message);
  }

  return {
    balance: Number(data ?? 0),
    already_credited: Boolean(existing),
  };
}

function resolveAppUserIds(userId: string, requested?: string): string[] {
  const ids = [userId, `user_${userId}`];
  if (requested && requested.trim()) {
    const r = requested.trim();
    const allowed = new Set([userId, `user_${userId}`]);
    if (!allowed.has(r)) {
      return [];
    }
    ids.unshift(r);
  }
  return [...new Set(ids)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }
  if (req.method !== "POST") {
    return json(405, { error: "method" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const rcSecret = Deno.env.get("REVENUECAT_SECRET_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return json(500, { error: "server_misconfigured" });
  }
  if (!rcSecret) {
    return json(503, { error: "revenuecat_secret_missing" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "auth_required" });
  }

  const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user?.id) {
    return json(401, { error: "invalid_user" });
  }

  let body: {
    transaction_id?: string;
    device_id?: string;
    app_user_id?: string;
    sync?: boolean;
    // Ignored for credit amount — kept only for backward-compatible clients.
    product_id?: string;
    store_product_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const deviceId = (body.device_id ?? "").trim();
  const deviceOrNull = deviceId.length >= 8 ? deviceId : null;
  const appUserIds = resolveAppUserIds(user.id, body.app_user_id);
  if (appUserIds.length === 0) {
    return json(403, { error: "app_user_mismatch" });
  }

  const admin = createClient(supabaseUrl, serviceKey) as unknown as AdminClient;

  // Restore / sync path: credit every verified pack purchase missing from ledger.
  if (body.sync === true) {
    let credited = 0;
    let balance = 0;
    try {
      const seen = new Set<string>();
      for (const appUserId of appUserIds) {
        const nons = await fetchSubscriberNonSubs(rcSecret, appUserId);
        for (const purchase of listPurchasesFromSubscriber(nons)) {
          if (seen.has(purchase.transactionId)) continue;
          seen.add(purchase.transactionId);
          const result = await creditForUser(admin, {
            userId: user.id,
            transactionId: purchase.transactionId,
            productId: purchase.productId,
            storeProductId: purchase.storeProductId,
            hints: purchase.hints,
            deviceId: deviceOrNull,
          });
          balance = result.balance;
          if (!result.already_credited) credited += 1;
        }
      }
      if (seen.size === 0) {
        const { data: row } = await admin
          .from("hint_balances")
          .select("balance")
          .eq("user_id", user.id)
          .maybeSingle();
        balance = Number(row?.balance ?? 0);
      }
    } catch (e) {
      return json(502, {
        error: "sync_failed",
        detail: e instanceof Error ? e.message : "unknown",
      });
    }
    return json(200, { ok: true, balance, credited });
  }

  const transactionId = (body.transaction_id ?? "").trim();
  if (transactionId.length < 4) {
    return json(400, { error: "invalid_payload" });
  }

  let found: FoundPurchase | null = null;
  try {
    found = await findVerifiedPurchase({
      secret: rcSecret,
      appUserIds,
      transactionId,
    });
  } catch (e) {
    return json(502, {
      error: "revenuecat_error",
      detail: e instanceof Error ? e.message : "unknown",
    });
  }

  if (!found) {
    return json(403, { error: "transaction_not_found_for_user" });
  }

  try {
    const result = await creditForUser(admin, {
      userId: user.id,
      transactionId: found.transactionId,
      productId: found.productId,
      storeProductId: found.storeProductId,
      hints: found.hints,
      deviceId: deviceOrNull,
    });
    return json(200, {
      ok: true,
      balance: result.balance,
      already_credited: result.already_credited,
      product_id: found.productId,
      hints: found.hints,
    });
  } catch (e) {
    return json(500, {
      error: e instanceof Error ? e.message : "credit_failed",
    });
  }
});
