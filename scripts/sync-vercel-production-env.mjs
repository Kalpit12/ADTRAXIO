/**
 * Sync selected vars from .env.local to Vercel Production (values never logged).
 * Usage: node scripts/sync-vercel-production-env.mjs
 */
import { readFileSync } from "fs";
import { spawnSync } from "child_process";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PRODUCTION_APP_URL = "https://adtraxio.vercel.app";
const META_CALLBACK = `${PRODUCTION_APP_URL}/api/social/meta/callback`;

const KEYS_FROM_LOCAL = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
  "SOCIAL_TOKEN_ENCRYPTION_KEY",
  "OPENAI_API_KEY",
  "OPENAI_MODEL",
  "OPENAI_IMAGE_MODEL",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_VIDEO_MODEL",
  "ELEVENLABS_API_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_PRO",
  "STRIPE_PRICE_AGENCY",
  "META_APP_ID",
  "META_APP_SECRET",
  "META_INSTAGRAM_APP_ID",
  "META_INSTAGRAM_APP_SECRET",
  "INSTAGRAM_APP_ID",
  "INSTAGRAM_APP_SECRET",
  "META_GRAPH_API_VERSION",
  "NEXT_PUBLIC_INSTAGRAM_APP_URL",
];

function parseEnvFile(path) {
  const out = {};
  if (!readFileSync(path, "utf8")) return out;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 0) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const local = parseEnvFile(resolve(root, ".env.local"));
const overrides = {
  NEXT_PUBLIC_APP_URL: PRODUCTION_APP_URL,
  META_REDIRECT_URI: META_CALLBACK,
};

const results = [];
function setEnv(name, value, { publicConfig = false } = {}) {
  const args = [
    "vercel",
    "env",
    "add",
    name,
    "production",
    "--force",
    "--yes",
    "--value",
    value,
  ];
  if (publicConfig) {
    args.push("--no-sensitive");
  }
  const child = spawnSync("npx", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
    windowsHide: true,
  });
  const ok = child.status === 0;
  const err = (child.stderr || child.stdout || "").slice(0, 200);
  results.push({ name, ok, detail: ok ? "set" : err });
  console.log(`[${ok ? "OK" : "FAIL"}] ${name}${ok ? "" : ` — ${err}`}`);
}

const PUBLIC_CONFIG_KEYS = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_INSTAGRAM_APP_URL",
]);

setEnv("NEXT_PUBLIC_APP_URL", overrides.NEXT_PUBLIC_APP_URL, {
  publicConfig: true,
});
setEnv("META_REDIRECT_URI", overrides.META_REDIRECT_URI);

for (const key of KEYS_FROM_LOCAL) {
  const v = local[key]?.trim();
  if (!v) continue;
  setEnv(key, v, { publicConfig: PUBLIC_CONFIG_KEYS.has(key) });
}

const failed = results.filter((r) => !r.ok);
console.log(`\nSynced ${results.length - failed.length}/${results.length} variables.`);
if (failed.length) process.exit(1);
