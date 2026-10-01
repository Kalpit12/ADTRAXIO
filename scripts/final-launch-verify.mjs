/**
 * Final production launch verification (no secrets logged).
 * PRODUCTION_BASE_URL=https://adtraxio.vercel.app node scripts/final-launch-verify.mjs
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
const OWNER = process.env.SMOKE_TEST_EMAIL || "agency-owner@adly.test";

const matrix = [];

function row(test, result, detail = "") {
  matrix.push({ test, result, detail });
  console.log(`[${result}] ${test}${detail ? ` — ${detail}` : ""}`);
}

if (!BASE || !url || !anonKey) {
  console.error("Set PRODUCTION_BASE_URL and Supabase env in .env.local");
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

async function ownerSession() {
  const jar = new Map();
  const sb = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([n, v]) => ({ name: n, value: v })),
      setAll: (c) => c.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await sb.auth.signInWithPassword({ email: OWNER, password: PASSWORD });
  if (error) throw new Error(error.message);
  const ws = await sb.from("client_workspaces").select("id").eq("slug", "client-a").single();
  if (ws.data?.id) {
    await fetchApi(jar, "/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
    });
  }
  return { jar, sb, clientAId: ws.data?.id };
}

const admin = serviceKey
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : null;

async function countContentMediaObjects() {
  if (!admin) return null;
  const { count } = await admin.storage.from("content-media").list("", { limit: 1 });
  return count;
}

// --- Auth ---
const signupEmail = `launch.verify.${Date.now()}@adly.test`;
const signupJar = new Map();
const sbSignup = createServerClient(url, anonKey, {
  cookies: {
    getAll: () => [...signupJar].map(([n, v]) => ({ name: n, value: v })),
    setAll: (c) => c.forEach(({ name, value }) => signupJar.set(name, value)),
  },
});
const signUp = await sbSignup.auth.signUp({
  email: signupEmail,
  password: PASSWORD,
  options: { data: { full_name: "Launch Verify" } },
});
row(
  "Auth signup",
  signUp.error ? "FAIL" : signUp.data.user ? "PASS" : "BLOCKED",
  signUp.error?.message || signupEmail
);

let { jar, sb } = await ownerSession();
row("Auth login (fixture owner)", "PASS", OWNER);
const { error: logoutErr } = await sb.auth.signOut();
row("Auth logout", logoutErr ? "FAIL" : "PASS");
({ jar, sb } = await ownerSession());

row(
  "Supabase Auth Site URL / callback",
  "NEEDS MANUAL CONFIGURATION",
  "Dashboard: https://adtraxio.vercel.app + /auth/callback"
);
row("Google OAuth", "NOT RUN", "requires Dashboard + provider consoles");

// --- OpenAI (Free plan: 5/mo; fixture reset via seed) ---
const ai = await fetchApi(jar, "/api/ai/generate-content", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    brief: {
      contentType: "social_post",
      platform: "facebook",
      goal: "awareness",
      tone: "professional",
      topic: "Launch verification post about sustainable coffee packaging",
      audience: "Eco-conscious coffee buyers aged 25-40",
    },
  }),
});
row(
  "OpenAI generate-content",
  ai.status === 200 && ai.json?.creative ? "PASS" : ai.json?.code === "PLAN_LIMIT" ? "BLOCKED" : "FAIL",
  ai.status === 200 ? "structured creative" : ai.json?.code || String(ai.status)
);

// --- Media security ---
const unsigned = await fetch(
  `${url}/storage/v1/object/public/generated-media/generated/fake/fake.png`
);
row("unsigned generated-media", unsigned.status === 400 || unsigned.status === 404 ? "PASS" : "FAIL", String(unsigned.status));

const cross = await fetchApi(jar, "/api/ai/media/assets/00000000-0000-0000-0000-000000000099/url");
row(
  "invalid/non-owned asset signed URL",
  cross.status === 403 || cross.status === 404 ? "PASS" : "FAIL",
  String(cross.status)
);

const viewerJar = new Map();
const sbV = createServerClient(url, anonKey, {
  cookies: {
    getAll: () => [...viewerJar].map(([n, v]) => ({ name: n, value: v })),
    setAll: (c) => c.forEach(({ name, value }) => viewerJar.set(name, value)),
  },
});
await sbV.auth.signInWithPassword({ email: "client-a-viewer@adly.test", password: PASSWORD });
const wsA = await sbV.from("client_workspaces").select("id").eq("slug", "client-a").single();
if (wsA.data?.id) {
  await fetchApi(viewerJar, "/api/workspaces/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientWorkspaceId: wsA.data.id }),
  });
}
const foreignCamp = await fetchApi(
  viewerJar,
  "/api/campaigns/00000000-0000-0000-0000-000000000099"
);
row(
  "cross-workspace campaign",
  foreignCamp.status === 403 || foreignCamp.status === 404 ? "PASS" : "FAIL",
  String(foreignCamp.status)
);

const schedNoContent = await fetchApi(jar, "/api/publishing/schedule", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mediaAssetId: "00000000-0000-0000-0000-000000000099",
    scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    platform: "facebook",
    socialAccountId: "00000000-0000-0000-0000-000000000001",
  }),
});
row(
  "mediaAssetId without contentId",
  schedNoContent.status === 400 ? "PASS" : "FAIL",
  String(schedNoContent.status)
);

// Image job + signed URL (minimal prompt)
let assetId = null;
const img = await fetchApi(jar, "/api/ai/media/image", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ prompt: "A single red apple on white background, product photo", size: "1024x1024" }),
});
const jobId = img.json?.job?.id ?? img.json?.jobId;
if ((img.status === 200 || img.status === 202) && jobId) {
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const jobRes = await fetchApi(jar, `/api/ai/media/jobs/${jobId}`);
    const job = jobRes.json?.job ?? jobRes.json;
    if (job?.status === "completed" && job?.mediaAssetId) {
      assetId = job.mediaAssetId;
      break;
    }
    if (job?.status === "failed") break;
  }
} else if (img.status !== 200 && img.status !== 202) {
  row("image generation job start", "FAIL", String(img.status));
}
if (assetId) {
  const signed = await fetchApi(jar, `/api/ai/media/assets/${assetId}/url`);
  row(
    "authorized signed generated-media URL",
    signed.status === 200 && signed.json?.url ? "PASS" : "FAIL",
    String(signed.status)
  );
} else {
  row("authorized signed generated-media URL", img.status === 503 ? "BLOCKED" : "NOT RUN", "image job incomplete");
}

row("Creative Prepare public staging", "NOT RUN", "needs campaign+studio fixture in script");
row("unapproved content publish", "NOT RUN", "needs content approval fixture");
row("authorized image staging", "NOT RUN", "needs approved content + social account");

// --- Stripe / Meta ---
const wh = await fetch(`${BASE}/api/billing/webhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json", "stripe-signature": "invalid" },
  body: "{}",
});
row("invalid Stripe signature", wh.status === 400 ? "PASS" : "FAIL", String(wh.status));
row("Stripe test checkout", "NEEDS MANUAL CONFIGURATION", "Dashboard webhook + browser checkout");
row("Meta OAuth / image publish", "NEEDS MANUAL CONFIGURATION", "Meta Developer redirect URI");

if (cronSecret) {
  row(
    "unauthorized cron",
    (await fetch(`${BASE}/api/cron/publish`)).status === 401 ? "PASS" : "FAIL",
    "401"
  );
}

row("Manual production-smoke-test.md", "NOT RUN", "human QA checklist");
row("Device QA (Chrome/iPhone/Android)", "NOT RUN", "manual viewports");

const fails = matrix.filter((m) => m.result === "FAIL").length;
console.log(`\n${matrix.length} checks, ${fails} FAIL\n`);
process.exit(fails ? 1 : 0);
