import type { Metadata } from "next";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reset password" };
export const dynamic = "force-dynamic";

export default async function ResetPasswordPage() {
  const user = await getUser();

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Link expired or invalid</CardTitle>
          <CardDescription>
            This password reset link is no longer valid. Request a new one to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
            Request a new reset link
          </Link>
        </CardContent>
      </Card>
    );
  }

  return <ResetPasswordForm />;
}
