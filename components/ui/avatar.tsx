"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Avatar – viser et brugerbillede. Hvis billedet mangler eller ikke kan loades,
 * vises i stedet en pæn fallback med brugerens initialer på en branded baggrund.
 *
 * Læg dit foto i: lifeos/public/lasse.jpg  (så bruges det automatisk).
 */
export function Avatar({
  src,
  alt,
  fallback,
  className,
}: {
  src?: string;
  alt: string;
  fallback: string;
  className?: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  // Hvis billedet allerede er fejlet inden React nåede at lytte (sker ved
  // server-rendering), opdager vi det her ved mount og viser fallback.
  React.useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) {
      setFailed(true);
    }
  }, []);

  const showImage = src && !failed;

  return (
    <span
      className={cn(
        "relative inline-flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-sm font-semibold text-primary ring-1 ring-border/60",
        className,
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden>{fallback}</span>
      )}
    </span>
  );
}
