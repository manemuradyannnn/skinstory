export const VIEW_W = 200;
export const VIEW_H = 480;

export type Point = [number, number];

/**
 * Left side of one continuous outline, crown to crotch.
 * Shoulders lead into the arm, then the line returns through the armpit
 * so the forearm stays visually separate from the torso.
 */
const OUTLINE_LEFT: Point[] = [
  [100, 20],
  [91, 24],
  [82, 36],
  [77, 52],
  [77, 68],
  [83, 80],
  [92, 90],
  [96, 104],
  [74, 116],
  [52, 128],
  [40, 156],
  [34, 198],
  [36, 240],
  [42, 276],
  [34, 294],
  [38, 312],
  [54, 310],
  [52, 292],
  [48, 258],
  [46, 214],
  [52, 172],
  [70, 148],
  [66, 178],
  [72, 214],
  [60, 252],
  [56, 308],
  [58, 362],
  [64, 412],
  [68, 438],
  [56, 450],
  [62, 464],
  [90, 462],
  [86, 446],
  [80, 412],
  [82, 364],
  [92, 316],
  [100, 292],
];

export function catmullRomClosed(points: Point[]): string {
  const count = points.length;
  if (count < 3) return "";
  const format = (point: Point) => `${point[0].toFixed(2)} ${point[1].toFixed(2)}`;
  let path = `M ${format(points[0])}`;
  for (let index = 0; index < count; index += 1) {
    const p0 = points[(index - 1 + count) % count];
    const p1 = points[index];
    const p2 = points[(index + 1) % count];
    const p3 = points[(index + 2) % count];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    path += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${format(p2)}`;
  }
  return `${path} Z`;
}

export function mirrorOutline(left: Point[], centerX = 100): Point[] {
  const crown = left[0];
  const crotch = left[left.length - 1];
  const side = left.slice(1, -1);
  const right = [...side].reverse().map(([x, y]) => [centerX * 2 - x, y] as Point);
  return [crown, ...side, crotch, ...right];
}

export const torsoPath = catmullRomClosed(mirrorOutline(OUTLINE_LEFT));

export function isNearBody(xPercent: number, yPercent: number): boolean {
  return xPercent >= 12 && xPercent <= 88 && yPercent >= 2 && yPercent <= 98;
}
