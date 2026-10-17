/**
 * After anonymous → Apple/email upgrade that created a NEW uid, move hint
 * balance + ledger rows from the previous anonymous user to the new one.
 *
 * Auth: Bearer = new user JWT
 * Body: { previous_access_token: string }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
    },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return json(204, {});
  }
  if (req.method !== "POST") return json(405, { error: "method" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) return json(500, { error: "server_misconfigured" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "auth_required" });
  }

  let body: { previous_access_token?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }
  const prevToken = (body.previous_access_token ?? "").trim();
  if (!prevToken) return json(400, { error: "missing_previous_token" });

  const newClient = createClient(supabaseUrl, anonKey || serviceKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: newData } = await newClient.auth.getUser();
  const newUser = newData.user;
  if (!newUser?.id || (newUser as { is_anonymous?: boolean }).is_anonymous) {
    return json(401, { error: "invalid_new_user" });
  }

  const prevClient = createClient(supabaseUrl, anonKey || serviceKey, {
    global: { headers: { Authorization: `Bearer ${prevToken}` } },
  });
  const { data: prevData } = await prevClient.auth.getUser(prevToken);
  const prevUser = prevData.user;
  if (!prevUser?.id || !(prevUser as { is_anonymous?: boolean }).is_anonymous) {
    return json(400, { error: "previous_not_anonymous" });
  }
  if (prevUser.id === newUser.id) {
    return json(200, { ok: true, merged: false, same_user: true });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Move ledger rows (ignore conflicts on transaction_id already on new user).
  await admin
    .from("hint_purchase_ledger")
    .update({ user_id: newUser.id })
    .eq("user_id", prevUser.id);

  const { data: prevBal } = await admin
    .from("hint_balances")
    .select("balance")
    .eq("user_id", prevUser.id)
    .maybeSingle();
  const add = Math.max(0, Number(prevBal?.balance ?? 0));

  if (add > 0) {
    const canonical = `user_${newUser.id}`;
    const { data: existing } = await admin
      .from("hint_balances")
      .select("balance")
      .eq("user_id", newUser.id)
      .maybeSingle();
    if (existing) {
      await admin
        .from("hint_balances")
        .update({
          balance: Number(existing.balance ?? 0) + add,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", newUser.id);
    } else {
      await admin.from("hint_balances").insert({
        device_id: canonical,
        user_id: newUser.id,
        balance: add,
        updated_at: new Date().toISOString(),
      });
    }
    await admin.from("hint_balances").delete().eq("user_id", prevUser.id);
  }

  // Free-claim row: keep the more recent claim_date on the surviving user.
  const { data: prevClaim } = await admin
    .from("hint_free_claims")
    .select("claim_date")
    .eq("user_id", prevUser.id)
    .maybeSingle();
  if (prevClaim?.claim_date) {
    await admin.from("hint_free_claims").upsert({
      user_id: newUser.id,
      claim_date: prevClaim.claim_date,
      updated_at: new Date().toISOString(),
    });
    await admin.from("hint_free_claims").delete().eq("user_id", prevUser.id);
  }

  const { data: finalRow } = await admin
    .from("hint_balances")
    .select("balance")
    .eq("user_id", newUser.id)
    .maybeSingle();

  return json(200, {
    ok: true,
    merged: true,
    balance: Number(finalRow?.balance ?? 0),
  });
});
