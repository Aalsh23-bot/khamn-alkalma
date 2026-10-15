/**
 * Edge Function: email each ad report to the developer via Resend.
 * Secrets required: RESEND_API_KEY
 * Optional: AD_REPORT_TO (defaults to a.alshammri00@gmail.com)
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const TO = Deno.env.get("AD_REPORT_TO") ?? "a.alshammri00@gmail.com";
const FROM = Deno.env.get("AD_REPORT_FROM") ?? "Khamsa Reports <onboarding@resend.dev>";

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ ok: false, error: "RESEND_API_KEY missing" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: {
    device_id?: string;
    reason?: string;
    note?: string | null;
    app_version?: string | null;
    platform?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const subject = `[خمن الكلمة] بلاغ إعلان: ${body.reason ?? "غير محدد"}`;
  const text = [
    `سبب البلاغ: ${body.reason ?? ""}`,
    `ملاحظة: ${body.note ?? "—"}`,
    `الجهاز: ${body.device_id ?? ""}`,
    `النسخة: ${body.app_version ?? ""}`,
    `المنصة: ${body.platform ?? ""}`,
    `الوقت: ${new Date().toISOString()}`,
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
    return new Response(JSON.stringify({ ok: false, error: errText }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
