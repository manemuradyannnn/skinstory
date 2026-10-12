import { torsoPath, VIEW_H, VIEW_W } from "../lib/bodyGeometry";
import type { BodyView } from "../types";

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.15,
  strokeLinecap: "round" as const,
  strokeOpacity: 0.55,
  vectorEffect: "non-scaling-stroke" as const,
};

export function BodyFigure({ view }: { view: BodyView }) {
  const title = view === "front" ? "Front view of a simplified body outline" : "Back view of a simplified body outline";
  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="absolute inset-0 h-full w-full text-forest"
      role="img"
      aria-label={title}
    >
      <path
        d={torsoPath}
        fill="#efe6d8"
        stroke="currentColor"
        strokeWidth="1.7"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
      />
      {view === "back" ? (
        <g {...stroke}>
          <path d="M100 110 C101 150, 99 190, 100 228" />
          <path d="M82 150 C90 168, 92 188, 84 206" />
          <path d="M118 150 C110 168, 108 188, 116 206" />
        </g>
      ) : null}
    </svg>
  );
}