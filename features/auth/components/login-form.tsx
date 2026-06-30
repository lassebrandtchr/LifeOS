"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { login } from "@/features/auth/actions";
import { Field } from "@/features/auth/components/field";

/**
 * Login-formular. Bruger React's useActionState til at kalde server-action'en
 * `login` og vise fejl/feltfejl. Ved succes omdirigerer server'en selv.
 */
export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

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

      <Field
        id="password"
        label="Adgangskode"
        error={state?.fieldErrors?.password}
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </Field>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            name="remember"
            defaultChecked
            className="size-4 rounded border-input accent-primary"
          />
          Husk mig
        </label>
        <Link
          href="/glemt-kodeord"
          className="link-anim text-sm font-medium text-primary"
        >
          Glemt kodeord?
        </Link>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Logger ind …" : "Log ind"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Har du ikke en konto?{" "}
        <Link href="/opret" className="link-anim font-medium text-primary">
          Opret konto
        </Link>
      </p>
    </form>
  );
}
