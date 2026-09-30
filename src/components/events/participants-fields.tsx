"use client";

import { useState } from "react";
import { Field, Input, Select } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { extrasFor, type PackagePricing } from "@/lib/pricing";

/**
 * Package + adults/children inputs. Selecting a package fills the included counts;
 * anything above shows as "extra" with the package's per-person price.
 */
export function ParticipantsFields({ packages, initialPackageId, initialAdults, initialChildren, errors }: {
  packages: PackagePricing[];
  initialPackageId: string;
  initialAdults: number | null;
  initialChildren: number | null;
  errors: Record<string, string>;
}) {
  const initialPkg = packages.find((p) => p.id === initialPackageId) ?? null;
  const [packageId, setPackageId] = useState(initialPackageId);
  const [adults, setAdults] = useState<string>(initialAdults != null ? String(initialAdults) : initialPkg ? String(initialPkg.included_adults) : "");
  const [children, setChildren] = useState<string>(initialChildren != null ? String(initialChildren) : initialPkg ? String(initialPkg.included_children) : "");
  const pkg = packages.find((p) => p.id === packageId) ?? null;
  const { extraAdults, extraChildren } = extrasFor(pkg, Number(adults || 0), Number(children || 0));
  const extraTotal = pkg ? extraAdults * Number(pkg.extra_adult_price) + extraChildren * Number(pkg.extra_child_price) : 0;

  function choosePackage(id: string) {
    setPackageId(id);
    const p = packages.find((x) => x.id === id);
    if (p) { setAdults(String(p.included_adults)); setChildren(String(p.included_children)); }
  }

  return (
    <div className="space-y-4">
      <Field label="Pacote" htmlFor="package_id" hint={pkg ? `Inclui ${pkg.included_adults} adultos e ${pkg.included_children} crianças por ${formatCurrency(pkg.base_price)}.` : "Sem pacote = personalizado; o orçamento parte do zero."}>
        <Select id="package_id" name="package_id" value={packageId} onChange={(e) => choosePackage(e.target.value)}>
          <option value="">Sem pacote (personalizado)</option>
          {packages.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatCurrency(p.base_price)}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Adultos" htmlFor="adults" error={errors.adults}>
          <Input id="adults" name="adults" type="number" inputMode="numeric" min={0} value={adults} onChange={(e) => setAdults(e.target.value)} />
        </Field>
        <Field label="Crianças" htmlFor="children" error={errors.children}>
          <Input id="children" name="children" type="number" inputMode="numeric" min={0} value={children} onChange={(e) => setChildren(e.target.value)} />
        </Field>
      </div>
      {pkg && (extraAdults > 0 || extraChildren > 0) ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-sm">
          <p className="font-medium text-amber-900">Extras além do pacote</p>
          <p className="text-amber-800">
            {extraAdults > 0 ? `${extraAdults} adulto(s) × ${formatCurrency(pkg.extra_adult_price)}` : null}
            {extraAdults > 0 && extraChildren > 0 ? " · " : null}
            {extraChildren > 0 ? `${extraChildren} criança(s) × ${formatCurrency(pkg.extra_child_price)}` : null}
            {" = "}<b>{formatCurrency(extraTotal)}</b>
          </p>
        </div>
      ) : null}
      {pkg ? <p className="text-sm text-muted">Estimativa: <b className="text-foreground">{formatCurrency(Number(pkg.base_price) + extraTotal)}</b> (sem adicionais)</p> : null}
    </div>
  );
}
