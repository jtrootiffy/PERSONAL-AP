#!/usr/bin/env node
/**
 * Seed a user's workspace with realistic sample data.
 *
 *   npm run seed -- you@example.com
 *
 * Uses the Supabase service-role key. Safe to run once per workspace; it
 * aborts if the target user already has projects (pass `--force` to add anyway).
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const force = process.argv.includes("--force");
const emailArg = process.argv.slice(2).find((a) => !a.startsWith("--"));

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
if (!emailArg) bail("Usage: npm run seed -- you@example.com [--force]");

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function isoDaysFromNow(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
function dateDaysFromNow(days) {
  return isoDaysFromNow(days).slice(0, 10);
}

async function findUser(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) bail(error.message);
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < 200) return null;
    page += 1;
  }
}

async function main() {
  const user = await findUser(emailArg);
  if (!user) bail(`No user found with email ${emailArg}. Create one with \`npm run create:admin\`.`);
  const userId = user.id;

  const { data: existingProjects } = await admin
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .limit(1);

  if (existingProjects && existingProjects.length > 0 && !force) {
    bail(`User ${emailArg} already has data. Re-run with --force to add sample data anyway.`);
  }

  console.log(`\nSeeding workspace for ${emailArg} …`);

  // Clients -----------------------------------------------------------------
  const clientsPayload = [
    { name: "Northwind Trading", company: "Northwind Trading Co.", email: "hello@northwind.test", phone: "+63 917 000 0001", status: "active" },
    { name: "Acme Design Studio", company: "Acme Design Studio", email: "team@acme.test", phone: "+63 917 000 0002", status: "active" },
    { name: "Blue Harbor Cafe", company: "Blue Harbor Cafe", email: "owner@blueharbor.test", phone: "+63 917 000 0003", status: "active" },
    { name: "Orbit Logistics", company: "Orbit Logistics Inc.", email: "ops@orbit.test", phone: "+63 917 000 0004", status: "active" },
  ].map((c) => ({ ...c, user_id: userId }));

  const { data: clients, error: clientErr } = await admin
    .from("clients")
    .insert(clientsPayload)
    .select("id,name");
  if (clientErr) bail(`clients: ${clientErr.message}`);
  const clientId = (name) => clients.find((c) => c.name === name)?.id ?? null;

  // Projects ----------------------------------------------------------------
  const projectsPayload = [
    { title: "Northwind E-commerce Redesign", client_id: clientId("Northwind Trading"), category: "Web", status: "in_progress", priority: "high", budget: 180000, progress: 45, progress_mode: "auto", start_date: dateDaysFromNow(-40), deadline: isoDaysFromNow(20) },
    { title: "Acme Brand Refresh", client_id: clientId("Acme Design Studio"), category: "Branding", status: "planning", priority: "medium", budget: 95000, progress: 10, progress_mode: "manual", start_date: dateDaysFromNow(-5), deadline: isoDaysFromNow(45) },
    { title: "Blue Harbor Website", client_id: clientId("Blue Harbor Cafe"), category: "Web", status: "completed", priority: "medium", budget: 60000, progress: 100, progress_mode: "auto", start_date: dateDaysFromNow(-120), deadline: isoDaysFromNow(-10) },
    { title: "Orbit Internal Dashboard", client_id: clientId("Orbit Logistics"), category: "Software", status: "on_hold", priority: "low", budget: 220000, progress: 30, progress_mode: "manual", start_date: dateDaysFromNow(-60), deadline: isoDaysFromNow(60) },
  ].map((p) => ({ ...p, user_id: userId }));

  const { data: projects, error: projectErr } = await admin
    .from("projects")
    .insert(projectsPayload)
    .select("id,title");
  if (projectErr) bail(`projects: ${projectErr.message}`);
  const projectId = (title) => projects.find((p) => p.title === title)?.id ?? null;

  // Tasks -------------------------------------------------------------------
  const tasksPayload = [
    { project_id: projectId("Northwind E-commerce Redesign"), title: "Product listing wireframes", status: "completed", priority: "high", due_date: isoDaysFromNow(-15) },
    { project_id: projectId("Northwind E-commerce Redesign"), title: "Build cart & checkout flow", status: "in_progress", priority: "urgent", due_date: isoDaysFromNow(3) },
    { project_id: projectId("Northwind E-commerce Redesign"), title: "Payment gateway integration", status: "todo", priority: "high", due_date: isoDaysFromNow(7) },
    { project_id: projectId("Northwind E-commerce Redesign"), title: "QA on mobile breakpoints", status: "todo", priority: "medium", due_date: isoDaysFromNow(-2) },
    { project_id: projectId("Acme Brand Refresh"), title: "Moodboard & references", status: "in_progress", priority: "medium", due_date: isoDaysFromNow(5) },
    { project_id: projectId("Acme Brand Refresh"), title: "Logo concepts (3 directions)", status: "todo", priority: "high", due_date: isoDaysFromNow(12) },
    { project_id: projectId("Blue Harbor Website"), title: "Launch & handover", status: "completed", priority: "medium", due_date: isoDaysFromNow(-12), completed_at: isoDaysFromNow(-11) },
    { project_id: projectId("Orbit Internal Dashboard"), title: "Define KPI requirements", status: "todo", priority: "low", due_date: isoDaysFromNow(14) },
  ].map((t) => ({ ...t, user_id: userId, estimated_hours: 8, actual_hours: t.status === "completed" ? 7 : 2 }));

  const { data: tasks, error: taskErr } = await admin
    .from("tasks")
    .insert(tasksPayload)
    .select("id,title");
  if (taskErr) bail(`tasks: ${taskErr.message}`);

  const wireframes = tasks.find((t) => t.title === "Product listing wireframes");
  if (wireframes) {
    await admin.from("subtasks").insert([
      { user_id: userId, task_id: wireframes.id, title: "Header & nav", done: true, sort_order: 0 },
      { user_id: userId, task_id: wireframes.id, title: "Filter sidebar", done: true, sort_order: 1 },
      { user_id: userId, task_id: wireframes.id, title: "Product grid", done: false, sort_order: 2 },
    ]);
  }

  // Invoices + items + payments --------------------------------------------
  const invoicesPayload = [
    { number: "INV-0001", client_id: clientId("Blue Harbor Cafe"), project_id: projectId("Blue Harbor Website"), status: "paid", issue_date: dateDaysFromNow(-100), due_date: dateDaysFromNow(-86), currency: "PHP", subtotal: 60000, tax_rate: 0, tax_amount: 0, total: 60000, amount_paid: 60000 },
    { number: "INV-0002", client_id: clientId("Northwind Trading"), project_id: projectId("Northwind E-commerce Redesign"), status: "partially_paid", issue_date: dateDaysFromNow(-20), due_date: dateDaysFromNow(10), currency: "PHP", subtotal: 90000, tax_rate: 12, tax_amount: 10800, total: 100800, amount_paid: 40000 },
    { number: "INV-0003", client_id: clientId("Acme Design Studio"), project_id: projectId("Acme Brand Refresh"), status: "sent", issue_date: dateDaysFromNow(-8), due_date: dateDaysFromNow(6), currency: "PHP", subtotal: 47500, tax_rate: 12, tax_amount: 5700, total: 53200, amount_paid: 0 },
    { number: "INV-0004", client_id: clientId("Orbit Logistics"), project_id: projectId("Orbit Internal Dashboard"), status: "sent", issue_date: dateDaysFromNow(-40), due_date: dateDaysFromNow(-12), currency: "PHP", subtotal: 110000, tax_rate: 12, tax_amount: 13200, total: 123200, amount_paid: 0 },
  ].map((i) => ({ ...i, user_id: userId }));

  const { data: invoices, error: invErr } = await admin
    .from("invoices")
    .insert(invoicesPayload)
    .select("id,number");
  if (invErr) bail(`invoices: ${invErr.message}`);
  const invoiceId = (number) => invoices.find((i) => i.number === number)?.id ?? null;

  const items = [
    { invoice_id: invoiceId("INV-0001"), description: "Website design & build", quantity: 1, unit_price: 60000, amount: 60000 },
    { invoice_id: invoiceId("INV-0002"), description: "UX & wireframing", quantity: 1, unit_price: 40000, amount: 40000 },
    { invoice_id: invoiceId("INV-0002"), description: "Frontend development (phase 1)", quantity: 1, unit_price: 50000, amount: 50000 },
    { invoice_id: invoiceId("INV-0003"), description: "Brand strategy", quantity: 1, unit_price: 20000, amount: 20000 },
    { invoice_id: invoiceId("INV-0003"), description: "Logo design", quantity: 1, unit_price: 27500, amount: 27500 },
    { invoice_id: invoiceId("INV-0004"), description: "Discovery & scoping", quantity: 1, unit_price: 110000, amount: 110000 },
  ].map((it, i) => ({ ...it, user_id: userId, sort_order: i }));
  const { error: itemErr } = await admin.from("invoice_items").insert(items);
  if (itemErr) bail(`invoice_items: ${itemErr.message}`);

  const payments = [
    { invoice_id: invoiceId("INV-0001"), amount: 60000, paid_on: dateDaysFromNow(-88), method: "Bank transfer", reference: "BT-1001" },
    { invoice_id: invoiceId("INV-0002"), amount: 40000, paid_on: dateDaysFromNow(-12), method: "GCash", reference: "GC-2201" },
  ].map((p) => ({ ...p, user_id: userId }));
  const { error: payErr } = await admin.from("payments").insert(payments);
  if (payErr) bail(`payments: ${payErr.message}`);

  // Expenses ----------------------------------------------------------------
  const expenses = [
    { name: "Figma subscription", category: "Software", expense_date: dateDaysFromNow(-30), amount: 1500 },
    { name: "Adobe Creative Cloud", category: "Software", expense_date: dateDaysFromNow(-30), amount: 3200 },
    { name: "Internet & hosting", category: "Utilities", expense_date: dateDaysFromNow(-15), amount: 2500 },
    { name: "Stock photography", category: "Marketing", expense_date: dateDaysFromNow(-10), amount: 1800 },
  ].map((e) => ({ ...e, user_id: userId }));
  const { error: expErr } = await admin.from("expenses").insert(expenses);
  if (expErr) bail(`expenses: ${expErr.message}`);

  // Events & notes ----------------------------------------------------------
  await admin.from("events").insert([
    { user_id: userId, title: "Northwind review call", type: "meeting", start_at: isoDaysFromNow(2), end_at: isoDaysFromNow(2.05), all_day: false, client_id: clientId("Northwind Trading"), project_id: projectId("Northwind E-commerce Redesign") },
    { user_id: userId, title: "Invoice INV-0004 follow-up", type: "reminder", start_at: isoDaysFromNow(1), all_day: true, client_id: clientId("Orbit Logistics") },
  ]);

  await admin.from("notes").insert([
    { user_id: userId, title: "Northwind kickoff notes", content: "Client wants a calmer palette and faster checkout.", project_id: projectId("Northwind E-commerce Redesign"), pinned: true },
    { user_id: userId, title: "Acme preferences", content: "Prefers geometric type; avoid script fonts.", client_id: clientId("Acme Design Studio") },
  ]);

  await admin.from("activities").insert([
    { user_id: userId, entity_type: "project", entity_id: projectId("Northwind E-commerce Redesign"), action: "created", title: "Project created" },
    { user_id: userId, entity_type: "invoice", entity_id: invoiceId("INV-0002"), action: "payment_recorded", title: "Payment of ₱40,000 recorded" },
  ]);

  console.log(`\n✔ Seeded ${clients.length} clients, ${projects.length} projects, ${tasks.length} tasks, ${invoices.length} invoices.`);
  console.log("  Open the dashboard to see it come to life.\n");
}

main().catch((err) => bail(err?.message ?? String(err)));
