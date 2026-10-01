/**
 * Production integration checks (no secrets printed).
 * PRODUCTION_BASE_URL=https://adtraxio.vercel.app node scripts/production-integration-verify.mjs
 */
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

const BASE = process.env.PRODUCTION_BASE_URL?.replace(/\/$/, "");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET?.trim();
const PASSWORD = process.env.SMOKE_TEST_PASSWORD || "AdlyTest2026!";
const EMAIL = process.env.SMOKE_TEST_EMAIL || "agency-owner@adly.test";

function log(state, name, detail = "") {
  console.log(`[${state}] ${name}${detail ? ` — ${detail}` : ""}`);
}

if (!BASE) {
  console.error("Set PRODUCTION_BASE_URL");
  process.exit(1);
}

function mergeCookies(jar, response) {
  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
  for (const cookie of setCookies) {
    const part = cookie.split(";")[0];
    const eq = part.indexOf("=");
    if (eq > 0) jar.set(part.slice(0, eq).trim(), part.slice(eq + 1).trim());
  }
}

async function fetchApi(jar, path, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  mergeCookies(jar, res);
  const json = await res.json().catch(() => null);
  return { status: res.status, json, res };
}

async function session() {
  const jar = new Map();
  const sb = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([n, v]) => ({ name: n, value: v })),
      setAll: (c) => c.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await sb.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
  if (error) throw new Error(`login: ${error.message}`);
  const ws = await sb.from("client_workspaces").select("id").eq("slug", "client-a").single();
  if (ws.data?.id) {
    await fetchApi(jar, "/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
    });
  }
  return { jar, sb };
}

// A. unsigned generated-media
try {
  const unsigned = await fetch(
    `${url}/storage/v1/object/public/generated-media/generated/fake-org/fake.png`
  );
  log(unsigned.status === 400 || unsigned.status === 404 ? "PASS" : "FAIL", "Media unsigned public URL", String(unsigned.status));
} catch (e) {
  log("FAIL", "Media unsigned public URL", e instanceof Error ? e.message : "error");
}

// Cron
if (cronSecret) {
  const bad = await fetch(`${BASE}/api/cron/publish`, {
    headers: { Authorization: "Bearer invalid" },
  });
  log(bad.status === 401 ? "PASS" : "FAIL", "Cron unauthenticated", String(bad.status));
  const good = await fetch(`${BASE}/api/cron/publish`, {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  log(good.status === 200 ? "PASS" : good.status === 503 ? "BLOCKED BY CONFIGURATION" : "FAIL", "Cron authorized publish", String(good.status));
}

// Stripe webhook signature
const wh = await fetch(`${BASE}/api/billing/webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "stripe-signature": "invalid" },
  body: "{}",
});
log(wh.status === 400 ? "PASS" : "FAIL", "Stripe webhook rejects bad signature", String(wh.status));

if (!url || !anonKey) {
  log("BLOCKED BY CONFIGURATION", "Authenticated checks", "missing supabase env");
  process.exit(0);
}

const { jar, sb } = await session();
log("PASS", "Auth login + workspace cookie", EMAIL);

// D. schedule without contentId
const sched = await fetchApi(jar, "/api/publishing/schedule", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mediaAssetId: "00000000-0000-0000-0000-000000000099",
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    platform: "facebook",
    socialAccountId: "00000000-0000-0000-0000-000000000001",
  }),
});
log(sched.status === 400 ? "PASS" : "FAIL", "mediaAssetId without contentId", String(sched.status));

// API smoke paths
const paths = [
  ["Content list", "/api/content"],
  ["Campaigns", "/api/campaigns"],
  ["Social accounts", "/api/social/accounts"],
  ["Analytics overview", "/api/analytics/overview"],
  ["Copilot home", "/api/assistant/home"],
  ["Billing plans", "/api/billing/plans"],
];
for (const [label, path] of paths) {
  const r = await fetchApi(jar, path);
  log(r.status === 200 ? "PASS" : r.status === 403 ? "BLOCKED BY FIXTURE" : "FAIL", label, String(r.status));
}

// OpenAI minimal
const ai = await fetchApi(jar, "/api/ai/generate-content", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    brief: {
      contentType: "social_post",
      platform: "facebook",
      goal: "awareness",
      tone: "professional",
      topic: "Production smoke test post about premium coffee subscription",
      audience: "Coffee enthusiasts aged 25-45 in urban areas",
    },
  }),
});
log(
  ai.status === 200 && ai.json?.creative
    ? "PASS"
    : ai.status === 402 || ai.status === 403
      ? "BLOCKED BY CONFIGURATION"
      : "FAIL",
  "OpenAI generate-content",
  ai.status === 200 ? "structured response" : String(ai.status)
);

// Cross-workspace: viewer on client A cannot access org B asset (expect 403/404 on random asset url)
const viewerJar = new Map();
const sbV = createServerClient(url, anonKey, {
  cookies: {
    getAll: () => [...viewerJar].map(([n, v]) => ({ name: n, value: v })),
    setAll: (c) => c.forEach(({ name, value }) => viewerJar.set(name, value)),
  },
});
await sbV.auth.signInWithPassword({
  email: "client-a-viewer@adly.test",
  password: PASSWORD,
});
const wsA = await sbV.from("client_workspaces").select("id").eq("slug", "client-a").single();
if (wsA.data?.id) {
  await fetchApi(viewerJar, "/api/workspaces/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientWorkspaceId: wsA.data.id }),
  });
}
const cross = await fetchApi(viewerJar, "/api/ai/media/assets/00000000-0000-0000-0000-000000000099/url");
log(
  cross.status === 403 || cross.status === 404 ? "PASS" : "FAIL",
  "Cross-workspace asset URL",
  String(cross.status)
);

log("NOT_CONFIGURED", "Meta OAuth E2E", "requires browser + Meta dashboard");
log("NOT_CONFIGURED", "Stripe checkout E2E", "manual test mode checkout");
log("NOT_CONFIGURED", "Prepare staging invariant", "requires creative fixture asset");
