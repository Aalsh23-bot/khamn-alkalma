/**
 * Email each accepted ad report. Prefer calling only after submit_ad_report RPC succeeds.
 * Requires: RESEND_API_KEY
 * Optional: AD_REPORT_TO, AD_REPORT_DEVICE_HMAC (if set, requires X-Device-Signature header)
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const TO = Deno.env.get("AD_REPORT_TO") ?? "a.alshammri00@gmail.com";
const FROM = Deno.env.get("AD_REPORT_FROM") ?? "Khamsa Reports <onboarding@resend.dev>";

function cors(res: Response) {
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Access-Control-Allow-Headers",
    "authorization, x-client-info, apikey, content-type, x-device-signature",
  );
  return new Response(res.body, { status: res.status, headers });
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return cors(new Response(null, { status: 204 }));
  }
  if (req.method !== "POST") {
    return cors(new Response("Method not allowed", { status: 405 }));
  }

  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    return cors(
      new Response(JSON.stringify({ ok: false, error: "RESEND_API_KEY missing" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );
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
    return cors(
      new Response(JSON.stringify({ ok: false, error: "invalid json" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  const deviceId = (body.device_id ?? "").trim();
  if (deviceId.length < 8) {
    return cors(
      new Response(JSON.stringify({ ok: false, error: "invalid_device" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  // Accept either a user JWT or a device HMAC signature (when secret configured).
  const authHeader = req.headers.get("Authorization") ?? "";
  const hasUserJwt = authHeader.toLowerCase().startsWith("bearer ");
  const deviceHmacSecret = Deno.env.get("AD_REPORT_DEVICE_HMAC") ?? "";
  if (deviceHmacSecret) {
    const provided = req.headers.get("X-Device-Signature") ?? "";
    const expected = await hmacHex(deviceHmacSecret, deviceId);
    if (provided !== expected && !hasUserJwt) {
      return cors(
        new Response(JSON.stringify({ ok: false, error: "unauthorized_device" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
  } else if (hasUserJwt) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    if (supabaseUrl && anonKey) {
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      if (!data.user) {
        // Soft-fail: allow notify if RPC already persisted the report.
      }
    }
  }

  const subject = `[خمن الكلمة] بلاغ إعلان: ${body.reason ?? "غير محدد"}`;
  const text = [
    `سبب البلاغ: ${body.reason ?? ""}`,
    `ملاحظة: ${body.note ?? "—"}`,
    `الجهاز: ${deviceId}`,
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
    return cors(
      new Response(JSON.stringify({ ok: false, error: errText }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }),
    );
  }

  return cors(
    new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
});
