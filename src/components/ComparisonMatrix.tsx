// The de-constructed full-body-checkup comparison: package cards + a
// like-to-like panel coverage matrix. Server-rendered first (crawlers and
// JS-off users see the full table); hydration adds filtering and sorting.
import { useMemo, useState } from 'preact/hooks';

export interface MatrixPkg {
  id: string;
  providerName: string;
  providerSlug: string;
  pkgName: string;
  total: number;
  mrp: number;
  couponCode: string | null;
  claimed: number;
  verified: number;
  perParam: number;
  tat: number;
  consult: boolean;
  smart: boolean;
  nabl: boolean;
  freeCollection: boolean;
  rating: { rating: number; count: number; source: string } | null;
  bookUrl: string;
  city: string;
}

export interface MatrixRow {
  name: string;
  params: number;
  included: boolean[];
}

interface Props {
  pkgs: MatrixPkg[];
  rows: MatrixRow[];
}

const inr = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;

function track(event: string, extra: Record<string, unknown> = {}) {
  const w = window as unknown as { dataLayer?: Array<Record<string, unknown>> };
  w.dataLayer = w.dataLayer || [];
  w.dataLayer.push({ event, ...extra });
}

export default function ComparisonMatrix({ pkgs, rows }: Props) {
  const [free, setFree] = useState(false);
  const [fast, setFast] = useState(false);
  const [nabl, setNabl] = useState(false);
  const [consult, setConsult] = useState(false);
  const [sort, setSort] = useState<'total' | 'coverage' | 'perParam'>('total');

  const visible = useMemo(() => {
    const idx = pkgs
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => (!free || p.freeCollection) && (!fast || p.tat <= 24))
      .filter(({ p }) => (!nabl || p.nabl) && (!consult || p.consult));
    idx.sort((a, b) =>
      sort === 'total'
        ? a.p.total - b.p.total
        : sort === 'coverage'
          ? b.p.verified - a.p.verified
          : a.p.perParam - b.p.perParam,
    );
    return idx;
  }, [pkgs, free, fast, nabl, consult, sort]);

  const toggle = (name: string, value: boolean, set: (v: boolean) => void) => {
    set(!value);
    track('filter_use', { filter: name, on: !value });
  };

  const filters: Array<[string, boolean, (v: boolean) => void]> = [
    ['Free home collection', free, setFree],
    ['Report within 24 hrs', fast, setFast],
    ['NABL labs only', nabl, setNabl],
    ['Doctor consult included', consult, setConsult],
  ];

  return (
    <div>
      <div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
        {filters.map(([label, value, set]) => (
          <label
            key={label}
            class={`chip cursor-pointer border ${value ? 'border-navy bg-navy-100 text-navy' : 'border-line bg-white text-ink-soft'}`}
          >
            <input
              type="checkbox"
              class="sr-only"
              checked={value}
              onChange={() => toggle(label, value, set)}
            />
            {label}
          </label>
        ))}
        <label class="ml-auto flex items-center gap-1 text-ink-soft">
          Sort:
          <select
            class="rounded border border-line bg-white px-1 py-0.5"
            value={sort}
            onChange={(e) => setSort((e.target as HTMLSelectElement).value as typeof sort)}
          >
            <option value="total">Lowest total price</option>
            <option value="coverage">Most parameters</option>
            <option value="perParam">Best ₹ per parameter</option>
          </select>
        </label>
      </div>

      {visible.length === 0 && (
        <p class="card text-ink-soft">
          No package matches all those filters. Loosen one and options reappear.
        </p>
      )}

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(({ p }, pos) => (
          <div key={p.id} class="card flex flex-col gap-1">
            <div class="text-xs font-semibold uppercase tracking-wide text-ink-soft">
              {p.providerName}
            </div>
            <div class="font-heading font-bold text-navy">{p.pkgName}</div>
            <div>
              <span class="num text-2xl font-extrabold text-amber-700">{inr(p.total)}</span>
              {p.mrp > p.total && (
                <span class="num ml-2 text-xs text-ink-soft line-through">{inr(p.mrp)}</span>
              )}
              {p.couponCode && <span class="chip-amber ml-2">Code {p.couponCode}</span>}
            </div>
            <div class="num text-sm text-ink-soft">
              {p.verified} parameters verified (lab claims {p.claimed}) ·{' '}
              {inr(p.perParam)}/parameter
            </div>
            <div class="flex flex-wrap gap-1 py-1">
              {pos === 0 && sort === 'total' && <span class="chip-good">Cheapest</span>}
              {p.nabl && <span class="chip-trust">NABL</span>}
              {p.consult && <span class="chip-muted">Free doctor consult</span>}
              {p.smart && <span class="chip-muted">Smart report</span>}
              {p.freeCollection && <span class="chip-muted">Free home visit</span>}
            </div>
            <div class="text-sm text-ink-soft">
              Report in {p.tat <= 24 ? `${p.tat} hrs` : `${Math.round(p.tat / 24)} days`}
              {p.rating && (
                <span title={`Ratings from ${p.rating.source}`}>
                  {' '}· ★ {p.rating.rating.toFixed(1)} via {p.rating.source}
                </span>
              )}
            </div>
            <a
              href={p.bookUrl}
              rel="nofollow noopener"
              target="_blank"
              class="btn-primary mt-auto text-center"
              data-outbound
              data-provider={p.providerSlug}
              data-city={p.city}
              data-position={String(pos + 1)}
            >
              Book on lab site
            </a>
          </div>
        ))}
      </div>

      {visible.length > 0 && (
        <div class="table-wrap mt-6">
          <table class="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr class="border-b border-line bg-navy-100 text-left text-navy">
                <th class="sticky left-0 bg-navy-100 p-3">What's covered</th>
                {visible.map(({ p }) => (
                  <th key={p.id} class="p-3 font-semibold">
                    {p.providerName}
                    <span class="block text-xs font-normal text-ink-soft">{p.pkgName}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name} class="border-b border-line last:border-0">
                  <th scope="row" class="sticky left-0 bg-white p-3 text-left font-medium">
                    {row.name}
                    <span class="num block text-xs font-normal text-ink-soft">
                      {row.params} parameters
                    </span>
                  </th>
                  {visible.map(({ p, i }) => (
                    <td key={p.id} class="p-3">
                      {row.included[i] ? (
                        <span class="font-bold text-good">✓</span>
                      ) : (
                        <span class="text-ink-soft">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p class="mt-3 text-xs text-ink-soft">
        Verified counts come from de-constructing each package into standard
        panels. Labs count sub-parameters differently, so a lab's claimed number
        and our verified number can differ — both are shown.
      </p>
    </div>
  );
}
