"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordReset } from "@/features/auth/actions";
import { Field } from "@/features/auth/components/field";

/**
 * Glemt kodeord-formular. Sender et nulstillingslink til brugerens e-mail.
 */
export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    undefined,
  );

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <Field id="email" label="E-mail" error={state?.fieldErrors?.email}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="dig@eksempel.dk"
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Sender …" : "Send nulstillingslink"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="link-anim font-medium text-primary">
          Tilbage til login
        </Link>
      </p>
    </form>
  );
}
