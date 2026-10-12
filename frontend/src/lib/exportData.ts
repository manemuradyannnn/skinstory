import type { AnalysisResult, Detection, ReviewCounts, ReviewEdit } from "../types"
import { round2 } from "./format"

export type ExportRow = {
  id: string
  source: Detection["source"]
  center_x: number
  center_y: number
  bbox_x: number | ""
  bbox_y: number | ""
  bbox_width: number | ""
  bbox_height: number | ""
  object_probability: number | ""
  review_status: ReviewEdit["status"]
}

const COLUMNS: Array<keyof ExportRow> = [
  "id",
  "source",
  "center_x",
  "center_y",
  "bbox_x",
  "bbox_y",
  "bbox_width",
  "bbox_height",
  "object_probability",
  "review_status",
]

export function exportRows(detections: Detection[], status: ReviewEdit["status"]): ExportRow[] {
  return detections.map((detection) => ({
    id: detection.id,
    source: detection.source,
    center_x: round2(detection.centerX),
    center_y: round2(detection.centerY),
    bbox_x: detection.bbox ? round2(detection.bbox.x) : "",
    bbox_y: detection.bbox ? round2(detection.bbox.y) : "",
    bbox_width: detection.bbox ? round2(detection.bbox.width) : "",
    bbox_height: detection.bbox ? round2(detection.bbox.height) : "",
    object_probability: detection.objectProbability ?? "",
    review_status: status,
  }))
}

function csvCell(value: string | number): string {
  const text = String(value)
  if (/[",\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`
  return text
}

export function toCsv(rows: ExportRow[]): string {
  const lines = [COLUMNS.join(",")]
  for (const row of rows) lines.push(COLUMNS.map((column) => csvCell(row[column])).join(","))
  return `${lines.join("\n")}\n`
}

export function scoreFilterNote(threshold: number | null): { applied: boolean; minimumObjectProbability: number | null; note: string } {
  if (threshold == null) {
    return {
      applied: false,
      minimumObjectProbability: null,
      note: "No model object probabilities are available, so every detection that was not removed is included. Manual additions are included.",
    }
  }
  return {
    applied: true,
    minimumObjectProbability: threshold,
    note: "Model and sample detections below this object probability are excluded. Manual additions are included. Removals are excluded.",
  }
}

export function buildExportDocument(input: {
  filename: string
  result: AnalysisResult
  edit: ReviewEdit
  threshold: number | null
  included: Detection[]
  counts: ReviewCounts
}) {
  return {
    product: "CellScope",
    prototype: true,
    clinicallyValidated: false,
    exportedAt: new Date().toISOString(),
    image: {
      filename: input.filename,
      width: input.result.image.width,
      height: input.result.image.height,
    },
    coordinateSpace: "Original image pixels, origin at the top left. No spatial calibration is stored.",
    reviewStatus: input.edit.status,
    counts: {
      original: input.counts.original,
      manualAdditions: input.counts.additions,
      removals: input.counts.removals,
      hiddenByScore: input.counts.hidden,
      finalReviewed: input.counts.current,
    },
    scoreFilter: scoreFilterNote(input.threshold),
    mode: input.result.mode,
    model: input.result.model,
    inferenceSettings: input.result.settings,
    warning: input.result.warning,
    originalDetections: input.result.detections,
    manualCorrections: {
      added: input.edit.additions,
      removedIds: input.edit.removedIds,
    },
    exportedDetections: input.included,
  }
}
