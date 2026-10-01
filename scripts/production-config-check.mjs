/**
 * Production configuration shape check (no secrets printed, no external calls).
 * npm run test:production-config
 *
 * Set PREFLIGHT_TARGET=production to enforce production rules on process.env.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = resolve(root, ".env.local");

function loadEnvFile() {
  if (!existsSync(envPath)) return;
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

loadEnvFile();

const target = process.env.PREFLIGHT_TARGET || "local";
const isProdCheck = target === "production";

const results = [];
function pass(name, detail) {
  results.push({ name, state: "PASS", detail });
  console.log(`[PASS] ${name}${detail ? ` — ${detail}` : ""}`);
}
function missing(name, detail) {
  results.push({ name, state: "MISSING", detail });
  console.log(`[MISSING] ${name}${detail ? ` — ${detail}` : ""}`);
}
function invalid(name, detail) {
  results.push({ name, state: "INVALID", detail });
  console.log(`[INVALID] ${name}${detail ? ` — ${detail}` : ""}`);
}
function warn(name, detail) {
  results.push({ name, state: "WARNING", detail });
  console.log(`[WARNING] ${name}${detail ? ` — ${detail}` : ""}`);
}

function has(name) {
  return Boolean(process.env[name]?.trim());
}

function isHttpsUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

function isSupabaseUrl(value) {
  return /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/i.test(value.replace(/\/$/, "") + "/");
}

// Required for any deployed environment
const core = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "SOCIAL_TOKEN_ENCRYPTION_KEY",
];

for (const key of core) {
  if (has(key)) pass(`env ${key}`, "set");
  else missing(`env ${key}`, "required for production");
}

if (has("NEXT_PUBLIC_SUPABASE_URL")) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL.trim();
  if (isSupabaseUrl(url)) pass("NEXT_PUBLIC_SUPABASE_URL format", "supabase.co");
  else invalid("NEXT_PUBLIC_SUPABASE_URL format", "expected https://*.supabase.co");
}

if (isProdCheck) {
  if (has("NEXT_PUBLIC_APP_URL")) {
    const app = process.env.NEXT_PUBLIC_APP_URL.trim();
    if (app.includes("localhost") || app.includes("127.0.0.1")) {
      invalid("NEXT_PUBLIC_APP_URL", "must not be localhost in production check");
    } else if (!isHttpsUrl(app)) {
      invalid("NEXT_PUBLIC_APP_URL", "must be HTTPS");
    } else pass("NEXT_PUBLIC_APP_URL", "HTTPS production URL");
  } else {
    missing("NEXT_PUBLIC_APP_URL", "required for production");
  }
} else if (has("NEXT_PUBLIC_APP_URL")) {
  const app = process.env.NEXT_PUBLIC_APP_URL.trim();
  if (app.includes("localhost")) warn("NEXT_PUBLIC_APP_URL", "localhost (ok for local dev)");
  else pass("NEXT_PUBLIC_APP_URL", "set");
}

// Server-only secrets must not appear as NEXT_PUBLIC_
const forbiddenPublic = [
  "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_OPENAI_API_KEY",
  "NEXT_PUBLIC_CRON_SECRET",
];
let leaked = false;
function walkSrc(dir) {
  for (const name of readdirSync(dir)) {
    const full = resolve(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walkSrc(full);
    } else if (/\.(ts|tsx|js|mjs)$/.test(name)) {
      const text = readFileSync(full, "utf8");
      for (const f of forbiddenPublic) {
        if (text.includes(f)) leaked = true;
      }
    }
  }
}
walkSrc(resolve(root, "src"));
if (!leaked) pass("No forbidden NEXT_PUBLIC secret names in src", "");
else invalid("Client secret env names", "forbidden NEXT_PUBLIC_* pattern found");

// Feature-specific (warn if missing — product degrades)
const billing = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_PRO"];
for (const k of billing) {
  if (has(k)) pass(`billing ${k}`, "set");
  else warn(`billing ${k}`, "billing disabled without it");
}

const meta = ["META_APP_ID", "META_APP_SECRET"];
for (const k of meta) {
  if (has(k)) pass(`meta ${k}`, "set");
  else warn(`meta ${k}`, "Meta connect disabled without it");
}

if (has("OPENAI_API_KEY")) pass("OPENAI_API_KEY", "set");
else warn("OPENAI_API_KEY", "AI copy/image disabled");

const google =
  has("GOOGLE_GENERATIVE_AI_API_KEY") || has("GEMINI_API_KEY");
if (google) pass("Google video key", "set");
else warn("GOOGLE_GENERATIVE_AI_API_KEY", "video generation disabled");

if (has("ELEVENLABS_API_KEY")) pass("ELEVENLABS_API_KEY", "set");
else warn("ELEVENLABS_API_KEY", "speech/sound disabled");

// Code: production app URL guard
const appUrlSrc = readFileSync(resolve(root, "src/lib/env/app-url.ts"), "utf8");
if (appUrlSrc.includes("VERCEL_ENV") && appUrlSrc.includes("production")) {
  pass("getAppUrl production guard", "implemented");
} else {
  invalid("getAppUrl production guard", "missing");
}

const migrations = readdirSync(resolve(root, "supabase/migrations")).filter((f) =>
  f.endsWith(".sql")
);
if (migrations.some((f) => f.startsWith("042_"))) {
  pass("Migration 042 present", "");
} else {
  missing("Migration 042", "");
}

const failed = results.filter((r) => r.state === "MISSING" || r.state === "INVALID");
const warnings = results.filter((r) => r.state === "WARNING");
console.log(
  `\nConfig check (${target}): ${results.length - failed.length - warnings.length} pass, ${warnings.length} warnings, ${failed.length} missing/invalid`
);
if (failed.length > 0 && isProdCheck) process.exit(1);
if (failed.filter((r) => r.state === "INVALID").length > 0) process.exit(1);
