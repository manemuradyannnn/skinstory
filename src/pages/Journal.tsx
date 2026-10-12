import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ButtonLink } from "../components/Button";
import { formatDate, formatMonth } from "../lib/dates";
import { symptomLabels } from "../lib/symptoms";
import { usePageTitle } from "../lib/usePageTitle";
import { useAppState } from "../state/StoreProvider";

export function Journal() {
  const { concerns } = useAppState();
  usePageTitle("Journal");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (filter !== "all" && !concerns.some((concern) => concern.id === filter)) {
      setFilter("all");
    }
  }, [concerns, filter]);

  const entries = useMemo(() => {
    return concerns
      .filter((concern) => filter === "all" || concern.id === filter)
      .flatMap((concern) =>
        concern.observations.map((observation) => ({ concern, observation })),
      )
      .sort((a, b) =>
        a.observation.date === b.observation.date
          ? b.observation.createdAt.localeCompare(a.observation.createdAt)
          : b.observation.date.localeCompare(a.observation.date),
      );
  }, [concerns, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof entries>();
    for (const entry of entries) {
      const label = formatMonth(entry.observation.date);
      const group = map.get(label);
      if (group) group.push(entry);
      else map.set(label, [entry]);
    }
    return [...map.entries()];
  }, [entries]);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">Timeline</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Journal</h1>
      <p className="mt-4 max-w-prose">Every observation, newest first. Open one to see its photos and notes.</p>

      {concerns.length === 0 ? (
        <div className="mt-10 border-t border-line pt-6">
          <p className="text-muted">No observations yet. When you document a change, it will appear here.</p>
          <div className="mt-5">
            <ButtonLink to="/map">Document a change</ButtonLink>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter by concern">
            <FilterChip pressed={filter === "all"} onClick={() => setFilter("all")}>
              All
            </FilterChip>
            {concerns.map((concern) => (
              <FilterChip
                key={concern.id}
                pressed={filter === concern.id}
                onClick={() => setFilter(concern.id)}
              >
                {concern.name}
              </FilterChip>
            ))}
          </div>

          {entries.length === 0 ? (
            <p className="mt-8 text-muted">Nothing in this filter yet.</p>
          ) : (
            <div className="mt-8">
              {groups.map(([month, items]) => (
                <section key={month} className="mt-8" aria-labelledby={monthId(month)}>
                  <h2 id={monthId(month)} className="text-2xl">
                    {month}
                  </h2>
                  <ol className="mt-3 border-t border-line">
                    {items.map(({ concern, observation }) => (
                      <li key={observation.id} className="border-b border-line">
                        <Link
                          to={`/concern/${concern.id}#obs-${observation.id}`}
                          className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-4 py-4 no-underline"
                        >
                          <img
                            src={observation.photoSrc}
                            alt=""
                            className="aspect-[4/5] w-full border border-line object-cover"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm text-muted">{formatDate(observation.date)}</span>
                            <span className="mt-1 block font-serif text-2xl text-ink">{concern.name}</span>
                            <span className="mt-1 block text-sm">{symptomLabels(observation.symptoms)}</span>
                            {observation.notes ? (
                              <span className="mt-2 block text-sm text-muted">{observation.notes}</span>
                            ) : (
                              <span className="mt-2 block text-sm text-muted">No notes</span>
                            )}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function monthId(month: string) {
  return `month-${month.toLowerCase().replace(/\s+/g, "-")}`;
}

function FilterChip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-md border px-3 text-sm font-semibold ${
        pressed ? "border-forest bg-forest text-paper" : "border-line bg-paper text-ink hover:bg-ivory-deep"
      }`}
    >
      <span aria-hidden="true" className="mr-2 inline-block w-3">
        {pressed ? "✓" : ""}
      </span>
      {children}
    </button>
  );
}
