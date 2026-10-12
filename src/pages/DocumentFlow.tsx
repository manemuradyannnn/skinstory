import { ArrowLeft } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BodyMap } from "../components/BodyMap";
import { Button, ButtonLink, fieldClass } from "../components/Button";
import { RegionSelect } from "../components/RegionSelect";
import { SymptomField } from "../components/SymptomField";
import { formatDate, isValidObservationDate, todayISO } from "../lib/dates";
import { locationLabel, nearestRegionId, regionById, regionPercent, viewLabel } from "../lib/regions";
import { REGIONS } from "../lib/regions";
import { demoPhotoSrc, photoKindLabel, readImageFile } from "../lib/photos";
import { symptomLabels } from "../lib/symptoms";
import { usePageTitle } from "../lib/usePageTitle";
import { useAppState } from "../state/StoreProvider";
import type { BodyView, Observation, SymptomId } from "../types";

const STEPS = [
  { id: "location", label: "Location" },
  { id: "photo", label: "Photo" },
  { id: "notes", label: "Observations" },
  { id: "review", label: "Review" },
] as const;

type PhotoDraft = {
  src: string;
  kind: "upload" | "demo";
  name?: string;
};

function knownRegion(id: string | null) {
  if (!id) return null;
  return REGIONS.find((region) => region.id === id) ?? null;
}

