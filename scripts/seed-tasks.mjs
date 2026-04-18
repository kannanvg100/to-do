import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// Load .env manually (no dotenv dependency needed)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
const env = Object.fromEntries(
  readFileSync(envPath, "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"))
    .map((l) => l.split("=").map((p) => p.trim()))
);

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env");
  process.exit(1);
}

// ── Config ────────────────────────────────────────────────────────────────────
const EMAIL = process.env.SEED_EMAIL;
const PASSWORD = process.env.SEED_PASSWORD;
const WORKSPACE_NAME = process.env.SEED_WORKSPACE ?? "My Tasks";

if (!EMAIL || !PASSWORD) {
  console.error("Usage: SEED_EMAIL=you@example.com SEED_PASSWORD=secret node scripts/seed-tasks.mjs");
  process.exit(1);
}

const TASKS = [
  "setup docs selection",
  "notification onclick",
  "view setup header",
  "npm audit",
  "ip wl tooltip",
  "onboarding email design",
  "profile tab sel radius",
  "email parent msg link",
  "BE error obj",
  "migrate form",
  "display pricing details",
  "data title restriction",
  "search autocomplete issue",
  "user role permission fix",
  "api response formatting",
  "form validation edge cases",
  "pagination state bug",
  "modal close behavior",
  "toast message handling",
  "date picker timezone issue",
  "file upload retry logic",
  "caching inconsistency",
  "session timeout handling",
  "dashboard widget alignment",
  "analytics event tracking",
  "pricing - fixed label rev",
  "0 pricing",
];

// ── Run ───────────────────────────────────────────────────────────────────────
const supabase = createClient(url, key);

const { error: signInError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (signInError) {
  console.error("Sign-in failed:", signInError.message);
  process.exit(1);
}
console.log(`Signed in as ${EMAIL}`);

// Create or reuse workspace
const { data: existing } = await supabase
  .from("workspaces")
  .select("id, name")
  .eq("name", WORKSPACE_NAME)
  .maybeSingle();

let workspaceId;
if (existing) {
  workspaceId = existing.id;
  console.log(`Using existing workspace "${WORKSPACE_NAME}" (${workspaceId})`);
} else {
  const { data: { user } } = await supabase.auth.getUser();
  const { data: ws, error: wsError } = await supabase
    .from("workspaces")
    .insert({ name: WORKSPACE_NAME, user_id: user.id })
    .select()
    .single();
  if (wsError) {
    console.error("Failed to create workspace:", wsError.message);
    process.exit(1);
  }
  workspaceId = ws.id;
  console.log(`Created workspace "${WORKSPACE_NAME}" (${workspaceId})`);
}

// Insert tasks
const rows = TASKS.map((title) => ({ workspace_id: workspaceId, title, completed: false }));
const { error: insertError } = await supabase.from("tasks").insert(rows);
if (insertError) {
  console.error("Failed to insert tasks:", insertError.message);
  process.exit(1);
}

console.log(`Inserted ${TASKS.length} tasks.`);
