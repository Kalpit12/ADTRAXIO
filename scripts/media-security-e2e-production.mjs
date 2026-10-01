/**
 * Production media security E2E (invariant: prepare must not stage to content-media).
 * PRODUCTION_BASE_URL=https://adtraxio.vercel.app node scripts/media-security-e2e-production.mjs
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
const PASSWORD = process.env.SMOKE_TEST_PASSWORD || "AdlyTest2026!";
const OWNER = process.env.SMOKE_TEST_EMAIL || "agency-owner@adly.test";
const ORG_ID = "3cb23654-40d5-4daf-8d19-95089b38636f";

const log = [];
function row(name, state, detail = "") {
  log.push({ name, state, detail });
  console.log(`[${state}] ${name}${detail ? ` — ${detail}` : ""}`);
}

if (!BASE || !url || !serviceKey) {
  console.error("PRODUCTION_BASE_URL and Supabase service role required");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function mergeCookies(jar, response) {
  for (const cookie of response.headers.getSetCookie?.() ?? []) {
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
  return { status: res.status, json };
}

async function session() {
  const jar = new Map();
  const sb = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([n, v]) => ({ name: n, value: v })),
      setAll: (c) => c.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  await sb.auth.signInWithPassword({ email: OWNER, password: PASSWORD });
  const ws = await sb.from("client_workspaces").select("id").eq("slug", "client-a").single();
  if (ws.data?.id) {
    await fetchApi(jar, "/api/workspaces/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientWorkspaceId: ws.data.id }),
    });
  }
  return { jar, sb, clientWorkspaceId: ws.data?.id };
}

async function countContentMediaForOrg(orgId) {
  const { data } = await admin.storage.from("content-media").list(orgId, { limit: 1000 });
  return data?.length ?? 0;
}

async function pollImageJob(jar, jobId) {
  for (let i = 0; i < 45; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetchApi(jar, `/api/ai/media/jobs/${jobId}`);
    const job = res.json?.job ?? res.json;
    if (job?.status === "completed" && job?.mediaAssetId) return job.mediaAssetId;
    if (job?.status === "failed") return null;
  }
  return null;
}

const brief = {
  contentType: "social_post",
  platform: "facebook",
  goal: "awareness",
  tone: "professional",
  topic: "Security E2E campaign creative for organic coffee launch",
  audience: "Urban professionals who enjoy specialty coffee",
};

const studio = {
  workflowStep: "review",
  packageStatus: "ready",
  concept: {
    creativeAngle: "Fresh roast",
    hook: "Wake up better",
    headline: "Morning ritual",
    primaryCopy: "Try our beans",
    cta: "Shop now",
    caption: "Coffee time",
    hashtags: ["coffee"],
    visualDirection: "Product on table",
    voiceoverDirection: "",
    soundDirection: "",
    suggestedMedia: ["image"],
  },
  assetSlots: [],
  canvas: { headline: "Morning ritual", caption: "Coffee time", cta: "Shop now" },
};

const { jar } = await session();

const img = await fetchApi(jar, "/api/ai/media/image", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    prompt: "Single coffee cup product photo white background",
    size: "1024x1024",
  }),
});
const jobId = img.json?.job?.id;
let assetId = jobId ? await pollImageJob(jar, jobId) : null;
if (!assetId) {
  row("A. Generate AI image asset", "FAIL", "job incomplete");
  process.exit(1);
}
row("A. Generate AI image asset", "PASS", assetId);

const mediaBefore = await countContentMediaForOrg(ORG_ID);

let campaignId;
const campList = await fetchApi(jar, "/api/campaigns");
if (campList.json?.campaigns?.length) {
  campaignId = campList.json.campaigns[0].id;
  row("Create campaign", "PASS", `reuse ${campaignId}`);
} else {
  const camp = await fetchApi(jar, "/api/campaigns", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Security E2E ${Date.now()}`,
      status: "active",
      objective: "awareness",
    }),
  });
  campaignId = camp.json?.campaign?.id ?? camp.json?.id;
  if (!campaignId) {
    row("Create campaign", camp.status === 403 ? "BLOCKED" : "FAIL", "campaign limit or permission");
    process.exit(1);
  }
  row("Create campaign", "PASS", campaignId);
}

studio.assetSlots = [
  {
    id: "slot-1",
    kind: "image",
    label: "Hero",
    status: "ready",
    assetId,
  },
];

const prepare = await fetchApi(jar, "/api/creative/campaign-prepare", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    campaignId,
    brief,
    studio,
    visualAssets: [{ assetId, type: "image", label: "Hero" }],
    selectedMediaAssetId: assetId,
  }),
});

const contentId = prepare.json?.contentId;
const mediaAfterPrepare = await countContentMediaForOrg(ORG_ID);

row(
  "B. Creative Prepare — no content-media staging",
  mediaAfterPrepare === mediaBefore ? "PASS" : "FAIL",
  `count before=${mediaBefore} after=${mediaAfterPrepare}`
);

row(
  "C. Content association (mediaAssetId on content)",
  contentId && prepare.json?.media?.assetId === assetId ? "PASS" : "FAIL",
  contentId || "no contentId"
);

const fakeSocial = "00000000-0000-0000-0000-000000000001";
const scheduleBody = {
  contentId,
  mediaAssetId: assetId,
  socialAccountId: fakeSocial,
  scheduledFor: new Date(Date.now() + 86400000).toISOString(),
  platform: "facebook",
  timezone: "UTC",
};

let sched = await fetchApi(jar, "/api/publishing/schedule", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(scheduleBody),
});

if (sched.status === 403 && sched.json?.code === "approval_required") {
  row("D. Unapproved schedule blocked (approval)", "PASS", "403 approval_required");
} else if (sched.status === 404 || sched.json?.error?.includes("Social")) {
  row(
    "D. Unapproved schedule blocked",
    "BLOCKED",
    "no test social account — request approval path not reached"
  );
  await fetchApi(jar, `/api/content/${contentId}/approval`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  sched = await fetchApi(jar, "/api/publishing/schedule", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(scheduleBody),
  });
  if (sched.status === 403 && sched.json?.code === "approval_required") {
    row("D. Pending approval schedule blocked", "PASS", "403 after approval request");
  } else {
    row("D. Pending approval schedule blocked", "BLOCKED", `${sched.status} ${sched.json?.code || sched.json?.error || ""}`);
  }
} else {
  row("D. Unapproved schedule blocked", "FAIL", `${sched.status}`);
}

await fetchApi(jar, `/api/content/${contentId}/approval/reject`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ reason: "E2E reject test" }),
});
const schedRejected = await fetchApi(jar, "/api/publishing/schedule", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(scheduleBody),
});
if (schedRejected.status === 403 && schedRejected.json?.code === "approval_required") {
  row("E. Rejected content schedule blocked", "PASS", "403");
} else if (schedRejected.status === 404) {
  row("E. Rejected content schedule blocked", "BLOCKED", "no social account");
} else {
  row("E. Rejected content schedule blocked", "FAIL", String(schedRejected.status));
}

await fetchApi(jar, `/api/content/${contentId}/approval`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
await fetchApi(jar, `/api/content/${contentId}/approval/changes`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ reason: "E2E changes requested" }),
});
const schedChanges = await fetchApi(jar, "/api/publishing/schedule", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(scheduleBody),
});
if (schedChanges.status === 403 && schedChanges.json?.code === "approval_required") {
  row("F. Changes-requested schedule blocked", "PASS", "403");
} else if (schedChanges.status === 404) {
  row("F. Changes-requested schedule blocked", "BLOCKED", "no social account");
} else {
  row("F. Changes-requested schedule blocked", "FAIL", String(schedChanges.status));
}

await fetchApi(jar, `/api/content/${contentId}/approval`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({}),
});
const approve = await fetchApi(jar, `/api/content/${contentId}/approval/approve`, {
  method: "POST",
});
row(
  "G. Approve content",
  approve.status === 200 ? "PASS" : "FAIL",
  String(approve.status)
);

const mediaBeforeSchedule = await countContentMediaForOrg(ORG_ID);
const schedApproved = await fetchApi(jar, "/api/publishing/schedule", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(scheduleBody),
});
const mediaAfterSchedule = await countContentMediaForOrg(ORG_ID);

if (schedApproved.status === 201 || schedApproved.status === 200) {
  row(
    "G. Authorized schedule + content-media staging",
    mediaAfterSchedule > mediaBeforeSchedule ? "PASS" : "FAIL",
    `content-media count ${mediaBeforeSchedule}→${mediaAfterSchedule}`
  );
} else {
  row(
    "G. Authorized staging after approve",
    "BLOCKED",
    `schedule ${schedApproved.status} — Meta test social account required on production`
  );
}

const fails = log.filter((l) => l.state === "FAIL").length;
console.log(`\n${log.length} steps, ${fails} FAIL\n`);
process.exit(fails ? 1 : 0);
