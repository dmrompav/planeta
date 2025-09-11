import { useMemo, useState } from 'react';
import type { CountryShort } from '@/entities/country/model/types';
import { useCountriesQuery } from '@/entities/country/hooks/queries';

function formatNum(n?: number) {
  return typeof n === 'number' ? n.toLocaleString('en-US') : '-';
}

/**
 * Page with a globe
 * The only one for now
 */
export const GlobePage = () => {
  const { data, isPending, isError, error } = useCountriesQuery();
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((c) => c.name.common.toLowerCase().includes(s));
  }, [data, q]);

  if (isPending) return <div className="p-4">Загрузка стран…</div>;
  if (isError)
    return <div className="p-4 text-red-600">Ошибка: {String(error)}</div>;

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-semibold">Страны: {filtered.length}</h1>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск по имени…"
        className="border px-3 py-2 rounded w-full max-w-md"
      />
      <CountriesTable items={filtered.slice(0, 50)} />
      <p className="text-sm text-gray-500">
        Показаны первые 50. Всего загружено: {data?.length ?? 0}.
      </p>
    </div>
  );
};

export function CountriesTable({ items }: { items: CountryShort[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-[600px] w-full border-collapse">
        <thead>
          <tr className="text-left border-b">
            <th className="py-2 pr-4">Флаг</th>
            <th className="py-2 pr-4">Название</th>
            <th className="py-2 pr-4">Регион</th>
            <th className="py-2 pr-4">Население</th>
            <th className="py-2 pr-4">Площадь</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c) => (
            <tr key={c.cca3} className="border-b">
              <td className="py-2 pr-4">
                {c.flags?.png ? (
                  <img
                    src={c.flags.png}
                    alt={c.flags.alt ?? c.name.common}
                    width={28}
                    height={20}
                  />
                ) : (
                  '—'
                )}
              </td>
              <td className="py-2 pr-4">{c.name.common}</td>
              <td className="py-2 pr-4">
                {c.region}
                {c.subregion ? ` · ${c.subregion}` : ''}
              </td>
              <td className="py-2 pr-4">{formatNum(c.population)}</td>
              <td className="py-2 pr-4">{formatNum(c.area)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
