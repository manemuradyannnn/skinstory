import { VIEW_H, VIEW_W } from "./bodyGeometry";
import type { BodyView } from "../types";

export type Region = {
  id: string;
  label: string;
  view: BodyView;
  /** Anchor in viewBox units, so markers stay aligned with the figure. */
  vx: number;
  vy: number;
};

/**
 * Front view faces the viewer, so the figure's left is on the viewer's right.
 * Back view faces away, so the figure's left is on the viewer's left.
 * Anchors use that convention.
 */
export const REGIONS: Region[] = [
  { id: "forehead", label: "Forehead", view: "front", vx: 100, vy: 38 },
  { id: "right-cheek", label: "Right cheek", view: "front", vx: 88, vy: 62 },
  { id: "left-cheek", label: "Left cheek", view: "front", vx: 112, vy: 62 },
  { id: "chin", label: "Chin", view: "front", vx: 100, vy: 84 },
  { id: "neck-front", label: "Neck", view: "front", vx: 100, vy: 100 },
  { id: "right-chest", label: "Right chest", view: "front", vx: 83, vy: 176 },
  { id: "left-chest", label: "Left chest", view: "front", vx: 117, vy: 176 },
  { id: "abdomen", label: "Abdomen", view: "front", vx: 100, vy: 214 },
  { id: "right-upper-arm", label: "Right upper arm", view: "front", vx: 46, vy: 164 },
  { id: "left-upper-arm", label: "Left upper arm", view: "front", vx: 154, vy: 164 },
  { id: "right-forearm", label: "Right forearm", view: "front", vx: 42, vy: 248 },
  { id: "left-forearm", label: "Left forearm", view: "front", vx: 158, vy: 248 },
  { id: "right-hand", label: "Right hand", view: "front", vx: 44, vy: 302 },
  { id: "left-hand", label: "Left hand", view: "front", vx: 156, vy: 302 },
  { id: "right-thigh", label: "Right thigh", view: "front", vx: 74, vy: 324 },
  { id: "left-thigh", label: "Left thigh", view: "front", vx: 126, vy: 324 },
  { id: "right-lower-leg", label: "Right lower leg", view: "front", vx: 72, vy: 412 },
  { id: "left-lower-leg", label: "Left lower leg", view: "front", vx: 128, vy: 412 },
  { id: "right-foot", label: "Right foot", view: "front", vx: 74, vy: 454 },
  { id: "left-foot", label: "Left foot", view: "front", vx: 126, vy: 454 },

  { id: "scalp", label: "Scalp", view: "back", vx: 100, vy: 34 },
  { id: "nape", label: "Nape", view: "back", vx: 100, vy: 102 },
  { id: "left-shoulder", label: "Left shoulder", view: "back", vx: 58, vy: 126 },
  { id: "right-shoulder", label: "Right shoulder", view: "back", vx: 142, vy: 126 },
  { id: "upper-back-left", label: "Upper back, left", view: "back", vx: 84, vy: 168 },
  { id: "upper-back-right", label: "Upper back, right", view: "back", vx: 116, vy: 168 },
  { id: "lower-back", label: "Lower back", view: "back", vx: 100, vy: 220 },
  { id: "left-upper-arm-back", label: "Left upper arm", view: "back", vx: 46, vy: 164 },
  { id: "right-upper-arm-back", label: "Right upper arm", view: "back", vx: 154, vy: 164 },
  { id: "left-forearm-back", label: "Left forearm", view: "back", vx: 42, vy: 248 },
  { id: "right-forearm-back", label: "Right forearm", view: "back", vx: 158, vy: 248 },
  { id: "left-hand-back", label: "Left hand", view: "back", vx: 44, vy: 302 },
  { id: "right-hand-back", label: "Right hand", view: "back", vx: 156, vy: 302 },
  { id: "left-hip", label: "Left hip", view: "back", vx: 78, vy: 256 },
  { id: "right-hip", label: "Right hip", view: "back", vx: 122, vy: 256 },
  { id: "left-thigh-back", label: "Left thigh", view: "back", vx: 74, vy: 324 },
  { id: "right-thigh-back", label: "Right thigh", view: "back", vx: 126, vy: 324 },
  { id: "left-calf", label: "Left calf", view: "back", vx: 72, vy: 412 },
  { id: "right-calf", label: "Right calf", view: "back", vx: 128, vy: 412 },
  { id: "left-foot-back", label: "Left foot", view: "back", vx: 74, vy: 454 },
  { id: "right-foot-back", label: "Right foot", view: "back", vx: 126, vy: 454 },
];

export function regionById(id: string): Region {
  const region = REGIONS.find((item) => item.id === id);
  if (!region) throw new Error(`Unknown body region: ${id}`);
  return region;
}

export function regionPercent(region: Region): { x: number; y: number } {
  return {
    x: (region.vx / VIEW_W) * 100,
    y: (region.vy / VIEW_H) * 100,
  };
}

export function regionsFor(view: BodyView): Region[] {
  return REGIONS.filter((region) => region.view === view);
}

export function nearestRegionId(view: BodyView, xPercent: number, yPercent: number): string {
  const regions = regionsFor(view);
  let best = regions[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const region of regions) {
    const point = regionPercent(region);
    const dx = (point.x - xPercent) * VIEW_W;
    const dy = (point.y - yPercent) * VIEW_H;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = region;
    }
  }
  return best.id;
}

export function viewLabel(view: BodyView): string {
  return view === "front" ? "Front" : "Back";
}

export function locationLabel(regionLabel: string, view: BodyView): string {
  return `${regionLabel} · ${viewLabel(view)}`;
}
