"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSiteUrl } from "@/lib/site-url";
import {
  loginSchema,
  signupSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  type AuthFormState,
} from "@/features/auth/schemas";

/**
 * Server Actions for autentificering.
 *
 * Alt kører på serveren ("use server"), så hverken validering eller
 * Supabase-kald kan manipuleres fra browseren. Hver action returnerer en
 * AuthFormState (fejl + feltfejl), som formularerne viser via useActionState.
 * Ved succes omdirigerer vi med ?flash=... så en dansk toast kan vises bagefter.
 */

const NOT_CONFIGURED =
  "Login er ikke aktivt endnu – Supabase er ikke sat op. Tilføj nøglerne i .env.local.";
const GENERIC_ERROR = "Der opstod en fejl. Prøv igen.";

/** Oversæt typiske Supabase-fejl til pæne danske beskeder. */
function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials"))
    return "Forkert e-mail eller adgangskode.";
  if (m.includes("email not confirmed"))
    return "Din e-mail er ikke bekræftet endnu. Tjek din indbakke.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Der findes allerede en konto med denne e-mail.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "For mange forsøg. Vent et øjeblik og prøv igen.";
  if (m.includes("should be at least"))
    return "Adgangskoden er for kort.";
  return GENERIC_ERROR;
}

// ───────────────────────────── LOG IND ─────────────────────────────
export async function login(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    remember: formData.get("remember") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { email, password, remember } = parsed.data;
  // "Husk mig" fra: brug session-cookies, der slettes når browseren lukkes.
  const supabase = await createClient({ sessionOnly: !remember });
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: translateAuthError(error.message) };

  redirect("/?flash=loggedind");
}

// ──────────────────────────── OPRET KONTO ───────────────────────────
export async function signup(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const { fullName, email, password } = parsed.data;
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  });

  if (error) return { error: translateAuthError(error.message) };

  // Hvis e-mailbekræftelse er slået fra, er brugeren logget ind med det samme.
  if (data.session) redirect("/?flash=loggedind");

  // Ellers: bed brugeren bekræfte sin e-mail.
  redirect("/bekraeft?type=opret");
}

// ───────────────────────── GLEMT KODEORD ────────────────────────────
export async function requestPasswordReset(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/auth/callback?next=/nulstil-kodeord`,
  });

  if (error) return { error: translateAuthError(error.message) };

  redirect("/bekraeft?type=nulstil");
}

// ───────────────────────── NULSTIL KODEORD ──────────────────────────
export async function resetPassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  if (!isSupabaseConfigured()) return { error: NOT_CONFIGURED };

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createClient();
  // Brugeren har en midlertidig session fra nulstillingslinket (via /auth/callback).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error: "Linket er udløbet. Bed om et nyt nulstillingslink.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });
  if (error) return { error: translateAuthError(error.message) };

  redirect("/?flash=kodeopdateret");
}

// ─────────────────────────────── LOG UD ─────────────────────────────
export async function logout() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/login?flash=loggedud");
}
