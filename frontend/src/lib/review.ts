import type { AnalysisResult, Detection, DisplayMode, ReviewCounts, ReviewEdit } from "../types"

const SCORE_EPSILON = 1e-4

export function pristineEdit(): ReviewEdit {
  return { removedIds: [], additions: [], status: "unreviewed" }
}

export function cloneEdit(edit: ReviewEdit): ReviewEdit {
  return {
    removedIds: [...edit.removedIds],
    additions: edit.additions.map((detection) => ({ ...detection })),
    status: edit.status,
  }
}

export function editsEqual(a: ReviewEdit, b: ReviewEdit): boolean {
  if (a.status !== b.status || a.removedIds.length !== b.removedIds.length || a.additions.length !== b.additions.length) {
    return false
  }
  if (a.removedIds.some((id, index) => id !== b.removedIds[index])) return false
  return a.additions.every((detection, index) => detection.id === b.additions[index]?.id)
}

export function isIncluded(detection: Detection, removed: Set<string>, threshold: number | null): boolean {
  if (removed.has(detection.id)) return false
  if (detection.source === "manual") return true
  if (threshold == null || detection.objectProbability == null) return true
  return detection.objectProbability >= threshold - SCORE_EPSILON
}

export function includedDetections(result: AnalysisResult, edit: ReviewEdit, threshold: number | null): Detection[] {
  const removed = new Set(edit.removedIds)
  const originals = result.detections.filter((detection) => isIncluded(detection, removed, threshold))
  return [...originals, ...edit.additions]
}

export function reviewCounts(result: AnalysisResult, edit: ReviewEdit, threshold: number | null): ReviewCounts {
  const removed = new Set(edit.removedIds)
  const hidden = result.detections.filter((detection) => {
    if (removed.has(detection.id)) return false
    if (threshold == null || detection.objectProbability == null) return false
    return detection.objectProbability < threshold - SCORE_EPSILON
  }).length
  return {
    original: result.detections.length,
    additions: edit.additions.length,
    removals: edit.removedIds.length,
    hidden,
    current: includedDetections(result, edit, threshold).length,
  }
}

export function applyAdd(edit: ReviewEdit, detection: Detection): ReviewEdit {
  return {
    removedIds: [...edit.removedIds],
    additions: [...edit.additions, detection],
    status: "unreviewed",
  }
}

export function applyRemove(result: AnalysisResult, edit: ReviewEdit, id: string): ReviewEdit {
  if (edit.additions.some((detection) => detection.id === id)) {
    return {
      removedIds: [...edit.removedIds],
      additions: edit.additions.filter((detection) => detection.id !== id),
      status: "unreviewed",
    }
  }
  if (result.detections.some((detection) => detection.id === id) && !edit.removedIds.includes(id)) {
    return {
      removedIds: [...edit.removedIds, id],
      additions: [...edit.additions],
      status: "unreviewed",
    }
  }
  return edit
}

export function applyReviewed(edit: ReviewEdit): ReviewEdit {
  return { removedIds: [...edit.removedIds], additions: [...edit.additions], status: "reviewed" }
}

export function findDetection(result: AnalysisResult, edit: ReviewEdit, id: string | null): Detection | null {
  if (!id) return null
  return edit.additions.find((detection) => detection.id === id) ?? result.detections.find((detection) => detection.id === id) ?? null
}

export function availableModes(detections: Detection[]): DisplayMode[] {
  const modes: DisplayMode[] = ["centres"]
  if (detections.some((detection) => detection.bbox)) modes.push("boxes")
  if (detections.some((detection) => detection.polygon && detection.polygon.length > 2)) modes.push("boundaries")
  return modes
}

export function defaultDisplayMode(detections: Detection[]): DisplayMode {
  const modes = availableModes(detections)
  if (modes.includes("boundaries")) return "boundaries"
  if (modes.includes("boxes")) return "boxes"
  return "centres"
}

export function initialThreshold(result: AnalysisResult): number | null {
  const scores = result.detections
    .map((detection) => detection.objectProbability)
    .filter((score): score is number => score != null)
  if (!scores.length) return null
  return result.model.probabilityThreshold ?? Math.min(...scores)
}

export function sourceLabel(source: Detection["source"], mode: AnalysisResult["mode"]): string {
  if (source === "manual") return "Manual"
  if (source === "sample" || mode === "demo") return "Sample"
  return "Model"
}
