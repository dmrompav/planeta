import { GlobePage } from '@/pages/ui/GlobePage';
import { QueryProvider } from './providers/QueryProvider';
import AppGate from './ui/AppGate';
import { ThemeProvider } from '@/shared/ui/_shadcn/theme-provider';
import { Id, toast, ToastContainer } from 'react-toastify';
import { useEffect, useRef } from 'react';

export const App = () => {
  const notify = (message: string) => toast(message);
  const ref1 = useRef<Id | null>(null);
  const ref2 = useRef<Id | null>(null);

  useEffect(() => {
    setTimeout(() => {
      if (!ref1.current) {
        ref1.current = notify(
          'Даже у Бога было 7 дней, у меня — всего 2 вечера 😅'
        );
      }
    }, 4000);

    setTimeout(() => {
      if (!ref2.current) {
        ref2.current = notify('Даже настоящая Земля слегка забагована 🌍✨');
      }
    }, 7000);
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="planet-theme">
      <div>
        <QueryProvider>
          <AppGate>
            <GlobePage />
          </AppGate>
        </QueryProvider>
        <ToastContainer />
      </div>
    </ThemeProvider>
  );
};
