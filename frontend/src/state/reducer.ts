import type { AnalysisResult, Check, DisplayMode, ReviewEdit, Tool } from "../types"
import {
  applyAdd,
  applyRemove,
  applyReviewed,
  cloneEdit,
  defaultDisplayMode,
  editsEqual,
  initialThreshold,
  pristineEdit,
} from "../lib/review"

export type Phase = "empty" | "ready" | "running" | "results"

export type WorkspaceState = {
  filename: string
  objectUrl: string | null
  blob: Blob | null
  width: number
  height: number
  bytes: number
  isSample: boolean
  checks: Check[]
  imageOk: boolean
  needsAcknowledgement: boolean
  acknowledged: boolean
  phase: Phase
  error: string | null
  notice: string | null
  runStage: "upload" | "inference" | null
  uploadProgress: number
  result: AnalysisResult | null
  edit: ReviewEdit
  past: ReviewEdit[]
  future: ReviewEdit[]
  threshold: number | null
  selectedId: string | null
  tool: Tool
  showOverlay: boolean
  displayMode: DisplayMode
}

export const initialState: WorkspaceState = {
  filename: "",
  objectUrl: null,
  blob: null,
  width: 0,
  height: 0,
  bytes: 0,
  isSample: false,
  checks: [],
  imageOk: false,
  needsAcknowledgement: false,
  acknowledged: false,
  phase: "empty",
  error: null,
  notice: null,
  runStage: null,
  uploadProgress: 0,
  result: null,
  edit: pristineEdit(),
  past: [],
  future: [],
  threshold: null,
  selectedId: null,
  tool: "pan",
  showOverlay: true,
  displayMode: "boundaries",
}

type ReadyPayload = {
  url: string
  file: Blob
  filename: string
  bytes: number
  isSample: boolean
  width: number
  height: number
  checks: Check[]
  ok: boolean
  needsAcknowledgement: boolean
}

export type Action =
  | { type: "reject-file"; message: string }
  | ({ type: "image-ready" } & ReadyPayload)
  | { type: "acknowledge"; value: boolean }
  | { type: "start-run" }
  | { type: "upload-progress"; value: number }
  | { type: "set-result"; result: AnalysisResult }
  | { type: "run-error"; message: string }
  | { type: "add"; detection: import("../types").Detection }
  | { type: "remove"; id: string }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "mark-reviewed" }
  | { type: "reset-edits" }
  | { type: "select"; id: string | null }
  | { type: "set-tool"; tool: Tool }
  | { type: "set-overlay"; value: boolean }
  | { type: "set-display"; mode: DisplayMode }
  | { type: "set-threshold"; value: number }
  | {
      type: "hydrate"
      url: string
      blob: Blob
      filename: string
      bytes: number
      isSample: boolean
      width: number
      height: number
      result: AnalysisResult
      edit: ReviewEdit
      threshold: number | null
      displayMode: DisplayMode
    }

function selectionStillThere(state: WorkspaceState, edit: ReviewEdit, selectedId: string | null): string | null {
  if (!selectedId || !state.result) return null
  if (edit.additions.some((detection) => detection.id === selectedId)) return selectedId
  if (state.result.detections.some((detection) => detection.id === selectedId) && !edit.removedIds.includes(selectedId)) {
    return selectedId
  }
  return null
}

function withHistory(state: WorkspaceState, edit: ReviewEdit, selectedId: string | null): WorkspaceState {
  if (editsEqual(state.edit, edit)) return state
  return {
    ...state,
    past: [...state.past, cloneEdit(state.edit)].slice(-100),
    future: [],
    edit,
    selectedId,
  }
}

export function workspaceReducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case "reject-file":
      return { ...state, error: action.message }
    case "image-ready":
      return {
        ...initialState,
        filename: action.filename,
        objectUrl: action.url,
        blob: action.file,
        width: action.width,
        height: action.height,
        bytes: action.bytes,
        isSample: action.isSample,
        checks: action.checks,
        imageOk: action.ok,
        needsAcknowledgement: action.needsAcknowledgement,
        phase: "ready",
      }
    case "acknowledge":
      return { ...state, acknowledged: action.value }
    case "start-run":
      if (!state.imageOk || state.phase === "running") return state
      return { ...state, phase: "running", error: null, runStage: "upload", uploadProgress: 0 }
    case "upload-progress":
      return {
        ...state,
        uploadProgress: action.value,
        runStage: action.value >= 1 ? "inference" : "upload",
      }
    case "set-result":
      return {
        ...state,
        phase: "results",
        error: null,
        notice: action.result.warning,
        runStage: null,
        uploadProgress: 0,
        result: action.result,
        edit: pristineEdit(),
        past: [],
        future: [],
        threshold: initialThreshold(action.result),
        selectedId: null,
        tool: "select",
        showOverlay: true,
        displayMode: defaultDisplayMode(action.result.detections),
      }
    case "run-error":
      return {
        ...state,
        phase: state.result ? "results" : "ready",
        error: action.message,
        runStage: null,
        uploadProgress: 0,
      }
    case "add":
      if (!state.result) return state
      return withHistory(state, applyAdd(state.edit, action.detection), action.detection.id)
    case "remove":
      if (!state.result) return state
      return withHistory(state, applyRemove(state.result, state.edit, action.id), null)
    case "undo": {
      const previous = state.past[state.past.length - 1]
      if (!previous) return state
      return {
        ...state,
        past: state.past.slice(0, -1),
        future: [cloneEdit(state.edit), ...state.future],
        edit: previous,
        selectedId: selectionStillThere(state, previous, state.selectedId),
      }
    }
    case "redo": {
      const next = state.future[0]
      if (!next) return state
      return {
        ...state,
        past: [...state.past, cloneEdit(state.edit)].slice(-100),
        future: state.future.slice(1),
        edit: next,
        selectedId: selectionStillThere(state, next, state.selectedId),
      }
    }
    case "mark-reviewed":
      if (state.edit.status === "reviewed") return state
      return withHistory(state, applyReviewed(state.edit), state.selectedId)
    case "reset-edits":
      return withHistory(state, pristineEdit(), null)
    case "select":
      return { ...state, selectedId: action.id }
    case "set-tool":
      return { ...state, tool: action.tool }
    case "set-overlay":
      return { ...state, showOverlay: action.value }
    case "set-display":
      return { ...state, displayMode: action.mode }
    case "set-threshold":
      return { ...state, threshold: action.value }
    case "hydrate":
      return {
        ...initialState,
        filename: action.filename,
        objectUrl: action.url,
        blob: action.blob,
        width: action.width,
        height: action.height,
        bytes: action.bytes,
        isSample: action.isSample,
        imageOk: true,
        acknowledged: true,
        phase: "results",
        notice: action.result.warning,
        result: action.result,
        edit: cloneEdit(action.edit),
        threshold: action.threshold,
        displayMode: action.displayMode,
        tool: "select",
      }
    default:
      return state
  }
}
