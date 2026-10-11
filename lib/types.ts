// Shared domain types. The database is the source of truth; these interfaces
// mirror the SQL schema in supabase/migrations.

export type ProjectStatus =
  | "planning"
  | "not_started"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type TaskStatus =
  | "todo"
  | "in_progress"
  | "in_review"
  | "completed"
  | "cancelled";

export type Priority = "low" | "medium" | "high" | "urgent";

export type StoredInvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "cancelled";

export type InvoiceStatus = StoredInvoiceStatus | "overdue";

export type ClientStatus = "active" | "archived";

export type EventType =
  | "task"
  | "meeting"
  | "reminder"
  | "personal"
  | "invoice_due"
  | "project_deadline";

export type NotificationType = "deadline" | "overdue" | "payment" | "project" | "system";

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  user_id: string;
  business_name: string;
  business_email: string;
  business_phone: string;
  business_address: string;
  logo_url: string | null;
  currency: string;
  date_format: string;
  timezone: string;
  theme: string;
  invoice_prefix: string;
  invoice_next_number: number;
  payment_terms_days: number;
  default_tax_rate: number;
  default_discount: number;
  notify_in_app: boolean;
  notify_email: boolean;
  notify_days_before: number[];
  dashboard_cards: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  contact_person: string | null;
  notes: string | null;
  status: ClientStatus;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  client_id: string | null;
  title: string;
  description: string | null;
  category: string | null;
  start_date: string | null;
  deadline: string | null;
  status: ProjectStatus;
  priority: Priority;
  budget: number;
  progress: number;
  progress_mode: "auto" | "manual";
  archived: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  project_id: string | null;
  client_id: string | null;
  title: string;
  description: string | null;
  priority: Priority;
  status: TaskStatus;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  estimated_hours: number;
  actual_hours: number;
  recurrence: "none" | "daily" | "weekly" | "monthly";
  parent_task_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Subtask {
  id: string;
  user_id: string;
  task_id: string;
  title: string;
  done: boolean;
  sort_order: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  user_id: string;
  client_id: string | null;
  project_id: string | null;
  number: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  discount_type: "none" | "fixed" | "percent";
  discount_value: number;
  tax_rate: number;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  status: StoredInvoiceStatus;
  notes: string | null;
  terms: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  user_id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
  sort_order: number;
}

export interface Payment {
  id: string;
  user_id: string;
  invoice_id: string;
  amount: number;
  paid_on: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  project_id: string | null;
  name: string;
  category: string | null;
  expense_date: string;
  amount: number;
  notes: string | null;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  type: EventType;
  start_at: string;
  end_at: string | null;
  all_day: boolean;
  client_id: string | null;
  project_id: string | null;
  task_id: string | null;
  invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  project_id: string | null;
  task_id: string | null;
  client_id: string | null;
  title: string;
  content: string | null;
  pinned: boolean;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string | null;
  action: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  dedupe_key: string | null;
  created_at: string;
}

export interface Attachment {
  id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  name: string;
  url: string | null;
  created_at: string;
}
