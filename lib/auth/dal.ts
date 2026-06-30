import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { currentUser as demoUser } from "@/config/site";

/**
 * Data Access Layer (DAL) for autentificering.
 *
 * Dette er det ENESTE sted, hvor vi finder den indloggede bruger. Ved at samle
 * logikken her sikrer vi, at tjekket sker ens overalt (anbefalet praksis i
 * Next.js 16). `cache()` sørger for, at vi kun spørger Supabase én gang pr.
 * request, selvom flere komponenter beder om brugeren.
 */

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  status: string;
  /** true når vi kører uden Supabase (åben demo-tilstand). */
  isDemo: boolean;
};

/**
 * Henter den aktuelle bruger – eller null hvis ingen er logget ind.
 * Hvis Supabase ikke er sat op endnu, returneres en "demo-bruger" (Lasse),
 * så hele UI'et virker, mens login endnu ikke er aktivt.
 */
export const getOptionalUser = cache(async (): Promise<SessionUser | null> => {
  // Demo-tilstand: ingen Supabase endnu → vis Lasse, ingen login krævet.
  if (!isSupabaseConfigured()) {
    return {
      id: "demo",
      name: demoUser.name,
      email: demoUser.email,
      avatarUrl: demoUser.avatar,
      status: "Demo-tilstand",
      isDemo: true,
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Hent profil (navn + avatar). Findes den ikke endnu, bruger vi fornuftige
  // standardværdier fra brugerens auth-data.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("user_id", user.id)
    .maybeSingle();

  // Brug || så tomme navne også falder tilbage til metadata/e-mail.
  const name =
    profile?.full_name?.trim() ||
    (user.user_metadata?.full_name as string | undefined) ||
    user.email ||
    "Bruger";

  return {
    id: user.id,
    name,
    email: user.email ?? "",
    avatarUrl: profile?.avatar_url ?? demoUser.avatar,
    status: "Logget ind",
    isDemo: false,
  };
});

/**
 * Kræver en indlogget bruger. Er ingen logget ind, sendes brugeren til /login.
 * Bruges i beskyttede sider/layouts som ekstra sikkerhedslag oven på proxy.ts.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
});
