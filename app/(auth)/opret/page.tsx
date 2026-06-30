import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { SignupForm } from "@/features/auth/components/signup-form";

export const metadata: Metadata = { title: "Opret konto" };

export default function SignupPage() {
  return (
    <AuthCard
      title="Opret konto"
      description="Opret din ejer-konto til LifeOS."
    >
      <SignupForm />
    </AuthCard>
  );
}
