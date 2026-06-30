import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Glemt kodeord" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Glemt kodeord"
      description="Indtast din e-mail, så sender vi dig et link til at nulstille din adgangskode."
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
