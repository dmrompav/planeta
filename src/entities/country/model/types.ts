export type Country = {
  name: { common: string; official: string };
  cca2: string;
  flags?: { png: string; svg: string };

  // Additional fields can be added as needed
  region?: string;
  subregion?: string;
  population?: number;
  capital?: string[];
  area?: number;
  languages?: Record<string, string>;
};

export type CountryShort = Pick<Country, 'name' | 'cca2' | 'flags'>;
