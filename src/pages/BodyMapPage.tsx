import { useId, useState } from "react";
import { BodyMap } from "../components/BodyMap";
import { ButtonLink } from "../components/Button";
import { RegionSelect } from "../components/RegionSelect";
import { formatShortDate } from "../lib/dates";
import { latestObservation } from "../lib/activity";
import { locationLabel, nearestRegionId, regionById, regionPercent, viewLabel } from "../lib/regions";
import { photoKindLabel } from "../lib/photos";
import { usePageTitle } from "../lib/usePageTitle";
import { useAppState } from "../state/StoreProvider";
import type { BodyView } from "../types";

type Draft = { x: number; y: number; regionId: string };

export function BodyMapPage() {
  const { concerns } = useAppState();
  usePageTitle("Body map");
  const regionFieldId = useId();
  const [view, setView] = useState<BodyView>("front");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [missed, setMissed] = useState(false);
  const selected = concerns.find((concern) => concern.id === selectedId) ?? null;
  const draftRegion = draft ? regionById(draft.regionId) : null;

  function changeView(next: BodyView) {
    setView(next);
    setSelectedId(null);
    setDraft(null);
    setMissed(false);
  }

  function place(x: number, y: number) {
    const regionId = nearestRegionId(view, x, y);
    setDraft({ x, y, regionId });
    setSelectedId(null);
    setMissed(false);
    if (regionById(regionId).view !== view) setView(regionById(regionId).view);
  }

  function chooseRegion(regionId: string) {
    if (!regionId) {
      setDraft(null);
      return;
    }
    const region = regionById(regionId);
    const point = regionPercent(region);
    setView(region.view);
    setDraft({ x: point.x, y: point.y, regionId });
    setSelectedId(null);
    setMissed(false);
  }

  const documentHref = draft
    ? `/document?view=${draftRegion?.view ?? view}&region=${draft.regionId}&x=${draft.x.toFixed(2)}&y=${draft.y.toFixed(2)}`
    : "/document";

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">Placement</p>
      <h1 className="mt-3 text-4xl sm:text-5xl">Body map</h1>
      <p className="mt-3 max-w-prose text-sm sm:text-base">
        Tap the outline, or{" "}
        <button
          type="button"
          className="font-semibold text-forest underline decoration-line underline-offset-4"
          onClick={() => document.getElementById(regionFieldId)?.focus()}
        >
          choose a region from the list
        </button>
        . A new marker starts a record. An existing marker opens that concern.
      </p>
      <div className="mt-6 lg:mt-10 lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)] lg:items-start lg:gap-x-16">
        <BodyMap
          view={view}
          onViewChange={changeView}
          concerns={concerns}
          selectedId={selected?.view === view ? selected.id : null}
          draft={draft && draftRegion?.view === view ? draft : null}
          onSelect={(id) => {
            setSelectedId(id);
            setDraft(null);
            setMissed(false);
          }}
          onPlace={place}
          onMiss={() => {
            setMissed(true);
            setDraft(null);
          }}
        />

        <div className="mt-6 lg:mt-0">
          <p className="max-w-prose text-sm text-muted">
            On the front, the figure’s left is on your right. On the back, the figure’s left is on your left.
          </p>
          <label htmlFor={regionFieldId} className="mt-5 block text-sm font-semibold">
            Body region
          </label>
          <p id={`${regionFieldId}-hint`} className="mt-1 text-sm text-muted">
            A keyboard-friendly alternative to tapping the figure. Choosing a region places a new marker.
          </p>
          <RegionSelect
            id={regionFieldId}
            value={draft?.regionId ?? ""}
            onChange={chooseRegion}
            describedBy={`${regionFieldId}-hint`}
          />

          {missed ? (
            <p role="status" className="mt-4 text-sm text-danger">
              That tap was outside the figure. Try the outline again, or choose a region from the list.
            </p>
          ) : null}

          {selected ? (
            <article className="mt-8 border-t border-line pt-6" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                {selected.sample ? "Sample concern" : "This session"}
              </p>
              <h2 className="mt-2 text-3xl">{selected.name}</h2>
              <p className="mt-2 text-sm text-muted">{locationLabel(selected.regionLabel, selected.view)}</p>
              <p className="mt-1 text-sm">
                {selected.observations.length}{" "}
                {selected.observations.length === 1 ? "entry" : "entries"}
                {latestObservation(selected)
                  ? ` · Latest ${formatShortDate(latestObservation(selected)!.date)}`
                  : ""}
              </p>
              {latestObservation(selected) ? (
                <img
                  src={latestObservation(selected)!.photoSrc}
                  alt={`${photoKindLabel(latestObservation(selected)!.photoKind)} from ${formatShortDate(latestObservation(selected)!.date)}`}
                  className="mt-4 aspect-[4/5] w-40 border border-line object-cover"
                />
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3">
                <ButtonLink to={`/concern/${selected.id}`}>View history</ButtonLink>
                <ButtonLink to={`/document?concern=${selected.id}`} variant="secondary">
                  Add observation
                </ButtonLink>
              </div>
            </article>
          ) : null}

          {draft && draftRegion ? (
            <div className="mt-8 border-t border-line pt-6" aria-live="polite">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">New marker</p>
              <h2 className="mt-2 text-3xl">{draftRegion.label}</h2>
              <p className="mt-2 text-sm text-muted">{viewLabel(draftRegion.view)} view</p>
              <p className="mt-3 max-w-prose text-sm">
                The dashed ring is only a placement. It becomes a concern when you save an observation.
              </p>
              <div className="mt-5">
                <ButtonLink to={documentHref}>Document this change</ButtonLink>
              </div>
            </div>
          ) : null}

          {!selected && !draft ? (
            <p className="mt-8 border-t border-line pt-6 text-muted">
              Select a marker, or choose a region to start a new record.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
