import { describe, expect, it } from "vitest";
import { torsoPath } from "./bodyGeometry";
import { nearestRegionId, regionPercent, REGIONS } from "./regions";

describe("body regions", () => {
  it("keeps unique ids and anchors on the figure", () => {
    const ids = REGIONS.map((region) => region.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const region of REGIONS) {
      const point = regionPercent(region);
      expect(point.x).toBeGreaterThan(0);
      expect(point.x).toBeLessThan(100);
      expect(point.y).toBeGreaterThan(0);
      expect(point.y).toBeLessThan(100);
      expect(nearestRegionId(region.view, point.x, point.y)).toBe(region.id);
    }
  });

  it("draws closed outlines", () => {
    for (const path of [torsoPath]) {
      expect(path.startsWith("M ")).toBe(true);
      expect(path.endsWith(" Z")).toBe(true);
      expect(path).not.toContain("NaN");
    }
  });
});
