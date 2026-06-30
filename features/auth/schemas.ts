import * as z from "zod";

/**
 * Valideringsregler for autentificering (Zod).
 * Alle fejlbeskeder er på dansk, da de vises direkte til brugeren.
 * Tjekkene køres på serveren i Server Actions, så de ikke kan omgås.
 */

const email = z
  .email({ error: "Indtast en gyldig e-mailadresse." })
  .trim()
  .toLowerCase();

/** Lidt strengere krav, når man OPRETTER en ny adgangskode. */
const strongPassword = z
  .string()
  .min(8, { error: "Adgangskoden skal være mindst 8 tegn." })
  .regex(/[a-zA-Z]/, { error: "Adgangskoden skal indeholde mindst ét bogstav." })
  .regex(/[0-9]/, { error: "Adgangskoden skal indeholde mindst ét tal." });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Indtast din adgangskode." }),
  remember: z.boolean().optional(),
});

export const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(2, { error: "Indtast dit fulde navn." })
      .trim(),
    email,
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Adgangskoderne er ikke ens.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Adgangskoderne er ikke ens.",
    path: ["confirmPassword"],
  });

/** Fælles form-tilstand, som Server Actions returnerer til formularerne. */
export type AuthFormState =
  | {
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;
