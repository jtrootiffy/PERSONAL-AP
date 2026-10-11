import type {
  Priority,
  ProjectStatus,
  TaskStatus,
  InvoiceStatus,
  ClientStatus,
  EventType,
  NotificationType,
} from "./types";

// ---------------------------------------------------------------------------
// Display labels
// ---------------------------------------------------------------------------
export const PROJECT_STATUSES: ProjectStatus[] = [
  "planning",
  "not_started",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
];

export const TASK_STATUSES: TaskStatus[] = [
  "todo",
  "in_progress",
  "in_review",
  "completed",
  "cancelled",
];

export const PRIORITIES: Priority[] = ["low", "medium", "high", "urgent"];

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
];

export const CLIENT_STATUSES: ClientStatus[] = ["active", "archived"];

export const EVENT_TYPES: EventType[] = [
  "task",
  "meeting",
  "reminder",
  "personal",
  "invoice_due",
  "project_deadline",
];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  not_started: "Not Started",
  in_progress: "In Progress",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  urgent: "Urgent",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially Paid",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  active: "Active",
  archived: "Archived",
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  task: "Task",
  meeting: "Meeting",
  reminder: "Reminder",
  personal: "Personal",
  invoice_due: "Invoice Due",
  project_deadline: "Project Deadline",
};

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  deadline: "Deadline",
  overdue: "Overdue",
  payment: "Payment",
  project: "Project",
  system: "System",
};

// ---------------------------------------------------------------------------
// Colour tones (map to tailwind classes used by <StatusBadge/>)
// ---------------------------------------------------------------------------
export type Tone =
  | "default"
  | "muted"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "primary";

export const PROJECT_STATUS_TONES: Record<ProjectStatus, Tone> = {
  planning: "info",
  not_started: "muted",
  in_progress: "primary",
  on_hold: "warning",
  completed: "success",
  cancelled: "danger",
};

export const TASK_STATUS_TONES: Record<TaskStatus, Tone> = {
  todo: "muted",
  in_progress: "primary",
  in_review: "info",
  completed: "success",
  cancelled: "danger",
};

export const PRIORITY_TONES: Record<Priority, Tone> = {
  low: "muted",
  medium: "info",
  high: "warning",
  urgent: "danger",
};

export const INVOICE_STATUS_TONES: Record<InvoiceStatus, Tone> = {
  draft: "muted",
  sent: "info",
  partially_paid: "warning",
  paid: "success",
  overdue: "danger",
  cancelled: "danger",
};

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
  task: "#6366f1",
  meeting: "#0ea5e9",
  reminder: "#f59e0b",
  personal: "#10b981",
  invoice_due: "#ef4444",
  project_deadline: "#a855f7",
};

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
export interface NavItem {
  href: string;
  label: string;
  icon: string; // lucide icon name, resolved in the sidebar
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/projects", label: "Projects", icon: "FolderKanban" },
  { href: "/tasks", label: "Tasks", icon: "CheckSquare" },
  { href: "/calendar", label: "Calendar", icon: "CalendarDays" },
  { href: "/clients", label: "Clients", icon: "Users" },
  { href: "/invoices", label: "Invoices", icon: "FileText" },
  { href: "/payments", label: "Payments", icon: "Wallet" },
  { href: "/expenses", label: "Expenses", icon: "Receipt" },
  { href: "/notes", label: "Notes", icon: "StickyNote" },
  { href: "/reports", label: "Reports", icon: "BarChart3" },
  { href: "/settings", label: "Settings", icon: "Settings" },
];

// ---------------------------------------------------------------------------
// Currencies (initial default: PHP)
// ---------------------------------------------------------------------------
export const CURRENCIES: { code: string; label: string; symbol: string }[] = [
  { code: "PHP", label: "Philippine Peso", symbol: "₱" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" },
];

export const DATE_FORMATS = [
  "MMM d, yyyy",
  "MMMM d, yyyy",
  "MM/dd/yyyy",
  "dd/MM/yyyy",
  "yyyy-MM-dd",
  "d MMM yyyy",
];

export const TIMEZONES = [
  "Asia/Manila",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Dubai",
  "Australia/Sydney",
];

export const PAYMENT_METHODS = [
  "Bank Transfer",
  "Cash",
  "Credit Card",
  "Debit Card",
  "GCash",
  "Maya",
  "PayPal",
  "Wise",
  "Check",
  "Other",
];

export const EXPENSE_CATEGORIES = [
  "Software",
  "Hardware",
  "Subscriptions",
  "Marketing",
  "Contractor",
  "Travel",
  "Utilities",
  "Taxes",
  "Equipment",
  "Other",
];

// Dashboard summary cards - the user can toggle these in Settings.
export const DASHBOARD_CARDS: { key: string; label: string; href: string }[] = [
  { key: "active_projects", label: "Active Projects", href: "/projects?status=in_progress" },
  { key: "completed_projects", label: "Completed Projects", href: "/projects?status=completed" },
  { key: "pending_tasks", label: "Pending Tasks", href: "/tasks?status=todo" },
  { key: "overdue_tasks", label: "Overdue Tasks", href: "/tasks?filter=overdue" },
  { key: "due_today", label: "Tasks Due Today", href: "/tasks?filter=today" },
  { key: "clients", label: "Total Clients", href: "/clients" },
  { key: "unpaid_invoices", label: "Unpaid Invoices", href: "/invoices?status=unpaid" },
  { key: "overdue_invoices", label: "Overdue Invoices", href: "/invoices?status=overdue" },
  { key: "income", label: "Income Received", href: "/payments" },
  { key: "outstanding", label: "Outstanding Payments", href: "/invoices?status=unpaid" },
];

export const DEFAULT_DASHBOARD_CARDS: Record<string, boolean> = Object.fromEntries(
  DASHBOARD_CARDS.map((c) => [c.key, true]),
);
