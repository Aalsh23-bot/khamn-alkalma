// Supabase Edge Function: game-api
// Mirrors Postgres RPCs for verify / daily / leaderboard.
// Deploy: npx supabase functions deploy game-api --project-ref eqxaivexuowngyigmqwl
// (requires personal access token — RPCs already live without this)

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
    const authHeader = req.headers.get("Authorization") ?? "";

    const supabase = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });

    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "daily_meta") {
      const { data, error } = await supabase.rpc("get_daily_meta", {
        p_date: body.date ?? null,
      });
      if (error) throw error;
      return json(data);
    }

    if (action === "submit_daily") {
      const { data, error } = await supabase.rpc("submit_daily_result", {
        p_guesses: body.guesses,
        p_won: body.won,
        p_hard_mode: body.hardMode ?? false,
        p_duration_ms: body.durationMs ?? null,
      });
      if (error) throw error;
      return json(data);
    }

    if (action === "create_challenge") {
      const { data, error } = await supabase.rpc("create_friend_challenge");
      if (error) throw error;
      return json(data);
    }

    if (action === "leaderboard") {
      const { data, error } = await supabase.rpc("get_leaderboard", {
        p_limit: body.limit ?? 20,
      });
      if (error) throw error;
      return json(data);
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
