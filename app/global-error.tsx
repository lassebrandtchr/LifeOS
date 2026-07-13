"use client";

import * as React from "react";

/**
 * Sidste forsvarslinje: fejl-grænse for HELE appen – inkl. fejl i rod-layoutet
 * (temaer, providers osv.), som app/(app)/error.tsx ikke kan fange.
 *
 * Erstatter rod-layoutet fuldstændigt, når den udløses, og skal derfor selv
 * rendere <html> og <body>. Den må ikke afhænge af providers/tokens (de kan
 * jo netop være dét, der fejlede), så stilen er bevidst skrevet med rene
 * inline-styles i stedet for CSS-variabler/Tailwind-tokens.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("[LifeOS] Kritisk fejl:", error);
  }, [error]);

  return (
    <html lang="da">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          backgroundColor: "#0f161e",
          color: "#e7ecf4",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "420px",
            textAlign: "center",
            backgroundColor: "#18212d",
            border: "1px solid #2a3646",
            borderRadius: "22px",
            padding: "28px 24px",
          }}
        >
          <div style={{ fontSize: "34px", lineHeight: 1 }}>⚠️</div>

          <h1 style={{ margin: "16px 0 0", fontSize: "18px", fontWeight: 600 }}>
            Appen stødte på en fejl
          </h1>
          <p
            style={{
              margin: "8px 0 0",
              fontSize: "14px",
              lineHeight: 1.5,
              color: "#9aa7ba",
            }}
          >
            Prøv igen – det plejer at være nok. Dine data er ikke gået tabt.
          </p>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginTop: "20px",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "10px 16px",
                borderRadius: "14px",
                border: "none",
                backgroundColor: "#4ae693",
                color: "#06150c",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              Prøv igen
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.href = "/";
              }}
              style={{
                padding: "10px 16px",
                borderRadius: "14px",
                border: "1px solid #2a3646",
                backgroundColor: "transparent",
                color: "#e7ecf4",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                touchAction: "manipulation",
              }}
            >
              Genindlæs appen
            </button>
          </div>

          {error.digest && (
            <p style={{ margin: "16px 0 0", fontSize: "11px", color: "#5f6d7e" }}>
              Fejl-id: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  );
}
