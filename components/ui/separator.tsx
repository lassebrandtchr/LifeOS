import { cn } from "@/lib/utils";

/**
 * Separator – en tynd, diskret linje til at adskille sektioner.
 * Holdt enkel (uden ekstra afhængigheder) i Fase 2.
 */
function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        "bg-border",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
