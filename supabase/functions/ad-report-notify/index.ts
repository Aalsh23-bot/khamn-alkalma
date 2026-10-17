/**
 * Email an ad report ONLY if it was persisted in ad_reports and not yet emailed.
 * Body: { report_id: uuid }
 * Auth: user JWT whose uid owns the report (or service role).
 * Requires: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TO = Deno.env.get("AD_REPORT_TO") ?? "a.alshammri00@gmail.com";
const FROM = Deno.env.get("AD_REPORT_FROM") ?? "Khamsa Reports <onboarding@resend.dev>";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }
  if (req.method !== "POST") {
    return json(405, { error: "method" });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  if (!apiKey) return json(500, { error: "RESEND_API_KEY missing" });
  if (!supabaseUrl || !serviceKey) return json(500, { error: "server_misconfigured" });

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "auth_required" });
  }

  let body: { report_id?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const reportId = (body.report_id ?? "").trim();
  if (!UUID_RE.test(reportId)) {
    return json(400, { error: "invalid_report_id" });
  }

  // Resolve caller (user JWT). Service-role bearer is also accepted for triggers.
  const token = authHeader.slice(7).trim();
  const isService = token === serviceKey;
  let callerId: string | null = null;
  if (!isService) {
    const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data } = await userClient.auth.getUser();
    callerId = data.user?.id ?? null;
    if (!callerId) return json(401, { error: "invalid_user" });
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: row, error: loadErr } = await admin
    .from("ad_reports")
    .select("id, device_id, reason, note, app_version, platform, user_id, email_sent_at, created_at")
    .eq("id", reportId)
    .maybeSingle();

  if (loadErr) return json(500, { error: loadErr.message });
  if (!row) return json(404, { error: "report_not_found" });

  if (!isService && row.user_id && callerId && row.user_id !== callerId) {
    return json(403, { error: "forbidden" });
  }

  if (row.email_sent_at) {
    return json(200, { ok: true, already_sent: true });
  }

  // Per-user email throttle: max 5 emails/hour (mirrors insert limit).
  if (row.user_id) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("ad_reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", row.user_id)
      .not("email_sent_at", "is", null)
      .gte("email_sent_at", since);
    if ((count ?? 0) >= 5) {
      return json(429, { error: "email_rate_limited", limit: 5 });
    }
  }

  const subject = `[خمن الكلمة] بلاغ إعلان: ${row.reason ?? "غير محدد"}`;
  const text = [
    `سبب البلاغ: ${row.reason ?? ""}`,
    `ملاحظة: ${row.note ?? "—"}`,
    `الجهاز: ${row.device_id ?? ""}`,
    `المستخدم: ${row.user_id ?? ""}`,
    `النسخة: ${row.app_version ?? ""}`,
    `المنصة: ${row.platform ?? ""}`,
    `الوقت: ${row.created_at ?? new Date().toISOString()}`,
    `report_id: ${row.id}`,
  ].join("\n");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM,
      to: [TO],
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return json(502, { error: errText });
  }

  await admin.rpc("mark_ad_report_emailed", { p_report_id: reportId });
  return json(200, { ok: true });
});
