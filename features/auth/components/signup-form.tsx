"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signup } from "@/features/auth/actions";
import { Field } from "@/features/auth/components/field";

/**
 * Opret konto-formular. Felter: fulde navn, e-mail, adgangskode + bekræft.
 */
export function SignupForm() {
  const [state, action, pending] = useActionState(signup, undefined);

  useEffect(() => {
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <Field id="fullName" label="Fulde navn" error={state?.fieldErrors?.fullName}>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          placeholder="Lasse Brandt Christensen"
          required
        />
      </Field>

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

      <Field
        id="password"
        label="Adgangskode"
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
        label="Bekræft adgangskode"
        error={state?.fieldErrors?.confirmPassword}
      >
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Gentag adgangskoden"
          required
        />
      </Field>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Opretter konto …" : "Opret konto"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Har du allerede en konto?{" "}
        <Link href="/login" className="link-anim font-medium text-primary">
          Log ind
        </Link>
      </p>
    </form>
  );
}
