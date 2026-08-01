// The de-constructed full-body-checkup comparison. Server-rendered first, so
// crawlers and JS-off users get the whole table; hydration adds filtering and
// sorting.
//
// The coverage matrix splits panels into "identical across every package" and
// "where they differ". Everything a buyer is actually choosing between lives
// in the second group, and burying that inside forty identical ticks is how
// these comparisons normally fail.
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
  /** Parameters of this panel each package actually covers. */
  covered: number[];
}

interface Props {
  pkgs: MatrixPkg[];
  rows: MatrixRow[];
}

const inr = (n: number) => `₹${new Intl.NumberFormat('en-IN').format(Math.round(n))}`;
const inr1 = (n: number) => `₹${n.toFixed(1)}`;

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

  // A panel is "shared" only when every visible package covers it to the same
  // depth. Two packages both ticking "Liver Function" while one carries 5 of
  // 11 markers is exactly the difference a buyer needs to see.
  const { shared, differing } = useMemo(() => {
    const cols = visible.map(({ i }) => i);
    const shared: MatrixRow[] = [];
    const differing: MatrixRow[] = [];
    for (const row of rows) {
      const counts = cols.map((i) => row.covered[i] ?? 0);
      const full = counts.every((n) => n === row.params);
      if (cols.length > 1 && full) shared.push(row);
      else if (counts.some((n) => n > 0)) differing.push(row);
    }
    return { shared, differing };
  }, [rows, visible]);

  const cheapestPerParam = visible.length
    ? visible.reduce((a, b) => (a.p.perParam <= b.p.perParam ? a : b)).p
    : null;

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
      <div class="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-line bg-white p-3 text-sm">
        <span class="mr-1 text-[11px] font-bold uppercase tracking-wider text-ink-soft">Filter</span>
        {filters.map(([label, value, set]) => (
          <label
            key={label}
            class={`cursor-pointer rounded-full border px-3 py-1.5 text-[12.5px] font-semibold ${
              value
                ? 'border-navy bg-navy text-white'
                : 'border-line bg-paper text-ink hover:border-navy'
            }`}
          >
            <input
              type="checkbox"
              class="sr-only"
              checked={value}
              onChange={() => toggle(label, value, set)}
            />
            {value ? '✓ ' : ''}
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
          <article
            key={p.id}
            class={`flex flex-col gap-2.5 rounded-xl bg-white p-4 ${
              pos === 0 && sort === 'total' ? 'border-[1.5px] border-good' : 'border border-line'
            }`}
          >
            <div>
              <div class="mb-1.5 flex flex-wrap gap-1.5">
                {pos === 0 && sort === 'total' && <span class="badge-cheapest">CHEAPEST</span>}
                {cheapestPerParam?.id === p.id && <span class="badge-neutral">BEST VALUE</span>}
              </div>
              <div class="font-heading text-base font-extrabold tracking-tight text-ink">
                {p.pkgName}
              </div>
              <div class="text-[12.5px] text-ink-soft">
                {p.providerName}
                {p.rating && (
                  <span title={`Ratings from ${p.rating.source}`}>
                    {' '}
                    · {p.rating.rating.toFixed(1)} ★ from {p.rating.source}
                  </span>
                )}
              </div>
            </div>

            <div class="flex items-baseline gap-2">
              <span class="num font-heading text-[26px] font-extrabold tracking-tight text-navy">
                {inr(p.total)}
              </span>
              {p.mrp > p.total && (
                <span class="num text-[13px] text-gray-500 line-through">{inr(p.mrp)}</span>
              )}
            </div>

            {/* Claimed against verified, side by side. The gap is the point. */}
            <div class="grid grid-cols-2 gap-2 rounded-lg bg-paper p-2.5">
              <div>
                <div class="text-[11px] text-ink-soft">Lab claims</div>
                <div class="num font-heading text-base font-bold text-gray-500 line-through">
                  {p.claimed}
                </div>
              </div>
              <div>
                <div class="text-[11px] text-ink-soft">Verified by us</div>
                <div class="num font-heading text-base font-extrabold text-ink">{p.verified}</div>
              </div>
            </div>

            <div class="flex items-baseline justify-between gap-2 rounded-lg bg-amber-100 px-2.5 py-2">
              <span class="text-xs font-semibold text-amber-700">Price per parameter</span>
              <span class="num font-heading text-[15px] font-extrabold text-amber-700">
                {inr1(p.perParam)}
              </span>
            </div>

            <div class="flex flex-col gap-1 text-[12.5px] text-ink-soft">
              <div>
                Report in{' '}
                <strong class="font-semibold text-ink">
                  {p.tat <= 24 ? `${p.tat} hours` : `${Math.round(p.tat / 24)} days`}
                </strong>
                {p.nabl && ' · NABL'}
              </div>
              <div>
                {[
                  p.freeCollection && 'Free home collection',
                  p.consult && 'Free doctor consult',
                  p.smart && 'Smart report',
                ]
                  .filter(Boolean)
                  .join(' · ') || 'Standard report'}
              </div>
            </div>

            <a
              href={p.bookUrl}
              rel="nofollow noopener"
              target="_blank"
              class={`mt-auto w-full ${
                pos === 0 && sort === 'total' ? 'btn-primary' : 'btn-secondary'
              }`}
              data-outbound
              data-provider={p.providerSlug}
              data-city={p.city}
              data-position={String(pos + 1)}
            >
              Book on {p.providerName} ↗
            </a>
          </article>
        ))}
      </div>

      {visible.length > 0 && (
        <section class="mt-6">
          <h2 class="mb-1 font-heading text-xl font-extrabold tracking-tight text-navy">
            Parameter coverage
          </h2>
          <p class="mb-2.5 max-w-[70ch] text-[13px] text-ink-soft">
            Panels that every package covers in full are collapsed. Below them is
            where the packages actually differ. Labs group their panels differently
            to us, so a package often carries part of one: "5 of 11" means five of
            that panel's eleven parameters are in the report.
          </p>

          <div class="overflow-hidden rounded-xl border border-line bg-white">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[520px] border-collapse text-sm">
                <thead>
                  <tr class="border-b border-line bg-paper text-left">
                    <th class="p-3 text-[11px] font-bold uppercase tracking-wider text-ink-soft">
                      Panel
                    </th>
                    {visible.map(({ p }) => (
                      <th
                        key={p.id}
                        class="w-[86px] p-3 text-center text-[11.5px] font-bold leading-tight text-ink"
                      >
                        {p.providerName}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shared.length > 0 && (
                    <tr class="border-b border-line-soft">
                      <td colSpan={visible.length + 1} class="p-3">
                        <details onToggle={() => track('compare_expand', { section: 'shared_panels' })}>
                          <summary class="cursor-pointer text-[13px] font-semibold text-ink">
                            {shared.length} panel{shared.length === 1 ? '' : 's'} identical in all{' '}
                            {visible.length} packages
                            <span class="ml-1 font-normal text-ink-soft">
                              ({shared.reduce((s, r) => s + r.params, 0)} parameters)
                            </span>
                          </summary>
                          <ul class="mt-2 space-y-1 pl-4 text-[13px] text-ink-soft">
                            {shared.map((r) => (
                              <li key={r.name}>
                                {r.name}{' '}
                                <span class="num">
                                  · {r.params} param{r.params === 1 ? '' : 's'}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </td>
                    </tr>
                  )}

                  {differing.length > 0 && (
                    <tr class="border-y border-line bg-paper">
                      <td
                        colSpan={visible.length + 1}
                        class="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-amber-700"
                      >
                        Where they differ
                      </td>
                    </tr>
                  )}

                  {differing.map((row) => (
                    <tr key={row.name} class="border-b border-line-soft last:border-0">
                      <th scope="row" class="p-3 text-left font-medium">
                        {row.name}
                        <span class="num block text-xs font-normal text-ink-soft">
                          {row.params} {row.params === 1 ? 'parameter' : 'parameters'}
                        </span>
                      </th>
                      {visible.map(({ p, i }) => {
                        const n = row.covered[i] ?? 0;
                        if (n === 0) {
                          return (
                            <td key={p.id} class="p-3 text-center text-[12px] text-gray-500">
                              not included
                            </td>
                          );
                        }
                        if (n === row.params) {
                          return (
                            <td key={p.id} class="p-3 text-center">
                              <span class="font-bold text-good-700">✓</span>
                              {row.params > 1 && (
                                <span class="num block text-[11px] text-ink-soft">
                                  all {row.params}
                                </span>
                              )}
                            </td>
                          );
                        }
                        return (
                          <td key={p.id} class="p-3 text-center">
                            <span class="num text-[13px] font-bold text-amber-700">
                              {n} of {row.params}
                            </span>
                            <span class="mx-auto mt-1 block h-1 w-10 overflow-hidden rounded-full bg-line">
                              <span
                                class="block h-full rounded-full bg-amber"
                                style={`width:${Math.round((n / row.params) * 100)}%`}
                              />
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div class="border-t border-line bg-paper px-3 py-2.5 text-xs text-ink-soft">
              Swipe the table sideways to see every package.
            </div>
          </div>

          <div class="card mt-2.5">
            <div class="mb-1.5 font-heading text-[15px] font-bold text-ink">
              Why claimed and verified counts differ
            </div>
            <p class="m-0 max-w-[70ch] text-[13.5px] leading-relaxed text-ink-soft">
              Packages often count a calculated ratio as its own parameter, or list the
              same marker under two panels. We map each package onto standard panels and
              count once, so the verified number is usually lower. Nobody is lying about
              it; labs simply count generously. Both numbers are shown so you can judge
              for yourself.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
