import { useQuery, QueryClient } from '@tanstack/react-query';
import { fetchAllCountries, fetchCountryByCca2 } from '../api/api';
import type { Country, CountryShort } from '../model/types';

/**
 * Query keys for country-related queries.
 * These help in uniquely identifying each query.
 */
export const qk = {
  countries: ['countries'] as const,
  country: (cca2: string) => ['country', cca2] as const,
};

/**
 * Prefetch the list of countries and store it in the query client.
 */
export async function prefetchCountries(qc: QueryClient) {
  // Use fetchQuery which will return cached data or dedupe an ongoing fetch.
  // This avoids firing multiple identical network requests during mounting
  // (e.g. StrictMode double render in development).
  await qc.fetchQuery({
    queryKey: qk.countries,
    queryFn: fetchAllCountries,
  });
}

/**
 * Hook to get the list of all countries.
 */
export function useCountriesQuery() {
  return useQuery<CountryShort[]>({
    queryKey: qk.countries,
    queryFn: fetchAllCountries,
    // keep previous data while a background refetch may occur
    placeholderData: undefined,
  });
}

/**
 * Hook to get a country by its cca2 code.
 */
export function useCountryByCca2(cca2: string) {
  return useQuery<Country>({
    queryKey: qk.country(cca2),
    queryFn: () => fetchCountryByCca2(cca2),
    enabled: Boolean(cca2),
  });
}
