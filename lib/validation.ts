import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------
const emptyToNull = (v: unknown) =>
  v === "" || v === undefined || v === null ? null : v;

/** Optional free-text field: "" becomes null. */
const optionalText = z.preprocess(emptyToNull, z.string().trim().nullable().optional());

/** Optional date string ("yyyy-MM-dd" or ISO); "" becomes null. */
const optionalDate = z.preprocess(
  emptyToNull,
  z.string().trim().nullable().optional(),
);

const money = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? 0 : v),
  z.coerce.number().min(0, "Must be zero or greater").finite(),
);

const percent = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? 0 : v),
  z.coerce.number().min(0).max(1000).finite(),
);

const reqText = (msg = "This field is required") =>
  z.string().trim().min(1, msg);

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional().default(false),
});

export const forgotSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
});

export const resetSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(8, "Use at least 8 characters"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const setupSchema = z.object({
  token: z.string().trim().min(1, "Setup token is required"),
  fullName: reqText("Your name is required"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(8, "Use at least 8 characters"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ---------------------------------------------------------------------------
// Clients
// ---------------------------------------------------------------------------
export const clientSchema = z.object({
  name: reqText("Client name is required"),
  company: optionalText,
  email: z.preprocess(
    emptyToNull,
    z.string().trim().email("Enter a valid email").nullable().optional(),
  ),
  phone: optionalText,
  billing_address: optionalText,
  contact_person: optionalText,
  notes: optionalText,
  status: z.enum(["active", "archived"]).default("active"),
});

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------
export const projectSchema = z.object({
  title: reqText("Project title is required"),
  description: optionalText,
  client_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  category: optionalText,
  start_date: optionalDate,
  deadline: optionalDate,
  status: z.enum([
    "planning",
    "not_started",
    "in_progress",
    "on_hold",
    "completed",
    "cancelled",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  budget: money,
  progress: z.coerce.number().int().min(0).max(100).default(0),
  progress_mode: z.enum(["auto", "manual"]).default("auto"),
  archived: z.coerce.boolean().default(false),
  notes: optionalText,
});

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
export const taskSchema = z.object({
  title: reqText("Task title is required"),
  description: optionalText,
  project_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  client_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["todo", "in_progress", "in_review", "completed", "cancelled"]),
  start_date: optionalDate,
  due_date: optionalDate,
  estimated_hours: money,
  actual_hours: money,
  recurrence: z.enum(["none", "daily", "weekly", "monthly"]).default("none"),
  sort_order: z.coerce.number().int().default(0),
});

export const subtaskSchema = z.object({
  title: reqText("Subtask title is required"),
  task_id: z.string().uuid(),
  sort_order: z.coerce.number().int().default(0),
});

// ---------------------------------------------------------------------------
// Invoices
// ---------------------------------------------------------------------------
export const invoiceItemSchema = z.object({
  description: z.string().trim().default(""),
  quantity: z.coerce.number().min(0).finite().default(1),
  unit_price: z.coerce.number().min(0).finite().default(0),
});

export const invoiceSchema = z.object({
  number: optionalText,
  client_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  project_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  issue_date: optionalDate,
  due_date: optionalDate,
  currency: z.string().trim().default("PHP"),
  discount_type: z.enum(["none", "fixed", "percent"]).default("none"),
  discount_value: money,
  tax_rate: percent,
  status: z.enum(["draft", "sent", "partially_paid", "paid", "cancelled"]).default("draft"),
  notes: optionalText,
  terms: optionalText,
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
});

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
export const paymentSchema = z.object({
  invoice_id: z.string().uuid("Select an invoice"),
  amount: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? 0 : v),
    z.coerce.number().positive("Amount must be greater than zero").finite(),
  ),
  paid_on: optionalDate,
  method: optionalText,
  reference: optionalText,
  notes: optionalText,
});

// ---------------------------------------------------------------------------
// Expenses
// ---------------------------------------------------------------------------
export const expenseSchema = z.object({
  name: reqText("Expense name is required"),
  category: optionalText,
  project_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  expense_date: optionalDate,
  amount: money,
  notes: optionalText,
});

// ---------------------------------------------------------------------------
// Calendar events
// ---------------------------------------------------------------------------
export const eventSchema = z.object({
  title: reqText("Event title is required"),
  description: optionalText,
  type: z.enum([
    "task",
    "meeting",
    "reminder",
    "personal",
    "invoice_due",
    "project_deadline",
  ]),
  start_at: reqText("Start date/time is required"),
  end_at: optionalText,
  all_day: z.coerce.boolean().default(false),
  client_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  project_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
});

// ---------------------------------------------------------------------------
// Notes
// ---------------------------------------------------------------------------
export const noteSchema = z.object({
  title: optionalText,
  content: optionalText,
  project_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  task_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  client_id: z.preprocess(emptyToNull, z.string().uuid().nullable().optional()),
  pinned: z.coerce.boolean().default(false),
});

// ---------------------------------------------------------------------------
// Settings / profile
// ---------------------------------------------------------------------------
export const profileSchema = z.object({
  full_name: optionalText,
  avatar_url: optionalText,
});

export const settingsSchema = z.object({
  business_name: optionalText,
  business_email: z.preprocess(
    emptyToNull,
    z.string().trim().email("Enter a valid email").nullable().optional(),
  ),
  business_phone: optionalText,
  business_address: optionalText,
  logo_url: optionalText,
  currency: z.string().trim().min(1).default("PHP"),
  date_format: z.string().trim().default("MMM d, yyyy"),
  timezone: z.string().trim().default("Asia/Manila"),
  theme: z.enum(["light", "dark", "system"]).default("system"),
  invoice_prefix: z.string().trim().default("INV-"),
  invoice_next_number: z.coerce.number().int().min(1).default(1),
  payment_terms_days: z.coerce.number().int().min(0).max(365).default(14),
  default_tax_rate: percent,
  default_discount: percent,
  notify_in_app: z.coerce.boolean().default(true),
  notify_email: z.coerce.boolean().default(false),
  notify_days_before: z.array(z.coerce.number().int()).default([7, 3, 1, 0]),
  dashboard_cards: z.record(z.boolean()).default({}),
});

export type ClientInput = z.infer<typeof clientSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type TaskInput = z.infer<typeof taskSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;
export type EventInput = z.infer<typeof eventSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
