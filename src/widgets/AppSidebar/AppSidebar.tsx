import { useCountriesQuery } from '@/entities/country/hooks/queries';
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
  const [q, setQ] = useState('');

  const { selectedCca2, setSelected } = useSelectedCountry();

  const { setOpenMobile } = useSidebar();
  const isMobile = useIsMobile();

  const filtered = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    let arr = data;

    if (s) {
      arr = arr.filter((c) => c.name.common.toLowerCase().includes(s));
    }

    return [...arr].sort((a, b) =>
      a.name.common.localeCompare(b.name.common, 'en', { sensitivity: 'base' })
    );
  }, [data, q]);

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
        {isPending && (
          <div className="p-2 text-sm text-muted-foreground">Загрузка…</div>
        )}
        {isError && (
          <div className="p-2 text-sm text-red-500">Ошибка загрузки</div>
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
