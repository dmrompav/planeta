export type Country = {
  cca2: string;
  cca3: string;
  name: { common: string; official: string };
  region: string;
  subregion?: string;
  capital?: string[];
  population: number;
  area?: number;
  latlng: [number, number];
  flags?: { png?: string; svg?: string; alt?: string };
  timezones?: string[];
  tld?: string[];
  languages?: Record<string, string>;
  currencies?: Record<string, { name: string; symbol?: string }>;
};

export type CountryShort = Pick<
  Country,
  | 'cca2'
  | 'cca3'
  | 'name'
  | 'region'
  | 'subregion'
  | 'population'
  | 'latlng'
  | 'flags'
  | 'area'
>;
