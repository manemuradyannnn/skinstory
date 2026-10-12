import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Button, ButtonLink } from "../components/Button";
import { Dialog } from "../components/Dialog";
import { PhotoCompare } from "../components/PhotoCompare";
import { chronological } from "../lib/activity";
import { compareByDate, formatDate } from "../lib/dates";
import { locationLabel } from "../lib/regions";
import { photoKindLabel } from "../lib/photos";
import { symptomLabels } from "../lib/symptoms";
import { usePageTitle } from "../lib/usePageTitle";
import { useAppState } from "../state/StoreProvider";

export function ConcernDetail() {
  const { concernId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { concerns, dispatch } = useAppState();
  const concern = concerns.find((item) => item.id === concernId);
  usePageTitle(concern?.name ?? "Concern");
  const [selected, setSelected] = useState<string[]>([]);
  const [removeObservationId, setRemoveObservationId] = useState<string | null>(null);
  const [removeConcern, setRemoveConcern] = useState(false);

  const observations = useMemo(
    () => (concern ? chronological(concern) : []),
    [concern],
  );
  const newestFirst = useMemo(() => [...observations].reverse(), [observations]);

  useEffect(() => {
    setSelected((current) => current.filter((id) => observations.some((item) => item.id === id)));
  }, [observations]);

  useEffect(() => {
    if (!location.hash) return;
    const target = document.getElementById(location.hash.slice(1));
    target?.scrollIntoView({ block: "center" });
  }, [location.hash, concernId]);

  if (!concern) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl">Concern not found</h1>
        <p className="mt-4 text-muted">It may have been removed from this session.</p>
        <div className="mt-6">
          <ButtonLink to="/journal">Back to journal</ButtonLink>
        </div>
      </div>
    );
  }

  const chosen = observations.filter((item) => selected.includes(item.id)).sort(compareByDate);
  const pair = chosen.length === 2 ? chosen : null;
  const pending = observations.find((item) => item.id === removeObservationId);
  const lastObservation = observations.length === 1;

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 2) return current;
      return [...current, id];
    });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">
        {concern.sample ? "Sample concern" : "This session"}
      </p>
      <h1 className="mt-3 text-4xl sm:text-5xl">{concern.name}</h1>
      <p className="mt-3 text-muted">{locationLabel(concern.regionLabel, concern.view)}</p>
      <p className="mt-1">
        {observations.length} {observations.length === 1 ? "entry" : "entries"}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <ButtonLink to={`/document?concern=${concern.id}`}>Add observation</ButtonLink>
        <Button variant="secondary" onClick={() => setRemoveConcern(true)}>
          Remove concern
        </Button>
      </div>

      <section className="mt-14" aria-labelledby="compare-heading">
        <h2 id="compare-heading" className="text-[1.75rem]">
          Compare photos
        </h2>
        {observations.length < 2 ? (
          <p className="mt-4 max-w-prose text-muted">
            Add another observation to compare photos over time. The entry below stays in the journal.
          </p>
        ) : (
          <>
            <p className="mt-3 max-w-prose text-sm text-muted">
              Select two photos. The earlier date stays on the left.
            </p>
            <ul className="mt-4 flex flex-wrap gap-3">
              {observations.map((observation) => {
                const checked = selected.includes(observation.id);
                const disabled = !checked && selected.length >= 2;
                return (
                  <li key={observation.id}>
                    <label
                      className={`block w-28 border px-2 py-2 ${
                        checked ? "border-forest" : "border-line"
                      } ${disabled ? "opacity-50" : "cursor-pointer"}`}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggle(observation.id)}
                        />
                        Compare
                      </span>
                      <img
                        src={observation.photoSrc}
                        alt=""
                        className="mt-2 aspect-[4/5] w-full object-cover"
                      />
                      <span className="mt-2 block text-xs leading-snug">{formatDate(observation.date)}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {selected.length === 2 ? (
              <p className="mt-3 text-sm text-muted">Two photos selected. Clear one to choose a different pair.</p>
            ) : (
              <p className="mt-3 text-sm text-muted">
                {selected.length} of 2 selected.
              </p>
            )}
            <div className="mt-6">
              {pair ? (
                <PhotoCompare earlier={pair[0]} later={pair[1]} />
              ) : (
                <p className="border-t border-line pt-4 text-muted">Select two photos to compare them.</p>
              )}
            </div>
          </>
        )}
      </section>

      <section className="mt-16" aria-labelledby="journal-heading">
        <h2 id="journal-heading" className="text-[1.75rem]">
          Photo journal
        </h2>
        <p className="mt-2 text-sm text-muted">Newest first.</p>
        <ol className="mt-4 border-t border-line">
          {newestFirst.map((observation) => (
            <li key={observation.id} id={`obs-${observation.id}`} className="scroll-mt-24 border-b border-line py-6">
              <article>
                <p className="text-sm text-muted">{formatDate(observation.date)}</p>
                <h3 className="mt-1 text-2xl">{symptomLabels(observation.symptoms)}</h3>
                <img
                  src={observation.photoSrc}
                  alt={`${photoKindLabel(observation.photoKind)} recorded on ${formatDate(observation.date)}`}
                  className="mt-4 aspect-[4/5] w-full max-w-sm border border-line object-contain bg-ivory-deep"
                />
                <p className="mt-2 text-sm text-muted">{photoKindLabel(observation.photoKind)}</p>
                {observation.notes ? (
                  <p className="mt-3 max-w-prose whitespace-pre-wrap break-words">{observation.notes}</p>
                ) : (
                  <p className="mt-3 text-muted">No notes.</p>
                )}
                <div className="mt-4">
                  <Button variant="secondary" onClick={() => setRemoveObservationId(observation.id)}>
                    Remove observation
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </section>

      <Dialog
        open={pending !== undefined}
        title="Remove this observation?"
        description={
          lastObservation
            ? "This is the only observation, so the concern will also be removed from this session."
            : "The photo, symptoms, and notes will be deleted from this session."
        }
        confirmLabel="Remove"
        onClose={() => setRemoveObservationId(null)}
        onConfirm={() => {
          if (!pending) return;
          const removingLast = observations.length === 1;
          dispatch({
            type: "delete-observation",
            concernId: concern.id,
            observationId: pending.id,
          });
          setRemoveObservationId(null);
          if (removingLast) navigate("/journal");
        }}
      />
      <Dialog
        open={removeConcern}
        title="Remove this concern?"
        description={
          concern.sample
            ? `All observations for ${concern.name} will leave this session. Refresh the page to bring the sample back.`
            : `All observations for ${concern.name} will be deleted from this session.`
        }
        confirmLabel="Remove concern"
        onClose={() => setRemoveConcern(false)}
        onConfirm={() => {
          dispatch({ type: "delete-concern", concernId: concern.id });
          setRemoveConcern(false);
          navigate("/journal");
        }}
      />
    </div>
  );
}
