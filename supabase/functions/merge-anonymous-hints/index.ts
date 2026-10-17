/**
 * After anonymous → Apple/email upgrade that created a NEW uid, move
 * PURCHASED hint balance (not free daily claims) via atomic SQL RPC.
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
  const { data, error } = await admin.rpc("merge_anonymous_hint_balance", {
    p_from_user_id: prevUser.id,
    p_to_user_id: newUser.id,
  });

  if (error) return json(500, { error: error.message });
  return json(200, (data as Record<string, unknown>) ?? { ok: true });
});