export function DocumentFlow() {
  const { concerns, dispatch } = useAppState();
  usePageTitle("Document a change");
  const [params] = useSearchParams();
  const regionFieldId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const skipStepFocus = useRef(true);

  const concern = concerns.find((item) => item.id === params.get("concern"));
  const presetRegion = knownRegion(params.get("region"));
  const xParam = Number(params.get("x"));
  const yParam = Number(params.get("y"));
  const hasPoint = params.has("x") && params.has("y") && Number.isFinite(xParam) && Number.isFinite(yParam);
  const missingConcern = Boolean(params.get("concern")) && !concern;

  const [step, setStep] = useState(0);
  const [regionId, setRegionId] = useState(concern?.regionId ?? presetRegion?.id ?? "");
  const [view, setView] = useState<BodyView>(concern?.view ?? presetRegion?.view ?? (params.get("view") === "back" ? "back" : "front"));
  const [point, setPoint] = useState<{ x: number; y: number } | null>(
    concern
      ? { x: concern.x, y: concern.y }
      : hasPoint
        ? { x: xParam, y: yParam }
        : presetRegion
          ? regionPercent(presetRegion)
          : null,
  );
  const [name, setName] = useState(concern?.name ?? presetRegion?.label ?? "");
  const [nameTouched, setNameTouched] = useState(Boolean(concern));
  const [adjusting, setAdjusting] = useState(!concern && !presetRegion && !hasPoint);
  const [photo, setPhoto] = useState<PhotoDraft | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [dragging, setDragging] = useState(false);
  const [symptoms, setSymptoms] = useState<SymptomId[]>([]);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISO());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<{ concernId: string; name: string } | null>(null);

  const activeRegion = regionId ? knownRegion(regionId) : null;

  useEffect(() => {
    if (skipStepFocus.current) {
      skipStepFocus.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [step]);

  function chooseRegion(nextId: string) {
    setRegionId(nextId);
    if (!nextId) {
      setPoint(null);
      return;
    }
    const region = regionById(nextId);
    setView(region.view);
    setPoint(regionPercent(region));
    if (!nameTouched) setName(region.label);
    setErrors((current) => ({ ...current, region: "", name: "" }));
  }

  async function acceptFile(file: File) {
    try {
      const result = await readImageFile(file);
      setPhoto({ src: result.src, kind: "upload", name: result.name });
      setPhotoError("");
      setErrors((current) => ({ ...current, photo: "" }));
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "That image could not be read.");
    }
  }

  function validate(currentStep: number) {
    const next: Record<string, string> = {};
    if (currentStep === 0 && !concern) {
      if (!regionId || !activeRegion) next.region = "Choose a body region to continue.";
      const trimmed = name.trim();
      if (!trimmed) next.name = "Give this concern a short name.";
      else if (trimmed.length > 60) next.name = "Use 60 characters or fewer.";
    }
    if (currentStep === 1 && !photo) {
      next.photo = "Add a photo, or use a demo photo, to continue.";
    }
    if (currentStep === 2) {
      if (symptoms.length === 0) next.symptoms = "Select at least one symptom, or choose None.";
      if (!isValidObservationDate(date)) next.date = "Choose a date that is today or earlier.";
      if (notes.length > 1000) next.notes = "Notes can be up to 1,000 characters.";
    }
    return next;
  }

  function focusError(next: Record<string, string>) {
    const order = ["region", "name", "photo", "symptoms", "date", "notes"] as const;
    const first = order.find((key) => next[key]);
    if (!first) return;
    if (first === "symptoms") {
      document.getElementById("symptoms")?.focus();
      return;
    }
    if (first === "photo") {
      document.getElementById("upload-photo")?.focus();
      return;
    }
    const ids: Record<string, string> = {
      region: regionFieldId,
      name: "concern-name",
      date: "observation-date",
      notes: "observation-notes",
    };
    document.getElementById(ids[first])?.focus();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next = validate(step);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      focusError(next);
      return;
    }
    if (step < 3) {
      setStep((current) => current + 1);
      return;
    }
    save();
  }

  function save() {
    for (const index of [0, 1, 2]) {
      const next = validate(index);
      if (Object.keys(next).length > 0) {
        setErrors(next);
        setStep(index);
        focusError(next);
        return;
      }
    }
    if (!photo) return;
    const observation: Observation = {
      id: crypto.randomUUID(),
      date,
      photoSrc: photo.src,
      photoKind: photo.kind,
      photoName: photo.name,
      symptoms,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
    if (concern) {
      dispatch({ type: "add-observation", concernId: concern.id, observation });
      setSaved({ concernId: concern.id, name: concern.name });
      return;
    }
    if (!activeRegion || !point) return;
    const id = crypto.randomUUID();
    dispatch({
      type: "add-concern",
      concern: {
        id,
        name: name.trim(),
        regionId: activeRegion.id,
        regionLabel: activeRegion.label,
        view: activeRegion.view,
        x: point.x,
        y: point.y,
        sample: false,
        observations: [observation],
      },
    });
    setSaved({ concernId: id, name: name.trim() });
  }

  if (missingConcern) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="text-4xl">That concern is not in this session</h1>
        <p className="mt-4 text-muted">It may have been removed. Choose a place on the body map to start again.</p>
        <div className="mt-6">
          <ButtonLink to="/map">Go to body map</ButtonLink>
        </div>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest">Saved</p>
        <h1 className="mt-3 text-4xl sm:text-5xl">Added to {saved.name}</h1>
        <p className="mt-4 max-w-prose">
          The observation is in your journal for this session. It stays in this tab and clears when you refresh.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink to={`/concern/${saved.concernId}`}>View history</ButtonLink>
          <ButtonLink to="/map" variant="secondary">
            Document another
          </ButtonLink>
          <ButtonLink to="/" variant="ghost">
            Back to overview
          </ButtonLink>
        </div>
      </div>
    );
  }

  const stepTitle = ["Where is it?", "Add a photo", "What do you notice?", "Review"][step];

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to={concern ? `/concern/${concern.id}` : "/map"}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-forest no-underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />
        Cancel
      </Link>
      <h1 className="mt-4 text-4xl sm:text-5xl">Document a change</h1>
      <p className="mt-3 text-sm text-muted">A short record of what you can see. Nothing here is a diagnosis.</p>

      <ol aria-label="Progress" className="mt-8 grid grid-cols-4 gap-3">
        {STEPS.map((item, index) => {
          const current = index === step;
          const done = index < step;
          return (
            <li key={item.id} aria-current={current ? "step" : undefined}>
              {done ? (
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    setErrors({});
                    setStep(index);
                  }}
                >
                  <StepLabel index={index} label={item.label} state="done" />
                </button>
              ) : (
                <StepLabel index={index} label={item.label} state={current ? "current" : "upcoming"} />
              )}
            </li>
          );
        })}
      </ol>

      <form className="mt-10" noValidate onSubmit={onSubmit}>
        <h2 ref={stepHeadingRef} tabIndex={-1} className="text-[1.7rem] outline-none">
          {stepTitle}
        </h2>
        <p className="mt-1 text-sm text-muted">
          Step {step + 1} of {STEPS.length}
        </p>

        {step === 0 ? (
          <div className="mt-6">
            {concern ? (
              <div>
                <p className="text-sm text-muted">This observation will be added to</p>
                <p className="mt-2 font-serif text-3xl">{concern.name}</p>
                <p className="mt-2">{locationLabel(concern.regionLabel, concern.view)}</p>
                <p className="mt-2 text-sm text-muted">
                  {concern.observations.length}{" "}
                  {concern.observations.length === 1 ? "observation" : "observations"} so far.
                </p>
              </div>
            ) : (
              <div>
                {activeRegion && point && !adjusting ? (
                  <div>
                    <p className="font-serif text-3xl">{activeRegion.label}</p>
                    <p className="mt-2 text-muted">{viewLabel(activeRegion.view)} view</p>
                    <button
                      type="button"
                      className="mt-4 min-h-11 font-semibold text-forest underline decoration-line underline-offset-4"
                      onClick={() => setAdjusting(true)}
                    >
                      Adjust on the body map
                    </button>
                  </div>
                ) : null}

                {adjusting ? (
                  <div className="mt-2">
                    <BodyMap
                      view={view}
                      onViewChange={(next) => {
                        setView(next);
                        setPoint(null);
                        setRegionId("");
                      }}
                      concerns={concerns}
                      selectedId={null}
                      draft={point && activeRegion?.view === view ? point : null}
                      markersInteractive={false}
                      onSelect={() => undefined}
                      onPlace={(x, y) => {
                        const nextId = nearestRegionId(view, x, y);
                        setRegionId(nextId);
                        setPoint({ x, y });
                        if (!nameTouched) setName(regionById(nextId).label);
                        setErrors((current) => ({ ...current, region: "" }));
                      }}
                      onMiss={() => setErrors((current) => ({ ...current, region: "Tap the figure, or choose a region below." }))}
                    />
                    <p className="text-sm text-muted">Filled dots are concerns already in your journal.</p>
                  </div>
                ) : null}

                <div className="mt-6">
                  <label htmlFor={regionFieldId} className="text-sm font-semibold">
                    Body region
                  </label>
                  <RegionSelect
                    id={regionFieldId}
                    value={regionId}
                    onChange={chooseRegion}
                    invalid={Boolean(errors.region)}
                    describedBy={errors.region ? "region-error" : undefined}
                  />
                  {errors.region ? (
                    <p id="region-error" role="alert" className="mt-2 text-sm text-danger">
                      {errors.region}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6">
                  <label htmlFor="concern-name" className="text-sm font-semibold">
                    Name
                  </label>
                  <p className="mt-1 text-sm text-muted">A short label for your own journal.</p>
                  <input
                    id="concern-name"
                    className={fieldClass}
                    value={name}
                    maxLength={60}
                    autoComplete="off"
                    aria-invalid={Boolean(errors.name) || undefined}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    onChange={(event) => {
                      setNameTouched(true);
                      setName(event.target.value);
                      setErrors((current) => ({ ...current, name: "" }));
                    }}
                  />
                  {errors.name ? (
                    <p id="name-error" role="alert" className="mt-2 text-sm text-danger">
                      {errors.name}
                    </p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {step === 1 ? (
          <div
            className="mt-6"
            onDragOver={(event: DragEvent) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event: DragEvent) => {
              event.preventDefault();
              setDragging(false);
              const file = event.dataTransfer.files[0];
              if (file) void acceptFile(file);
            }}
          >
            <p className="max-w-prose">For a useful comparison later, try to keep the picture consistent.</p>
            <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted">
              <li>Use similar light, such as the same window.</li>
              <li>Hold the camera at a similar distance.</li>
              <li>Include a little of the surrounding skin.</li>
            </ol>
            <input
              ref={fileRef}
              id="photo-file"
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              tabIndex={-1}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void acceptFile(file);
              }}
            />
            {photo ? (
              <figure className="mt-6 max-w-sm">
                <img
                  src={photo.src}
                  alt="Selected observation"
                  className="aspect-[4/5] w-full border border-line object-contain bg-ivory-deep"
                />
                <figcaption className="mt-2 text-sm text-muted">
                  {photo.kind === "upload" ? photo.name || "Uploaded photo" : "Demo illustration"}
                </figcaption>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Button id="upload-photo" variant="secondary" onClick={() => fileRef.current?.click()}>
                    Replace photo
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setPhoto(null);
                      setPhotoError("");
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </figure>
            ) : (
              <div className={`mt-6 border px-4 py-5 ${dragging ? "border-forest bg-paper" : "border-line"}`}>
                <p className="text-sm">{dragging ? "Release to use this image." : "Choose a photo from this device."}</p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button id="upload-photo" onClick={() => fileRef.current?.click()}>
                    Upload a photo
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPhoto({
                        src: demoPhotoSrc(concern?.observations.length ?? 0),
                        kind: "demo",
                      });
                      setPhotoError("");
                      setErrors((current) => ({ ...current, photo: "" }));
                    }}
                  >
                    Use demo photo
                  </Button>
                </div>
              </div>
            )}
            {photoError ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                {photoError}
              </p>
            ) : null}
            {errors.photo ? (
              <p role="alert" className="mt-3 text-sm text-danger">
                {errors.photo}
              </p>
            ) : null}
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-6 space-y-6">
            <SymptomField
              value={symptoms}
              onChange={(next) => {
                setSymptoms(next);
                setErrors((current) => ({ ...current, symptoms: "" }));
              }}
              error={errors.symptoms}
            />
            <div>
              <label htmlFor="observation-date" className="text-sm font-semibold">
                Observation date
              </label>
              <p className="mt-1 text-sm text-muted">Use the day you noticed it or took the photo.</p>
              <input
                id="observation-date"
                className={fieldClass}
                type="date"
                value={date}
                max={todayISO()}
                aria-invalid={Boolean(errors.date) || undefined}
                aria-describedby={errors.date ? "date-error" : undefined}
                onChange={(event) => {
                  setDate(event.target.value);
                  setErrors((current) => ({ ...current, date: "" }));
                }}
              />
              {errors.date ? (
                <p id="date-error" role="alert" className="mt-2 text-sm text-danger">
                  {errors.date}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor="observation-notes" className="text-sm font-semibold">
                Notes <span className="font-normal text-muted">(optional)</span>
              </label>
              <textarea
                id="observation-notes"
                className={`${fieldClass} min-h-32`}
                value={notes}
                maxLength={1000}
                placeholder="Colour, texture, size, or what you were doing that day."
                aria-invalid={Boolean(errors.notes) || undefined}
                aria-describedby="notes-count"
                onChange={(event) => setNotes(event.target.value)}
              />
              <p id="notes-count" className="mt-2 text-sm text-muted">
                {notes.length} / 1,000
              </p>
              {errors.notes ? (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {errors.notes}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 3 && photo ? (
          <div className="mt-6 border-t border-line">
            <ReviewRow label="Concern" value={concern?.name ?? name.trim()} onEdit={concern ? undefined : () => setStep(0)} />
            <ReviewRow
              label="Location"
              value={
                concern
                  ? locationLabel(concern.regionLabel, concern.view)
                  : activeRegion
                    ? locationLabel(activeRegion.label, activeRegion.view)
                    : "Not set"
              }
              onEdit={concern ? undefined : () => setStep(0)}
            />
            <div className="border-b border-line py-4">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-sans text-sm font-semibold tracking-normal">Photo</h3>
                <button type="button" className="text-sm font-semibold text-forest underline decoration-line underline-offset-4" onClick={() => setStep(1)}>
                  Edit photo
                </button>
              </div>
              <img
                src={photo.src}
                alt="Observation to save"
                className="mt-3 aspect-[4/5] w-full max-w-xs border border-line object-contain bg-ivory-deep"
              />
              <p className="mt-2 text-sm text-muted">{photoKindLabel(photo.kind)}</p>
            </div>
            <ReviewRow label="Date" value={formatDate(date)} onEdit={() => setStep(2)} />
            <ReviewRow label="Symptoms" value={symptomLabels(symptoms)} onEdit={() => setStep(2)} />
            <ReviewRow label="Notes" value={notes.trim() || "No notes"} onEdit={() => setStep(2)} />
          </div>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          {step > 0 ? (
            <Button
              variant="secondary"
              onClick={() => {
                setErrors({});
                setStep((current) => current - 1);
              }}
            >
              Back
            </Button>
          ) : null}
          <Button type="submit">{step === 3 ? "Save observation" : "Continue"}</Button>
        </div>
      </form>
    </div>
  );
}

function StepLabel({
  index,
  label,
  state,
}: {
  index: number;
  label: string;
  state: "done" | "current" | "upcoming";
}) {
  return (
    <span className="block">
      <span className="sr-only">
        {state === "done" ? "Completed. " : state === "upcoming" ? "Upcoming. " : "Current. "}
      </span>
      <span
        className={`block text-xs font-semibold uppercase tracking-[0.14em] ${
          state === "upcoming" ? "text-muted" : "text-forest"
        }`}
      >
        {state === "current" ? "Now" : index + 1}
      </span>
      <span className={`mt-1 block text-sm leading-tight ${state === "current" ? "font-semibold" : "font-medium"}`}>
        {label}
      </span>
      <span className={`mt-2 block h-px ${state === "upcoming" ? "bg-line" : "bg-forest"}`} />
    </span>
  );
}

function ReviewRow({ label, value, onEdit }: { label: string; value: string; onEdit?: () => void }) {
  return (
    <div className="border-b border-line py-4">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-sans text-sm font-semibold tracking-normal">{label}</h3>
        {onEdit ? (
          <button
            type="button"
            className="text-sm font-semibold text-forest underline decoration-line underline-offset-4"
            onClick={onEdit}
          >
            Edit {label.toLowerCase()}
          </button>
        ) : null}
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words">{value}</p>
    </div>
  );
}
