import { useCountriesQuery } from '@/entities/country/hooks/queries';
import type { Country } from '@/entities/country/model/types';
import { useSelectedCountry } from '@/entities/country/model/store';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
  useSidebar,
} from '@/shared/ui/_shadcn/sidebar';
import { X } from 'lucide-react';

import { useState, useMemo } from 'react';

export const AppSidebar = () => {
  const { data, isPending, isError } = useCountriesQuery();
  const list = useMemo(() => (data ?? []) as Country[], [data]);
  const [q, setQ] = useState('');
  const [region, setRegion] = useState<string>('');
  const [subregion, setSubregion] = useState<string>('');
  const [popMin, setPopMin] = useState<string>('');
  const [popMax, setPopMax] = useState<string>('');
  const [areaMin, setAreaMin] = useState<string>('');
  const [areaMax, setAreaMax] = useState<string>('');

  const { selectedCca2, setSelected } = useSelectedCountry();

  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    if (!list) return [] as Country[];
    const s = q.trim().toLowerCase();
    let arr = list;

    // text search
    if (s) arr = arr.filter((c) => c.name.common.toLowerCase().includes(s));

    // region filter
    if (region) arr = arr.filter((c) => (c.region ?? '') === region);

    // subregion filter
    if (subregion) arr = arr.filter((c) => (c.subregion ?? '') === subregion);

    // numeric filters: population
    const pMin = Number(popMin || NaN);
    const pMax = Number(popMax || NaN);
    if (!Number.isNaN(pMin))
      arr = arr.filter((c) =>
        typeof c.population === 'number' ? c.population >= pMin : false
      );
    if (!Number.isNaN(pMax))
      arr = arr.filter((c) =>
        typeof c.population === 'number' ? c.population <= pMax : false
      );

    // numeric filters: area
    const aMin = Number(areaMin || NaN);
    const aMax = Number(areaMax || NaN);
    if (!Number.isNaN(aMin))
      arr = arr.filter((c) =>
        typeof c.area === 'number' ? c.area >= aMin : false
      );
    if (!Number.isNaN(aMax))
      arr = arr.filter((c) =>
        typeof c.area === 'number' ? c.area <= aMax : false
      );

    return [...arr].sort((a, b) =>
      a.name.common.localeCompare(b.name.common, 'en', { sensitivity: 'base' })
    );
  }, [list, q, region, subregion, popMin, popMax, areaMin, areaMax]);

  // unique regions and subregions for selects
  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const c of list) if (c.region) set.add(c.region);
    return [...set].sort();
  }, [list]);

  const subregions = useMemo(() => {
    const set = new Set<string>();
    for (const c of list) {
      if (region) {
        if (c.region === region && c.subregion) set.add(c.subregion as string);
      } else if (c.subregion) set.add(c.subregion as string);
    }
    return [...set].sort();
  }, [list, region]);

  const resetFilters = () => {
    setQ('');
    setRegion('');
    setSubregion('');
    setPopMin('');
    setPopMax('');
    setAreaMin('');
    setAreaMax('');
  };

  const handleSelect = (cca2: string) => {
    setSelected(cca2);
    if (isMobile) {
      setOpenMobile(false);
      console.log('Closing sidebar on mobile after selection');
    }
  };

  return (
    <Sidebar variant="inset" collapsible="offcanvas">
      <SidebarHeader>
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border bg-background px-2 py-1 text-sm focus:outline-none focus:ring"
          />
          <SidebarTrigger className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted md:hidden">
            <X className="h-4 w-4" />
          </SidebarTrigger>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        <div className="p-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              value={popMin}
              onChange={(e) => setPopMin(e.target.value)}
              placeholder="Pop min"
              className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            />
            <input
              type="number"
              min={0}
              value={popMax}
              onChange={(e) => setPopMax(e.target.value)}
              placeholder="Pop max"
              className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min={0}
              value={areaMin}
              onChange={(e) => setAreaMin(e.target.value)}
              placeholder="Area min"
              className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            />
            <input
              type="number"
              min={0}
              value={areaMax}
              onChange={(e) => setAreaMax(e.target.value)}
              placeholder="Area max"
              className="w-full rounded-md border bg-background px-2 py-1 text-sm"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={resetFilters}
              className="rounded-md px-2 py-1 text-sm hover:bg-muted"
            >
              Reset
            </button>
            <div className="text-xs text-muted-foreground">
              {filtered.length} items
            </div>
          </div>
        </div>
        {isPending && (
          <div className="p-2 text-sm text-muted-foreground">Loading...</div>
        )}
        {isError && (
          <div className="p-2 text-sm text-red-500">Loading error</div>
        )}

        <ul className="divide-y text-sm">
          {filtered.map((c) => (
            <li
              key={c.cca2}
              onClick={() => handleSelect(c.cca2)}
              className={`px-2 py-1 cursor-pointer hover:bg-muted ${
                selectedCca2 === c.cca2
                  ? 'bg-[var(--color-card-foreground)] hover:!bg-[var(--color-muted-foreground)] text-[var(--color-card)]'
                  : ''
              }`}
            >
              {c.flags?.png && (
                <img
                  src={c.flags.png}
                  alt={c.name.common}
                  className="mr-2 inline-block h-4 w-6 object-cover"
                />
              )}
              {c.name.common}
            </li>
          ))}
        </ul>
      </SidebarContent>

      <SidebarFooter />
    </Sidebar>
  );
};
