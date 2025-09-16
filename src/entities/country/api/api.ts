import type { Country, CountryShort } from '../model/types';
import { restCountries } from './getCountries';

const FIELDS =
  'name,cca2,flags,region,subregion,population,capital,area,languages';

export const fetchAllCountries = () =>
  restCountries.all<CountryShort[]>(FIELDS);
export const fetchCountryByCca2 = (cca2: string) =>
  restCountries.byAlpha2<Country>(cca2, FIELDS);
export const searchCountriesByName = (q: string) =>
  restCountries.byName<CountryShort[]>(q, FIELDS);
