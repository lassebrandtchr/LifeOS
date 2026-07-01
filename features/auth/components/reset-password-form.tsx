"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { resetPassword } from "@/features/auth/actions";
import { Field } from "@/features/auth/components/field";

/**
 * Nulstil kodeord-formular. Vises efter brugeren har klikket på linket i
 * e-mailen. Engangskoden ("token_hash") verificeres FØRST når formularen
 * indsendes (en rigtig brugerhandling) – ikke automatisk ved sidevisning.
 * Det gør flowet robust mod mailscannere, der åbner linket på forhånd.
 */
export function ResetPasswordForm({ tokenHash }: { tokenHash?: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  if (!tokenHash) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          Linket er ugyldigt eller mangler. Bed om et nyt nulstillingslink.
        </p>
        <Link href="/glemt-kodeord" className="link-anim font-medium text-primary">
          Bed om nyt link
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
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
