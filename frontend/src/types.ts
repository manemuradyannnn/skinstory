export type DetectionSource = "model" | "manual" | "sample"

export type Point = { x: number; y: number }

export type BBox = { x: number; y: number; width: number; height: number }

export type Detection = {
  id: string
  source: DetectionSource
  centerX: number
  centerY: number
  bbox: BBox | null
  polygon: Point[] | null
  objectProbability: number | null
}

export type ModelInfo = {
  name: string
  version: string
  domain: string
  weights: string
  license: string
  probabilityThreshold: number | null
  nmsThreshold: number | null
}

export type AnalysisResult = {
  analysisId: string
  mode: "live" | "demo"
  createdAt: string
  durationMs: number
  warning: string | null
  model: ModelInfo
  settings: {
    normalization: string
    channel: string
    probabilityThreshold: number | null
    nmsThreshold: number | null
    tiles: number[]
  }
  image: { width: number; height: number }
  detections: Detection[]
}

export type ReviewStatus = "unreviewed" | "reviewed"

export type ReviewEdit = {
  removedIds: string[]
  additions: Detection[]
  status: ReviewStatus
}

export type Tool = "pan" | "select" | "add"
export type DisplayMode = "centres" | "boxes" | "boundaries"

export type CheckState = "pass" | "warn" | "fail"

export type Check = {
  id: string
  label: string
  state: CheckState
  detail: string
}

export type ReviewCounts = {
  original: number
  additions: number
  removals: number
  hidden: number
  current: number
}

export type EvaluationReport = {
  dataset: {
    name: string
    version: string
    split: string
    imageCount: number
    seed: number
    description: string
  }
  model: {
    name: string
    version: string
    domain: string
    weights: string
    probabilityThreshold: number | null
    nmsThreshold: number | null
    normalization: string
  }
  matching: {
    method: string
    criterion: string
    threshold: number
    description: string
  }
  detection: {
    precision: number | null
    recall: number | null
    f1: number | null
    truePositives: number
    falsePositives: number
    falseNegatives: number
  }
  counting: {
    meanAbsoluteError: number
    description: string
    perImage: Array<{
      id: string
      groundTruth: number
      predicted: number
      absoluteError: number
      truePositives: number
      falsePositives: number
      falseNegatives: number
    }>
  }
  examples: Array<{
    id: string
    groundTruthCount: number
    predictedCount: number
    inputUrl: string
    groundTruthUrl: string
    predictionUrl: string
  }>
  generatedAt: string
  runtimeSeconds: number
  limitation: string
}
