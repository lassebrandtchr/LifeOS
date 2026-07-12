import type { Customer } from "@/features/tasks/types";

/**
 * Kundeinfo-hjælpere. customer-kolonnen kan mangle i Supabase (defensiv mod
 * ikke-kørt migration), så alt her tåler `undefined`/`null`.
 */

/** Trim felter, drop tomme, og returnér null hvis intet er udfyldt. */
export function normalizeCustomer(
  c: Customer | null | undefined,
): Customer | null {
  if (!c) return null;
  const out: Customer = {};
  const name = c.name?.trim();
  const phone = c.phone?.trim();
  const email = c.email?.trim();
  const address = c.address?.trim();
  if (name) out.name = name;
  if (phone) out.phone = phone;
  if (email) out.email = email;
  if (address) out.address = address;
  return Object.keys(out).length ? out : null;
}

/** Har opgaven kundeinfo (mindst ét udfyldt felt)? */
export function hasCustomerInfo(c: Customer | null | undefined): boolean {
  return normalizeCustomer(c) !== null;
}

/** Kort label til badge/kort: navn hvis muligt, ellers tlf./e-mail, ellers "Kunde". */
export function customerLabel(c: Customer | null | undefined): string | null {
  const n = normalizeCustomer(c);
  if (!n) return null;
  return n.name ?? n.phone ?? n.email ?? "Kunde";
}
