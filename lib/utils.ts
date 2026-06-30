import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn = "class names".
 * Slår Tailwind-klasser sammen og fjerner konflikter,
 * så fx cn("p-2", betingelse && "p-4") giver det rigtige resultat.
 * Bruges af stort set alle UI-komponenter.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Laver initialer ud fra et navn (fx "Lasse Brandt" → "LB").
 * Bruges som fallback i avataren, hvis der ikke er et profilbillede.
 */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}
