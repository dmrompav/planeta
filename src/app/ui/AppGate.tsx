import { Suspense, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { preloadApp } from '../utils/preload';

export default function AppGate({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    preloadApp(qc)
      .then(() => alive && setReady(true))
      .catch((e) => alive && setErr(e));
    return () => {
      alive = false;
    };
  }, [qc]);

  if (err)
    return (
      <div className="p-4 text-red-600">Ошибка загрузки: {String(err)}</div>
    );
  if (!ready) return <Splash />;

  return <Suspense fallback={<Splash />}>{children}</Suspense>;
}

function Splash() {
  return (
    <div style={{ minHeight: '100dvh' }} className="grid place-items-center">
      <div>Загрузка…</div>
    </div>
  );
}
