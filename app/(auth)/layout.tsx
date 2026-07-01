import { Suspense } from "react";

import { Logo } from "@/components/shared/logo";
import { FlashToaster } from "@/components/feedback/flash-toaster";
import { AmbientBackground } from "@/components/layout/ambient-background";
import { siteConfig } from "@/config/site";

/**
 * Layout for autentificeringssiderne (login, opret konto, glemt/nulstil kodeord).
 * Et roligt, centreret kort på en blød, glødende baggrund – som logoet.
 * Ingen sidebar eller topbar her: brugeren er endnu ikke "inde" i appen.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4 py-10">
      <AmbientBackground />
      {/* Diskret blåt skær i baggrunden */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(700px 400px at 50% -10%, var(--glow), transparent 60%)",
        }}
      />

      <div className="w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center text-center">
          <Logo size={100} className="mb-4" />
          <h1 className="text-2xl font-semibold tracking-tight">
            {siteConfig.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Dit personlige AI-styresystem
          </p>
        </div>

        {children}
      </div>

      <Suspense fallback={null}>
        <FlashToaster />
      </Suspense>
    </div>
  );
}
