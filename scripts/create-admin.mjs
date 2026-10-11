#!/usr/bin/env node
/**
 * Create the first (or an additional) admin user.
 *
 *   npm run create:admin -- you@example.com "your-password" "Your Name"
 *
 * Uses the Supabase service-role key, so it must only be run locally or in a
 * trusted environment. The `handle_new_user` database trigger automatically
 * creates the matching profile + settings rows.
 */
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function bail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

if (!url || !serviceKey) {
  bail(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Copy .env.example to .env.local and fill them in first.",
  );
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/**
 * The app is useless without the migrated schema, and creating auth users
 * before the migrations exist leaves orphaned accounts (the handle_new_user
 * trigger can't run). Catch that early with a clear message.
 */
async function assertSchema() {
  const { error } = await admin.from("profiles").select("id").limit(1);
  if (error && /schema cache|does not exist|could not find the table/i.test(error.message)) {
    bail(
      "The database schema is missing — public.profiles could not be read.\n\n" +
        "  Apply the migrations in supabase/migrations first (in order):\n" +
        "    0001_schema.sql\n" +
        "    0002_functions.sql\n" +
        "    0003_rls.sql\n\n" +
        "  Easiest: with DATABASE_URL set in .env.local, run:\n" +
        "    npm run migrate\n\n" +
        "  Or paste each file into the Supabase SQL editor.\n" +
        "  Then re-run: npm run create:admin -- you@example.com \"password\" \"Your Name\"",
    );
  }
}

/** Ensure the profile + settings rows exist for a user (idempotent). */
async function ensureRows(userId, email, fullName) {
  await admin
    .from("profiles")
    .upsert({ id: userId, email, ...(fullName ? { full_name: fullName } : {}) }, { onConflict: "id" });
  await admin.from("settings").upsert({ user_id: userId }, { onConflict: "user_id" });
}

async function findUserByEmail(email) {
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const match = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function main() {
  await assertSchema();

  let [email, password, fullName] = process.argv.slice(2);
  const rl = readline.createInterface({ input, output });

  try {
    if (!email) email = (await rl.question("Admin email: ")).trim();
    if (!password) password = await rl.question("Password (min 8 chars): ");
    if (!fullName) fullName = (await rl.question("Full name (optional): ")).trim();
  } finally {
    rl.close();
  }

  if (!email || !email.includes("@")) bail("A valid email address is required.");
  if (!password || password.length < 6) bail("Password must be at least 6 characters.");

  console.log(`\nCreating user ${email} …`);

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error && /already/i.test(error.message)) {
    // The account exists — likely from an earlier run before the schema was
    // in place. Repair the missing profile/settings rows instead of failing.
    const existing = await findUserByEmail(email);
    if (!existing) bail(`A user with ${email} already exists. Sign in instead, or reset the password in Supabase.`);

    console.log("  · User already exists — ensuring profile & settings rows …");
    await ensureRows(existing.id, email, fullName || existing.user_metadata?.full_name || "");

    const { error: pwError } = await admin.auth.admin.updateUserById(existing.id, { password });
    if (pwError) console.warn(`  ! Could not update password: ${pwError.message}`);

    console.log(`\n✔ Admin ready: ${email}`);
    console.log("  Profile & settings ensured. Password updated.\n");
    return;
  }

  if (error) bail(error.message);

  if (data.user) {
    await ensureRows(data.user.id, email, fullName || "");
  }

  console.log(`\n✔ Admin created: ${email}`);
  console.log("  Sign in at /login\n");
}

main().catch((err) => bail(err?.message ?? String(err)));
