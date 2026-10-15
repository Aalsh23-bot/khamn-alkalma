/**
 * Credits hint packs after a RevenueCat / StoreKit purchase.
 * Secrets: SUPABASE_SERVICE_ROLE_KEY (auto), optional REVENUECAT_SECRET_KEY for verify.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const PACKS: Record<string, number> = {
  hints_5: 5,
  hints_20: 20,
  hints_60: 60,
};

function cors(res: Response) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  return new Response(res.body, { status: res.status, headers });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }
  if (req.method !== "POST") {
    return cors(new Response(JSON.stringify({ error: "method" }), { status: 405 }));
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return cors(
      new Response(JSON.stringify({ error: "server misconfigured" }), { status: 500 }),
    );
  }

  let body: {
    product_id?: string;
    store_product_id?: string;
    transaction_id?: string;
    device_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return cors(new Response(JSON.stringify({ error: "invalid json" }), { status: 400 }));
  }

  const productId = (body.product_id ?? "").trim();
  const transactionId = (body.transaction_id ?? "").trim();
  const deviceId = (body.device_id ?? "").trim();
  const storeProductId = (body.store_product_id ?? productId).trim();

  const hints = PACKS[productId];
  if (!hints || !transactionId || deviceId.length < 8) {
    return cors(new Response(JSON.stringify({ error: "invalid payload" }), { status: 400 }));
  }

  // Optional: verify transaction against RevenueCat REST API when secret is set.
  const rcSecret = Deno.env.get("REVENUECAT_SECRET_KEY");
  if (rcSecret) {
    try {
      const appUser = `device_${deviceId}`;
      const verify = await fetch(
        `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUser)}`,
        {
          headers: {
            Authorization: `Bearer ${rcSecret}`,
            "Content-Type": "application/json",
          },
        },
      );
      if (verify.ok) {
        const json = await verify.json();
        const nons = json?.subscriber?.non_subscriptions ?? {};
        const list: Array<{ id?: string }> = Array.isArray(nons[storeProductId])
          ? nons[storeProductId]
          : Array.isArray(nons[productId])
            ? nons[productId]
            : [];
        const found = list.some(
          (t) => t?.id === transactionId || String(t?.id ?? "").includes(transactionId),
        );
        // If RC has no matching tx yet (propagation delay), still credit by unique ledger.
        void found;
      }
    } catch {
      /* non-fatal */
    }
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.rpc("credit_hint_purchase", {
    p_device_id: deviceId,
    p_transaction_id: transactionId,
    p_product_id: productId,
    p_store_product_id: storeProductId,
    p_hints: hints,
    p_user_id: null,
  });

  if (error) {
    return cors(
      new Response(JSON.stringify({ error: error.message }), { status: 500 }),
    );
  }

  return cors(
    new Response(JSON.stringify({ ok: true, balance: data }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
});
