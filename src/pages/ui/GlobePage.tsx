// GlobePage.tsx
import { useEffect, useState } from 'react';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from '@/shared/ui/_shadcn/sidebar';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import { AppSidebar } from '@/widgets/AppSidebar/AppSidebar';
import { CountryOverlay } from '@/widgets/CountryOverlay/CountryOverlay';
import { Globe3D } from '@/widgets/Globe3D/Globe3D';
import { useSelectedCountry } from '@/entities/country/model/store';
import { ThemeToggle } from '@/shared/ui/_shadcn/theme-toggle';

export const GlobePage = () => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const { selectedCca2, setSelected } = useSelectedCountry();

  const _setOpen = (val: boolean) => {
    console.log('Sidebar open state changed:', val);
    setOpen(val);
  };

  useEffect(() => {
    console.log('isMobile changed:', isMobile);
    setOpen(!isMobile);
  }, [isMobile]);

  return (
    <SidebarProvider
      open={open}
      onOpenChange={_setOpen}
      defaultOpen={!isMobile}
      style={
        {
          '--sidebar-width': '16rem',
          '--sidebar-width-mobile': '18rem',
        } as React.CSSProperties
      }
    >
      <AppSidebar />
      <SidebarInset className="overflow-hidden relative">
        <header className="top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center justify-between gap-2 p-2">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="mr-1" />
              <div className="font-semibold">PlanetA</div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Контейнер для canvas и overlay */}
        <div className="flex-1 relative !m-0 h-[100dvh]">
          <Globe3D
            className="absolute inset-0 w-full h-full bg-background"
            selectedCca2={selectedCca2}
            setSelectedCca2={setSelected}
          />
          <CountryOverlay />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
