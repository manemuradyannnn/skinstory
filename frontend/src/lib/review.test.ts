import { describe, expect, it } from "vitest"
import type { AnalysisResult, Detection } from "../types"
import { applyAdd, applyRemove, includedDetections, reviewCounts } from "./review"
import { workspaceReducer, initialState } from "../state/reducer"

const result = {
  analysisId: "a",
  mode: "live",
  createdAt: "2026-10-12T00:00:00Z",
  durationMs: 10,
  warning: null,
  model: {
    name: "StarDist 2D_versatile_fluo",
    version: "0.9.2",
    domain: "fluorescence",
    weights: "pretrained",
    license: "BSD-3-Clause",
    probabilityThreshold: 0.5,
    nmsThreshold: 0.3,
  },
  settings: { normalization: "percentiles", channel: "luminance", probabilityThreshold: 0.5, nmsThreshold: 0.3, tiles: [1, 1] },
  image: { width: 100, height: 80 },
  detections: [det("d-001", "model", 0.9), det("d-002", "model", 0.4)],
} satisfies AnalysisResult

describe("review counts", () => {
  it("hides model detections below the cutoff and keeps manual additions", () => {
    const edit = applyAdd({ removedIds: [], additions: [], status: "reviewed" }, det("m-1", "manual", null))
    const counts = reviewCounts(result, edit, 0.5)
    expect(counts.original).toBe(2)
    expect(counts.hidden).toBe(1)
    expect(counts.additions).toBe(1)
    expect(counts.current).toBe(2)
    expect(edit.status).toBe("unreviewed")
    expect(includedDetections(result, edit, 0.5).map((detection) => detection.id)).toEqual(["d-001", "m-1"])
  })

  it("removes a model detection without deleting a manual one", () => {
    const removed = applyRemove(result, { removedIds: [], additions: [], status: "unreviewed" }, "d-001")
    expect(removed.removedIds).toEqual(["d-001"])
    const manual = applyRemove(result, { removedIds: [], additions: [det("m-1", "manual", null)], status: "unreviewed" }, "m-1")
    expect(manual.additions).toEqual([])
  })
})

describe("undo", () => {
  it("restores a removal and the previous review status", () => {
    let state = workspaceReducer(initialState, { type: "set-result", result })
    state = workspaceReducer(state, { type: "mark-reviewed" })
    state = workspaceReducer(state, { type: "remove", id: "d-001" })
    expect(state.edit.status).toBe("unreviewed")
    expect(state.edit.removedIds).toEqual(["d-001"])
    state = workspaceReducer(state, { type: "undo" })
    expect(state.edit.removedIds).toEqual([])
    expect(state.edit.status).toBe("reviewed")
    state = workspaceReducer(state, { type: "redo" })
    expect(state.edit.removedIds).toEqual(["d-001"])
  })
})

function det(id: string, source: Detection["source"], score: number | null): Detection {
  return { id, source, centerX: 1, centerY: 2, bbox: null, polygon: null, objectProbability: score }
}
