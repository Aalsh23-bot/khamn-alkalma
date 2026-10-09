/**
 * Account lifecycle for App Store 5.1.1(v) + Sign in with Apple TN3194.
 *
 * Actions:
 *  - store_apple_code: exchange authorizationCode → refresh_token (right after SIWA)
 *  - delete_account: revoke Apple refresh_token (if any) then delete auth user
 *
 * Secrets (Dashboard → Edge Functions → Secrets):
 *  APPLE_CLIENT_ID     = app.khamsa.game   (native Bundle ID)
 *  APPLE_CLIENT_SECRET = Apple JWT client secret (same family as Supabase Apple provider)
 *
 * Deploy:
 *  npx supabase functions deploy account-lifecycle --project-ref eqxaivexuowngyigmqwl
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const appleClientId = Deno.env.get("APPLE_CLIENT_ID") ?? "app.khamsa.game";
    const appleClientSecret = Deno.env.get("APPLE_CLIENT_SECRET") ?? "";

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ error: "missing auth" }, 401);
    }

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(url, service);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "store_apple_code") {
      const code = String(body.authorizationCode ?? "").trim();
      if (!code) return json({ error: "missing authorizationCode" }, 400);
      if (!appleClientSecret) {
        return json({ error: "APPLE_CLIENT_SECRET not configured" }, 500);
      }

      const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: appleClientId,
          client_secret: appleClientSecret,
          code,
          grant_type: "authorization_code",
        }),
      });
      const tokenJson = (await tokenRes.json()) as {
        refresh_token?: string;
        error?: string;
      };
      if (!tokenRes.ok || !tokenJson.refresh_token) {
        return json(
          {
            error: "apple_token_exchange_failed",
            detail: tokenJson.error ?? (await tokenRes.text().catch(() => "")),
          },
          400,
        );
      }

      const { error } = await admin.from("apple_auth_tokens").upsert({
        user_id: user.id,
        refresh_token: tokenJson.refresh_token,
        updated_at: new Date().toISOString(),
      });
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    if (action === "delete_account") {
      // 1) Revoke Apple token when we have one (best-effort; still delete if revoke fails).
      const { data: row } = await admin
        .from("apple_auth_tokens")
        .select("refresh_token")
        .eq("user_id", user.id)
        .maybeSingle();

      if (row?.refresh_token && appleClientSecret) {
        const revokeRes = await fetch("https://appleid.apple.com/auth/revoke", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: appleClientId,
            client_secret: appleClientSecret,
            token: row.refresh_token,
            token_type_hint: "refresh_token",
          }),
        });
        if (!revokeRes.ok) {
          console.error(
            "apple revoke failed",
            revokeRes.status,
            await revokeRes.text(),
          );
        }
      }

      await admin.from("apple_auth_tokens").delete().eq("user_id", user.id);

      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, revokedApple: Boolean(row?.refresh_token) });
    }

    return json({ error: "unknown action" }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ error: message }, 400);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
