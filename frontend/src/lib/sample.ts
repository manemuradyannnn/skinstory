import sampleAnnotations from "../data/sampleAnnotations.json"
import type { AnalysisResult, Detection } from "../types"

export const SAMPLE_URL = "/samples/fluorescence-nuclei.png"
export const SAMPLE_FILE_NAME = sampleAnnotations.fileName
export const SAMPLE_NOTE = sampleAnnotations.note

export function sampleMatches(width: number, height: number): boolean {
  return width === sampleAnnotations.width && height === sampleAnnotations.height
}

export function sampleResult(): AnalysisResult {
  return {
    analysisId: crypto.randomUUID(),
    mode: "demo",
    createdAt: new Date().toISOString(),
    durationMs: 0,
    warning: null,
    model: {
      name: "Sample fixture",
      version: "synthetic-v1",
      domain: "Synthetic 2D fluorescence nuclei drawn for this prototype",
      weights: "none",
      license: "Generated for CellScope. Not a pretrained model.",
      probabilityThreshold: null,
      nmsThreshold: null,
    },
    settings: {
      normalization: "Not applicable. These annotations were not produced by inference.",
      channel: "Grayscale synthetic field",
      probabilityThreshold: null,
      nmsThreshold: null,
      tiles: [],
    },
    image: { width: sampleAnnotations.width, height: sampleAnnotations.height },
    detections: sampleAnnotations.detections as Detection[],
  }
}
