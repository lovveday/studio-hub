"use client";

import { useRef } from "react";
import { ChevronDown } from "lucide-react";
import { switchBrandAction } from "@/app/actions/brand";

export function BrandSwitcher({
  brands,
  activeId,
  next,
}: {
  brands: Array<{ id: string; name: string; color: string }>;
  activeId: string;
  next: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const active = brands.find((brand) => brand.id === activeId);

  return (
    <form ref={formRef} action={switchBrandAction} className="relative">
      <input type="hidden" name="next" value={next} />
      <span
        className="pointer-events-none absolute left-3 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
        style={{ backgroundColor: active?.color ?? "#FF5A36" }}
      />
      <select
        name="brandId"
        defaultValue={activeId}
        onChange={() => formRef.current?.requestSubmit()}
        className="h-9 w-[180px] appearance-none rounded-xl border border-line bg-white pl-8 pr-8 text-xs font-semibold text-ink shadow-sm focus:outline-none focus:ring-2 focus:ring-coral/20"
        aria-label="Switch brand"
      >
        {brands.map((brand) => (
          <option key={brand.id} value={brand.id}>
            {brand.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
    </form>
  );
}
