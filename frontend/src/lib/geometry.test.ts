import { describe, expect, it } from "vitest"
import type { Detection } from "../types"
import { clientToImage, hitTest, polygonArea, zoomAt } from "./geometry"

describe("zoom", () => {
  it("keeps the image point under the cursor fixed", () => {
    const view = { scale: 1, x: 12, y: -4 }
    const anchor = { x: 180, y: 90 }
    const before = clientToImage(view, anchor.x, anchor.y)
    const next = zoomAt(view, anchor.x, anchor.y, 2.4, 0.05, 24)
    const after = clientToImage(next, anchor.x, anchor.y)
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })
})

describe("hit testing", () => {
  const left = detection("a", 0, 0)
  const right = detection("b", 10, 0)

  it("picks the nearer centre when both are inside the click tolerance", () => {
    expect(hitTest([left, right], 4, 0, 1)?.id).toBe("a")
    expect(hitTest([left, right], 7, 0, 1)?.id).toBe("b")
  })

  it("can separate close centres after zooming in", () => {
    expect(hitTest([left, right], 0.4, 0, 8)?.id).toBe("a")
    expect(hitTest([left, right], 6, 0, 8)).toBeNull()
  })
})

describe("polygon area", () => {
  it("measures a unit square", () => {
    expect(polygonArea([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }, { x: 0, y: 2 }])).toBe(4)
  })
})

function detection(id: string, x: number, y: number): Detection {
  return { id, source: "model", centerX: x, centerY: y, bbox: null, polygon: null, objectProbability: 0.9 }
}
