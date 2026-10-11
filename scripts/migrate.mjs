#!/usr/bin/env node
/**
 * Apply the SQL migrations in supabase/migrations in order.
 *
 *   npm run migrate
 *
 * Requires DATABASE_URL in .env.local (Supabase → Settings → Database →
 * Connection string → URI; use the pooler on port 6543). Also notifies
 * PostgREST to reload its schema cache when done.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

function bail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url || url.includes("YOUR-PASSWORD") || url.includes("your-project-ref")) {
  bail(
    "Missing DATABASE_URL.\n" +
      "  Add it to .env.local (Supabase → Settings → Database → Connection string → URI).\n" +
      "  It looks like: postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres",
  );
}

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(here, "..", "supabase", "migrations");

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) bail(`No .sql files found in ${migrationsDir}`);

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("\nApplying migrations to your database …\n");
  await client.connect();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    process.stdout.write(`  → ${file} `);
    try {
      await client.query(sql);
      process.stdout.write("✓\n");
    } catch (err) {
      process.stdout.write("✗\n");
      bail(`${file} failed:\n  ${err.message}`);
    }
  }

  // Make the new tables immediately visible to the REST API.
  try {
    await client.query("notify pgrst, 'reload schema';");
  } catch {
    /* harmless if the role can't notify */
  }

  await client.end();
  console.log("\n✔ Migrations applied.\n");
  console.log("  Next: create your admin user →");
  console.log('    npm run create:admin -- you@example.com "password" "Your Name"\n');
}

main().catch(async (err) => {
  try {
    await client.end();
  } catch {}
  bail(err?.message ?? String(err));
});
