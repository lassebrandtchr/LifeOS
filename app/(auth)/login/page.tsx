import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { LoginForm } from "@/features/auth/components/login-form";

export const metadata: Metadata = { title: "Log ind" };

export default function LoginPage() {
  return (
    <AuthCard
      title="Velkommen tilbage"
      description="Log ind for at få adgang til hele dit LifeOS."
    >
      <LoginForm />
    </AuthCard>
  );
}
