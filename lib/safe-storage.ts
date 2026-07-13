/**
 * Sikker localStorage.
 *
 * HVORFOR: localStorage KASTER en fejl i flere helt normale situationer på
 * mobil – Safari i privat browsing, "storage full" på en fyldt telefon, og
 * når cookies/lagring er slået fra. Et ubeskyttet localStorage-kald kan
 * derfor vælte hele siden (hvidt skærmbillede). Alt lager-brug i appen går
 * gennem disse tre funktioner, som aldrig kaster.
 */

export function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Fuldt lager eller privat browsing – ignorér bevidst. Funktionaliteten
    // må gerne miste sin "hukommelse", men den må ALDRIG vælte appen.
  }
}

export function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Se ovenfor.
  }
}
