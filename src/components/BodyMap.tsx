import type { MouseEvent } from "react";
import { VIEW_H, VIEW_W, isNearBody } from "../lib/bodyGeometry";
import type { BodyView, Concern } from "../types";
import { BodyFigure } from "./BodyFigure";

type Draft = { x: number; y: number };

type BodyMapProps = {
  view: BodyView;
  onViewChange: (view: BodyView) => void;
  concerns: Concern[];
  selectedId: string | null;
  draft: Draft | null;
  onSelect: (id: string) => void;
  onPlace: (x: number, y: number) => void;
  onMiss: () => void;
  interactive?: boolean;
  markersInteractive?: boolean;
};

export function BodyMap({
  view,
  onViewChange,
  concerns,
  selectedId,
  draft,
  onSelect,
  onPlace,
  onMiss,
  interactive = true,
  markersInteractive = true,
}: BodyMapProps) {
  const markers = concerns.filter((concern) => concern.view === view);

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    if (!interactive) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    if (!isNearBody(x, y)) {
      onMiss();
      return;
    }
    onPlace(x, y);
  }

  return (
    <div>
      <div role="radiogroup" aria-label="Body view" className="inline-flex border border-line">
        {(["front", "back"] as const).map((option) => {
          const selected = view === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onViewChange(option)}
              className={`min-h-11 min-w-24 px-4 text-sm font-semibold ${
                selected ? "bg-forest text-paper" : "bg-transparent text-ink hover:bg-ivory-deep"
              }`}
            >
              {option === "front" ? "Front" : "Back"}
            </button>
          );
        })}
      </div>

      <div
        className={`relative mx-auto mt-4 w-[min(100%,15rem,calc((100dvh-30rem)*0.4167))] lg:mt-5 lg:w-full lg:max-w-[15rem] ${interactive ? "cursor-pointer" : ""}`}
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
        onClick={handleClick}
      >
        <BodyFigure view={view} />
        {markers.map((concern) => {
          const selected = concern.id === selectedId;
          const dot = (
            <span
              className={`block rounded-full border-2 border-paper bg-forest ${
                selected ? "size-4 ring-2 ring-forest ring-offset-2 ring-offset-ivory" : "size-3"
              }`}
            />
          );
          if (!markersInteractive) {
            return (
              <span
                key={concern.id}
                aria-hidden="true"
                className="absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
                style={{ left: `${concern.x}%`, top: `${concern.y}%` }}
              >
                {dot}
              </span>
            );
          }
          return (
            <button
              key={concern.id}
              type="button"
              className="absolute z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
              style={{ left: `${concern.x}%`, top: `${concern.y}%` }}
              aria-pressed={selected}
              aria-label={`${concern.name}, ${concern.regionLabel}. ${concern.observations.length} ${
                concern.observations.length === 1 ? "entry" : "entries"
              }.`}
              onClick={(event) => {
                event.stopPropagation();
                onSelect(concern.id);
              }}
            >
              {dot}
            </button>
          );
        })}
        {draft ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute z-10 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-forest bg-paper/80"
            style={{ left: `${draft.x}%`, top: `${draft.y}%` }}
          />
        ) : null}
      </div>
      <p className="mt-3 text-center text-sm text-muted">
        <span className="font-serif text-base text-ink">{view === "front" ? "Fig. 1" : "Fig. 2"}</span>
        {" · "}
        {view === "front" ? "Front" : "Back"}
      </p>
    </div>
  );
}
