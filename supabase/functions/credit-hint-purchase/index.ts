/**
 * Credits hint packs ONLY after RevenueCat verifies the store transaction
 * belongs to the authenticated app user. Duplicate transaction_id is rejected
 * by the unique ledger constraint / idempotent RPC.
 *
 * Secrets (required): SUPABASE_SERVICE_ROLE_KEY, REVENUECAT_SECRET_KEY, SUPABASE_ANON_KEY
 * Auth: Bearer user JWT (required)
 * Body: { product_id, store_product_id?, transaction_id, device_id?, app_user_id? }
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

function collectNonSubs(
  nons: Record<string, RcNonSub[] | undefined>,
  ...keys: string[]
): RcNonSub[] {
  const out: RcNonSub[] = [];
  for (const key of keys) {
    const list = nons[key];
    if (Array.isArray(list)) out.push(...list);
  }
  return out;
}

function transactionMatches(entry: RcNonSub, transactionId: string): boolean {
  const tid = transactionId.trim();
  if (!tid) return false;
  const ids = [entry.id, entry.store_transaction_id]
    .filter(Boolean)
    .map((x) => String(x));
  return ids.some((id) => id === tid || id.includes(tid) || tid.includes(id));
}

async function subscriberHasTransaction(opts: {
  secret: string;
  appUserId: string;
  productId: string;
  storeProductId: string;
  transactionId: string;
}): Promise<boolean> {
  const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(opts.appUserId)}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${opts.secret}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) return false;
  const body = await res.json();
  const nons = (body?.subscriber?.non_subscriptions ?? {}) as Record<
    string,
    RcNonSub[] | undefined
  >;
  const candidates = collectNonSubs(
    nons,
    opts.storeProductId,
    opts.productId,
    `app.khamsa.game.${opts.productId}`,
  );
  return candidates.some((t) => transactionMatches(t, opts.transactionId));
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
    product_id?: string;
    store_product_id?: string;
    transaction_id?: string;
    device_id?: string;
    app_user_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const productId = (body.product_id ?? "").trim();
  const transactionId = (body.transaction_id ?? "").trim();
  const storeProductId = (body.store_product_id ?? productId).trim();
  const deviceId = (body.device_id ?? "").trim();
  const requestedAppUser = (body.app_user_id ?? user.id).trim() || user.id;

  // Must credit only the authenticated user's RevenueCat identity.
  const allowedAppUsers = new Set([user.id, `user_${user.id}`]);
  if (!allowedAppUsers.has(requestedAppUser)) {
    return json(403, { error: "app_user_mismatch" });
  }

  const hints = PACKS[productId];
  if (!hints || transactionId.length < 4) {
    return json(400, { error: "invalid_payload" });
  }

  let found = false;
  try {
    for (const appUserId of [requestedAppUser, user.id, `user_${user.id}`]) {
      found = await subscriberHasTransaction({
        secret: rcSecret,
        appUserId,
        productId,
        storeProductId,
        transactionId,
      });
      if (found) break;
    }
  } catch (e) {
    return json(502, {
      error: "revenuecat_error",
      detail: e instanceof Error ? e.message : "unknown",
    });
  }

  if (!found) {
    return json(403, { error: "transaction_not_found_for_user" });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.rpc("credit_hint_purchase", {
    p_device_id: deviceId.length >= 8 ? deviceId : `user_${user.id}`,
    p_transaction_id: transactionId,
    p_product_id: productId,
    p_store_product_id: storeProductId,
    p_hints: hints,
    p_user_id: user.id,
  });

  if (error) {
    // Unique violation → already credited; return current balance for this user/device.
    if (/unique|duplicate|already/i.test(error.message)) {
      const { data: bal } = await admin.rpc("get_hint_balance", {
        p_device_id: deviceId.length >= 8 ? deviceId : `user_${user.id}`,
      });
      return json(200, { ok: true, balance: bal ?? 0, already_credited: true });
    }
    return json(500, { error: error.message });
  }

  return json(200, { ok: true, balance: data });
});
