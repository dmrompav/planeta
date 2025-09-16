import { prefetchCountries } from '@/entities/country/hooks/queries';
import type { QueryClient } from '@tanstack/react-query';

export async function preloadApp(qc: QueryClient) {
  await prefetchCountries(qc);
}
