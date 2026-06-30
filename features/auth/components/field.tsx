import { Label } from "@/components/ui/label";

/**
 * Field – samler etiket, inputfelt og en evt. fejlbesked under feltet.
 * Bruges af alle autentificeringsformularer for et ensartet udseende.
 */
export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error?.[0] && (
        <p className="text-xs font-medium text-destructive">{error[0]}</p>
      )}
    </div>
  );
}
