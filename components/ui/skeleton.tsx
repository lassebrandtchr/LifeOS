import { cn } from "@/lib/utils";

/**
 * Skeleton – blød "loading"-flade, der pulserer mens data hentes.
 * Bruges senere på dashboard-kort, der venter på rigtige data.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

export { Skeleton };
