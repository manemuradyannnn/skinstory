import { describe, expect, it } from "vitest"
import type { AnalysisResult, ReviewCounts } from "../types"
import { buildExportDocument, exportRows, toCsv } from "./exportData"
import { includedDetections } from "./review"

const result = {
  analysisId: "a",
  mode: "live",
  createdAt: "2026-10-12T00:00:00Z",
  durationMs: 12,
  warning: null,
  model: {
    name: "StarDist 2D_versatile_fluo",
    version: "0.9.2",
    domain: "fluorescence",
    weights: "pretrained",
    license: "BSD-3-Clause",
    probabilityThreshold: 0.4,
    nmsThreshold: 0.3,
  },
  settings: { normalization: "percentiles", channel: "luminance", probabilityThreshold: 0.4, nmsThreshold: 0.3, tiles: [1, 1] },
  image: { width: 10, height: 10 },
  detections: [
    { id: "d-001", source: "model", centerX: 1.26, centerY: 2, bbox: { x: 0, y: 0, width: 2, height: 2 }, polygon: null, objectProbability: 0.91 },
    { id: "d-002", source: "model", centerX: 4, centerY: 4, bbox: null, polygon: null, objectProbability: 0.2 },
  ],
} satisfies AnalysisResult

describe("export", () => {
  it("keeps the reviewed set and quotes awkward ids", () => {
    const edit = { removedIds: [] as string[], additions: [], status: "reviewed" as const }
    const included = includedDetections(result, edit, 0.5)
    const rows = exportRows(included, edit.status)
    expect(rows.map((row) => row.id)).toEqual(["d-001"])
    const csv = toCsv([{ ...rows[0], id: "a,b" }])
    expect(csv).toContain('"a,b"')
    const counts: ReviewCounts = { original: 2, additions: 0, removals: 0, hidden: 1, current: 1 }
    const document = buildExportDocument({ filename: "field.png", result, edit, threshold: 0.5, included, counts })
    expect(document.counts.original).toBe(2)
    expect(document.counts.finalReviewed).toBe(1)
    expect(document.exportedDetections).toHaveLength(1)
    expect(document.scoreFilter.applied).toBe(true)
  })
})
