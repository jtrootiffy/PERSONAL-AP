"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/lib/actions/auth";
import { useToast } from "@/components/ui/toast";

const schema = z.object({ email: z.string().trim().email("Enter a valid email") });
type Values = z.infer<typeof schema>;

export function ForgotPasswordForm() {
  const toast = useToast();
  const [pending, setPending] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "" } });

  async function onSubmit(values: Values) {
    setPending(true);
    const res = await requestPasswordReset(values);
    setPending(false);
    if (!res.ok) {
      toast.error("Something went wrong", res.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10 text-success">
            <MailCheck className="h-5 w-5" />
          </div>
          <CardTitle className="pt-2 text-lg">Check your inbox</CardTitle>
          <CardDescription>
            If an account exists for that email, a password reset link is on its way.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            Email delivery depends on the email provider configured in your Supabase project
            (Authentication → Email / SMTP). If nothing arrives, you can set a password directly with{" "}
            <code className="rounded bg-background px-1">npm run create:admin</code> or from the
            Supabase dashboard.
          </p>
          <Link href="/login" className="text-sm font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Reset your password</CardTitle>
        <CardDescription>We'll email you a secure reset link.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
          </Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Send reset link
          </Button>
          <div className="text-center">
            <Link href="/login" className="text-sm font-medium text-primary hover:underline">
              Back to sign in
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
