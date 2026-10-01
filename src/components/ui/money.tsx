import { formatCurrency } from "@/lib/utils";

/** Currency text that the privacy eye can hide. */
export function Money({ value, className = "" }: { value: number | string | null | undefined; className?: string }) {
  return <span className={`money ${className}`}>{formatCurrency(value)}</span>;
}
