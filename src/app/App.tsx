import { GlobePage } from '@/pages/ui/GlobePage';
import { QueryProvider } from './providers/QueryProvider';
import AppGate from './ui/AppGate';

export const App = () => {
  return (
    <div>
      <QueryProvider>
        <AppGate>
          <GlobePage />
        </AppGate>
      </QueryProvider>
    </div>
  );
};
