"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { APP_URL, SETUP_TOKEN } from "@/lib/env";
import {
  loginSchema,
  forgotSchema,
  resetSchema,
  setupSchema,
  changePasswordSchema,
} from "@/lib/validation";
import { zodFail, fail, type ActionResult } from "./util";

export async function signIn(input: {
  email: string;
  password: string;
  remember?: boolean;
}): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) return fail(error.message);
  return { ok: true, redirectTo: "/dashboard" };
}

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(input: {
  email: string;
}): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const supabase = createClient();
  // Supabase sends the recovery email using your project's email settings.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${APP_URL}/auth/callback?next=/reset-password`,
  });

  // Always report success so we never reveal whether an email is registered.
  return {
    ok: true,
    data: undefined,
  } as ActionResult;
}

export async function updatePassword(input: {
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return fail(error.message);
  return { ok: true, redirectTo: "/dashboard" };
}

export async function changePassword(input: {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return fail("You are not signed in.");

  // Verify the current password first.
  const check = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.currentPassword,
  });
  if (check.error) return fail("Your current password is incorrect.");

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return fail(error.message);
  return { ok: true };
}

/**
 * One-time bootstrap for the very first administrator.
 * Guarded by SETUP_TOKEN; uses the service role so public signup can stay off.
 */
export async function completeSetup(input: {
  token: string;
  fullName: string;
  email: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = setupSchema.safeParse(input);
  if (!parsed.success) return zodFail(parsed.error);

  if (!SETUP_TOKEN) {
    return fail(
      "Setup is disabled. Set the SETUP_TOKEN environment variable to enable the one-time setup page.",
    );
  }
  if (parsed.data.token !== SETUP_TOKEN) {
    return fail("The setup token is incorrect.");
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    return fail((e as Error).message);
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });

  if (createError) return fail(createError.message);
  if (!created.user) return fail("Could not create the administrator account.");

  // Establish a session for the new admin.
  const supabase = createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (signInError) return fail(signInError.message);

  return { ok: true, redirectTo: "/dashboard" };
}
