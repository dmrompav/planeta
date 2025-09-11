const BASE = 'https://restcountries.com/v3.1';

export type HttpError = { status: number; message: string };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...init?.headers } });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw {
      status: res.status,
      message: text || res.statusText,
    } satisfies HttpError;
  }
  return res.json() as Promise<T>;
}

export const restCountries = {
  all: <T = unknown>(fields?: string) =>
    request<T>(`${BASE}/all${fields ? `?fields=${fields}` : ''}`),
  byAlpha2: <T = unknown>(code: string, fields?: string) =>
    request<T>(
      `${BASE}/alpha/${encodeURIComponent(code)}${
        fields ? `?fields=${fields}` : ''
      }`
    ),
  byName: <T = unknown>(name: string, fields?: string) =>
    request<T>(
      `${BASE}/name/${encodeURIComponent(name)}${
        fields ? `?fields=${fields}` : ''
      }`
    ),
};
