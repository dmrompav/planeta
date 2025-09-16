import { useCountryByCca2 } from '@/entities/country/hooks/queries';
import { useSelectedCountry } from '@/entities/country/model/store';

export const CountryOverlay = () => {
  const { selectedCca2, setSelected } = useSelectedCountry();
  const { data, isPending, isError, error } = useCountryByCca2(
    selectedCca2 || ''
  );

  if (!selectedCca2) return null;

  return (
    <>
      <div className="absolute z-10 bg-black/5"></div>
      <div className="absolute top-0 left-0 w-full h-full rounded-lg p-6 bg-background/85 text-foreground shadow-lg">
        {isPending && (
          <div className="text-sm text-muted-foreground">Загрузка…</div>
        )}
        {isError && (
          <div className="text-sm text-red-500">Ошибка: {String(error)}</div>
        )}
        {data && (
          <>
            <div className="flex items-center gap-3 mb-3">
              {data.flags?.png && (
                <img
                  src={data.flags.png}
                  alt=""
                  className="h-5 w-8 object-cover"
                />
              )}
              <h2 className="text-xl font-semibold">{data.name.common}</h2>
            </div>
            <ul className="text-sm space-y-1">
              <li>
                Region: {data.region}
                {data.subregion ? ` · ${data.subregion}` : ''}
              </li>
              {data.capital?.length ? (
                <li>Capital: {data.capital.join(', ')}</li>
              ) : null}
              <li>Population: {data.population?.toLocaleString('en-US')}</li>
              {data.area ? (
                <li>Area: {data.area.toLocaleString('en-US')} km²</li>
              ) : null}
              {data.languages ? (
                <li>Languages: {Object.values(data.languages).join(', ')}</li>
              ) : null}
            </ul>
          </>
        )}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setSelected(null)}
            className="rounded bg-primary px-3 py-1 text-sm"
          >
            Got it!
          </button>
        </div>
      </div>
    </>
  );
};
