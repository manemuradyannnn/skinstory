import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { ButtonLink } from "../components/Button";
import { latestObservation, recentActivity } from "../lib/activity";
import { formatDate, greeting } from "../lib/dates";
import { locationLabel } from "../lib/regions";
import { photoKindLabel } from "../lib/photos";
import { symptomLabels } from "../lib/symptoms";
import { usePageTitle } from "../lib/usePageTitle";
import { useAppState } from "../state/StoreProvider";

export function Overview() {
  const { concerns } = useAppState();
  usePageTitle("Overview");
  const activity = recentActivity(concerns);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">Your record</p>
      <h1 className="mt-3 max-w-[12ch] text-[2.6rem] sm:text-5xl">{greeting()}.</h1>
      <p className="mt-5 max-w-[42rem] text-lg leading-relaxed">
        Photograph a skin concern, note what you notice, and gather it before a dermatologist visit.
      </p>
      <p className="mt-3 max-w-[42rem] text-sm leading-relaxed text-muted">
        SkinStory keeps observations. It does not diagnose, score risk, or suggest treatment. Sample concerns are
        fictional. Anything you add stays in this tab and clears when you refresh.
      </p>
      <div className="mt-8">
        <ButtonLink to="/map">Document a change</ButtonLink>
      </div>

      <section className="mt-16" aria-labelledby="concerns-heading">
        <div className="flex items-baseline justify-between gap-4">
          <h2 id="concerns-heading" className="text-[1.75rem]">
            Concerns
          </h2>
          <p className="text-sm text-muted">{concerns.length}</p>
        </div>
        <p className="mt-2 max-w-prose text-sm text-muted">
          Fictional examples are marked Sample. Concerns you add are marked This session.
        </p>
        {concerns.length === 0 ? (
          <p className="mt-6 border-t border-line pt-6 text-muted">
            No concerns yet. When you document a change, it will be listed here.
          </p>
        ) : (
          <ul className="mt-4 border-t border-line">
            {concerns.map((concern) => {
              const latest = latestObservation(concern);
              const count = concern.observations.length;
              return (
                <li key={concern.id} className="border-b border-line">
                  <Link
                    to={`/concern/${concern.id}`}
                    className="grid grid-cols-[4.75rem_minmax(0,1fr)_auto] items-center gap-4 py-4 no-underline"
                  >
                    {latest ? (
                      <img
                        src={latest.photoSrc}
                        alt={`${photoKindLabel(latest.photoKind)} from ${formatDate(latest.date)}`}
                        className="aspect-square w-full border border-line object-cover"
                      />
                    ) : (
                      <span className="grid aspect-square place-items-center border border-line text-xs text-muted">
                        No photo
                      </span>
                    )}
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="font-serif text-2xl text-ink">{concern.name}</span>
                        <span className="border border-line px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
                          {concern.sample ? "Sample" : "This session"}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        {locationLabel(concern.regionLabel, concern.view)}
                      </span>
                      <span className="mt-1 block text-sm">
                        {count} {count === 1 ? "entry" : "entries"}
                        {latest ? ` · Latest ${formatDate(latest.date)}` : ""}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-5 text-muted" strokeWidth={1.5} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-16" aria-labelledby="activity-heading">
        <h2 id="activity-heading" className="text-[1.75rem]">
          Recent activity
        </h2>
        {activity.length === 0 ? (
          <p className="mt-4 text-muted">When you save an observation, it will be listed here.</p>
        ) : (
          <ol className="mt-4 border-t border-line">
            {activity.map((item) => (
              <li key={item.observationId} className="border-b border-line">
                <Link
                  to={`/concern/${item.concernId}#obs-${item.observationId}`}
                  className="block py-4 no-underline"
                >
                  <span className="block text-sm text-muted">{formatDate(item.date)}</span>
                  <span className="mt-1 block font-serif text-xl text-ink">{item.concernName}</span>
                  <span className="mt-1 block text-sm">{symptomLabels(item.symptoms)}</span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
