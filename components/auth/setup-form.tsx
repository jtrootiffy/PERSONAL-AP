"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldCheck } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { completeSetup } from "@/lib/actions/auth";
import { useToast } from "@/components/ui/toast";

const schema = z.object({
  token: z.string().trim().min(1, "Setup token is required"),
  fullName: z.string().trim().min(1, "Your name is required"),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters"),
});
type Values = z.infer<typeof schema>;

export function SetupForm() {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = React.useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { token: "", fullName: "", email: "", password: "" },
  });

  async function onSubmit(values: Values) {
    setPending(true);
    const res = await completeSetup(values);
    if (!res.ok) {
      setPending(false);
      toast.error("Setup failed", res.error);
      return;
    }
    toast.success("Administrator created", "Welcome to your workspace.");
    router.replace(res.redirectTo || "/dashboard");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <CardTitle className="pt-2 text-lg">Create the administrator</CardTitle>
        <CardDescription>
          One-time setup. Requires the <code className="rounded bg-muted px-1">SETUP_TOKEN</code>{" "}
          from your environment.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Setup token" htmlFor="token" error={errors.token?.message} required>
            <Input id="token" type="password" placeholder="SETUP_TOKEN value" {...register("token")} />
          </Field>
          <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message} required>
            <Input id="fullName" placeholder="Your name" {...register("fullName")} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email?.message} required>
            <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
          </Field>
          <Field label="Password" htmlFor="password" error={errors.password?.message} required>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              {...register("password")}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create administrator
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
