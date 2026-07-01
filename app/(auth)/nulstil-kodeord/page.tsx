import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Nulstil kodeord" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string }>;
}) {
  const { token_hash: tokenHash } = await searchParams;

  return (
    <AuthCard
      title="Nulstil kodeord"
      description="Vælg et nyt og sikkert kodeord til din konto."
    >
      <ResetPasswordForm tokenHash={tokenHash} />
    </AuthCard>
  );
}
