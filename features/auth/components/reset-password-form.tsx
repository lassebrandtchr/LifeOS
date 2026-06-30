"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/features/auth/actions";
import { Field } from "@/features/auth/components/field";

/**
 * Nulstil kodeord-formular. Vises efter brugeren har klikket på linket i
 * e-mailen (de har en midlertidig session via /auth/callback).
 */
export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <Field
        id="password"
        label="Nyt kodeord"
        error={state?.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="Mindst 8 tegn"
          required
        />
      </Field>

      <Field
        id="confirmPassword"
        label="Bekræft nyt kodeord"
        error={state?.fieldErrors?.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Gentag kodeordet"
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Gemmer …" : "Gem nyt kodeord"}
      </Button>
    </form>
  );
}
