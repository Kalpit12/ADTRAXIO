/**
 * Phase 16 API E2E — authenticated HTTP tests with session cookies.
 *
 * Usage: node scripts/phase16-api-e2e.mjs
 * Requires: dev server at BASE_URL, seeded test accounts
 */

import { createServerClient } from "@supabase/ssr";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE = process.env.BASE_URL?.replace(/\/$/, "") || "http://localhost:3000";
const TEST_PASSWORD = "AdlyTest2026!";

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`[${pass ? "PASS" : "FAIL"}] ${name}${detail ? ` — ${detail}` : ""}`);
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function createAuthedSession(email) {
  const jar = new Map();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return [...jar.entries()].map(([name, value]) => ({ name, value }));
      },
      setAll(cookies) {
        for (const { name, value } of cookies) jar.set(name, value);
      },
    },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error) throw new Error(`${email}: ${error.message}`);
  return { supabase, jar };
}

async function apiFetch(jar, path, init = {}) {
  const headers = new Headers(init.headers);
  const cookie = cookieHeader(jar);
  if (cookie) headers.set("Cookie", cookie);
  const res = await fetch(`${BASE}${path}`, { ...init, headers, redirect: "manual" });
  const setCookies = res.headers.getSetCookie?.() ?? [];
  for (const raw of setCookies) {
    const [pair] = raw.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
  const body = await res.text();
  let json = null;
  try {
    json = JSON.parse(body);
  } catch {
    /* text */
  }
  return { status: res.status, json, body };
}

async function switchWorkspace(jar, clientWorkspaceId) {
  return apiFetch(jar, "/api/workspaces/switch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientWorkspaceId }),
  });
}

console.log(`\nPhase 16 API E2E → ${BASE}\n`);

if (!url || !anonKey) {
  console.error("Missing Supabase env.");
  process.exit(1);
}

try {
  const { jar: ownerJar, supabase: ownerSb } = await createAuthedSession(
    "agency-owner@adly.test"
  );

  const dash = await apiFetch(ownerJar, "/dashboard");
  record(
    "Owner dashboard access",
    dash.status === 200 || dash.status === 307,
    `HTTP ${dash.status}`
  );

  const { data: workspaces } = await ownerSb
    .from("client_workspaces")
    .select("id, slug")
    .order("slug");
  const clientAId = workspaces?.find((w) => w.slug === "client-a")?.id;
  const clientBId = workspaces?.find((w) => w.slug === "client-b")?.id;

  if (clientAId) {
    const sw = await switchWorkspace(ownerJar, clientAId);
    record("Owner switch to Client A", sw.status === 200, `HTTP ${sw.status}`);

    const content = await apiFetch(ownerJar, "/api/content");
    record("Owner Client A content API", content.status === 200, `HTTP ${content.status}`);

    const campaigns = await apiFetch(ownerJar, "/api/campaigns");
    record("Owner Client A campaigns API", campaigns.status === 200, `HTTP ${campaigns.status}`);

    const reports = await apiFetch(ownerJar, "/api/reports");
    record("Owner Client A reports API", reports.status === 200, `HTTP ${reports.status}`);
  }

  if (clientBId) {
    await switchWorkspace(ownerJar, clientBId);
    const intel = await apiFetch(ownerJar, "/api/intelligence/overview");
    record("Owner Client B intelligence API", intel.status === 200, `HTTP ${intel.status}`);
  }

  const { jar: viewerJar } = await createAuthedSession("client-a-viewer@adly.test");
  const noClient = await apiFetch(viewerJar, "/api/content");
  record(
    "Client viewer without workspace cookie",
    noClient.status === 403,
    `HTTP ${noClient.status}${noClient.json?.code ? ` (${noClient.json.code})` : ""}`
  );

  if (clientAId) {
    await switchWorkspace(viewerJar, clientAId);
    const contentA = await apiFetch(viewerJar, "/api/content");
    record("Client A viewer content API", contentA.status === 200, `HTTP ${contentA.status}`);
  }

  if (clientBId) {
    const switchB = await switchWorkspace(viewerJar, clientBId);
    record(
      "Client A viewer cannot switch to Client B",
      switchB.status === 403,
      `HTTP ${switchB.status} — ${switchB.json?.error ?? ""}`
    );
  }

  if (clientAId) {
    await switchWorkspace(ownerJar, clientAId);
    const createRes = await apiFetch(ownerJar, "/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Phase16 owner campaign",
        objective: "awareness",
        status: "draft",
      }),
    });
    record(
      "Owner can create campaign",
      createRes.status === 201 || createRes.status === 200,
      `HTTP ${createRes.status}`
    );
  }

  const { jar: orgViewerJar } = await createAuthedSession("agency-viewer@adly.test");
  if (clientAId) {
    await switchWorkspace(orgViewerJar, clientAId);
    const writeRes = await apiFetch(orgViewerJar, "/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Phase16 viewer blocked",
        objective: "awareness",
        status: "draft",
      }),
    });
    record(
      "Org viewer campaign create blocked",
      writeRes.status === 403 || writeRes.status === 401,
      `HTTP ${writeRes.status}`
    );
  }

  if (process.env.OPENAI_API_KEY?.trim()) {
    if (clientAId) {
      await switchWorkspace(ownerJar, clientAId);
      const ai = await apiFetch(ownerJar, "/api/ai/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brief: {
            contentType: "social_post",
            platform: "facebook",
            goal: "awareness",
            tone: "professional",
            topic: "Phase 16 test post about premium coffee subscription",
            audience: "Coffee enthusiasts aged 25-45 in urban areas",
          },
        }),
      });
      record(
        "OpenAI content generation",
        ai.status === 200 && Boolean(ai.json?.creative),
        `HTTP ${ai.status}${ai.json?.error ? ` — ${ai.json.error}` : ""}`
      );
    }
  } else {
    record("OpenAI content generation", false, "BLOCKED — OPENAI CONFIGURATION");
  }

  const pages = ["/login", "/dashboard", "/create", "/campaigns", "/reports", "/clients"];
  for (const path of pages) {
    const res = await apiFetch(ownerJar, path);
    record(
      `Page load ${path}`,
      res.status === 200 || res.status === 307,
      `HTTP ${res.status}`
    );
  }
} catch (err) {
  record("API E2E setup", false, err instanceof Error ? err.message : String(err));
}

const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed.\n`);
process.exit(failed > 0 ? 1 : 0);
