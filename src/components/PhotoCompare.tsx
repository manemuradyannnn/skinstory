import { useRef, useState } from "react";
import { formatDate } from "../lib/dates";
import { photoKindLabel } from "../lib/photos";
import type { Observation } from "../types";

type PhotoCompareProps = {
  earlier: Observation;
  later: Observation;
};

function labelFor(observation: Observation, role: "earlier" | "later", sameDate: boolean) {
  const date = formatDate(observation.date);
  if (!sameDate) return date;
  return role === "earlier" ? `${date}, saved first` : `${date}, saved later`;
}

export function PhotoCompare({ earlier, later }: PhotoCompareProps) {
  const [mode, setMode] = useState<"slider" | "side">("slider");
  const [position, setPosition] = useState(50);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const sameDate = earlier.date === later.date;
  const earlierLabel = labelFor(earlier, "earlier", sameDate);
  const laterLabel = labelFor(later, "later", sameDate);

  function setFromClientX(clientX: number) {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Comparison layout" className="inline-flex border border-line">
        {(
          [
            ["slider", "Slider"],
            ["side", "Side by side"],
          ] as const
        ).map(([value, label]) => {
          const selected = mode === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(value)}
              className={`min-h-11 px-4 text-sm font-semibold ${
                selected ? "bg-forest text-paper" : "bg-transparent text-ink hover:bg-ivory-deep"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {mode === "slider" ? (
        <div className="mt-5 max-w-lg">
          <div className="flex items-start justify-between gap-4 text-sm">
            <p>
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Earlier</span>
              <span className="font-medium">{earlierLabel}</span>
            </p>
            <p className="text-right">
              <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted">Later</span>
              <span className="font-medium">{laterLabel}</span>
            </p>
          </div>
          <div
            ref={frameRef}
            className="relative mt-3 aspect-[4/5] overflow-hidden border border-line bg-ivory-deep select-none"
            onPointerDown={(event) => {
              dragRef.current = { x: event.clientX, y: event.clientY, active: false };
            }}
            onPointerMove={(event) => {
              const drag = dragRef.current;
              if (!drag) return;
              const dx = event.clientX - drag.x;
              const dy = event.clientY - drag.y;
              if (!drag.active) {
                if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
                if (Math.abs(dy) > Math.abs(dx)) {
                  dragRef.current = null;
                  return;
                }
                drag.active = true;
                event.currentTarget.setPointerCapture(event.pointerId);
              }
              setFromClientX(event.clientX);
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
          >
            <img
              src={later.photoSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              draggable={false}
            />
            <img
              src={earlier.photoSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-contain"
              style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
              draggable={false}
            />
            <div
              className="pointer-events-none absolute inset-y-0"
              style={{ left: `${position}%` }}
              aria-hidden="true"
            >
              <div className="h-full w-0.5 -translate-x-1/2 bg-ink" />
              <div className="absolute top-1/2 left-0 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-paper" />
            </div>
          </div>
          <label className="mt-3 block text-sm font-semibold" htmlFor="compare-position">
            Comparison position
            <span className="mt-1 block font-normal text-muted">
              Drag across the photo, or use the slider. Left arrow shows more of the earlier photo.
            </span>
          </label>
          <input
            id="compare-position"
            className="compare-range"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(position)}
            aria-valuetext={`${Math.round(position)} percent across. Left is ${earlierLabel}. Right is ${laterLabel}.`}
            onChange={(event) => setPosition(Number(event.target.value))}
          />
          <p className="sr-only">
            Comparing {earlierLabel} on the left with {laterLabel} on the right.{" "}
            {photoKindLabel(earlier.photoKind)} and {photoKindLabel(later.photoKind)}.
          </p>
        </div>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-5">
          {(
            [
              [earlier, earlierLabel, "Earlier"],
              [later, laterLabel, "Later"],
            ] as const
          ).map(([observation, label, role]) => (
            <figure key={observation.id} className="min-w-0">
              <div className="aspect-[4/5] border border-line bg-ivory-deep">
                <img
                  src={observation.photoSrc}
                  alt={`${photoKindLabel(observation.photoKind)} from ${label}`}
                  className="h-full w-full object-contain"
                />
              </div>
              <figcaption className="mt-2 text-sm">
                <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-muted">{role}</span>
                {label}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
      <p className="mt-4 max-w-prose text-sm text-muted">
        Lighting, distance, and framing can change how a mark appears. Side by side keeps each photo whole when the
        framing differs. This is a record, not an assessment.
      </p>
    </div>
  );
}
