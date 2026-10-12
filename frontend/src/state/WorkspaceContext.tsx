import { createContext, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from "react"
import { postAnalysis } from "../lib/api"
import { inspectFile } from "../lib/files"
import { round2 } from "../lib/format"
import { availableModes, includedDetections, reviewCounts } from "../lib/review"
import { SAMPLE_FILE_NAME, SAMPLE_URL, sampleMatches, sampleResult } from "../lib/sample"
import { saveAnalysis, type StoredAnalysis } from "../lib/storage"
import type { Detection } from "../types"
import { initialState, workspaceReducer, type WorkspaceState } from "./reducer"

type WorkspaceApi = {
  state: WorkspaceState
  counts: ReturnType<typeof reviewCounts> | null
  included: Detection[]
  modes: ReturnType<typeof availableModes>
  saveWarning: string | null
  loadFile: (file: File, isSample?: boolean) => Promise<void>
  loadSample: () => Promise<void>
  acknowledge: (value: boolean) => void
  runAnalysis: () => Promise<void>
  useSampleAnnotations: () => void
  setTool: (tool: WorkspaceState["tool"]) => void
  setShowOverlay: (value: boolean) => void
  setDisplayMode: (mode: WorkspaceState["displayMode"]) => void
  setThreshold: (value: number) => void
  select: (id: string | null) => void
  addAt: (x: number, y: number) => void
  removeSelected: () => void
  undo: () => void
  redo: () => void
  resetEdits: () => void
  markReviewed: () => void
  loadStored: (record: StoredAnalysis) => void
}

const WorkspaceContext = createContext<WorkspaceApi | null>(null)

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workspaceReducer, initialState)
  const [saveWarning, setSaveWarning] = useState<string | null>(null)
  const runToken = useRef(0)
  const urlRef = useRef<string | null>(null)

  const included = useMemo(
    () => (state.result ? includedDetections(state.result, state.edit, state.threshold) : []),
    [state.result, state.edit, state.threshold],
  )
  const counts = useMemo(
    () => (state.result ? reviewCounts(state.result, state.edit, state.threshold) : null),
    [state.result, state.edit, state.threshold],
  )
  const modes = useMemo(() => availableModes(state.result?.detections ?? []), [state.result])

  useEffect(() => {
    if (!state.result || !state.blob) return
    const record: StoredAnalysis = {
      id: state.result.analysisId,
      filename: state.filename,
      createdAt: state.result.createdAt,
      updatedAt: new Date().toISOString(),
      width: state.width,
      height: state.height,
      byteSize: state.bytes,
      isSample: state.isSample,
      imageBlob: state.blob,
      result: state.result,
      edit: state.edit,
      confidenceThreshold: state.threshold,
      displayMode: state.displayMode,
    }
    const timer = window.setTimeout(() => {
      saveAnalysis(record)
        .then(() => setSaveWarning(null))
        .catch(() => setSaveWarning("Could not save this analysis in the browser."))
    }, 250)
    return () => window.clearTimeout(timer)
  }, [state.result, state.edit, state.threshold, state.displayMode, state.blob, state.filename, state.width, state.height, state.bytes, state.isSample])

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  async function loadFile(file: File, isSample = false) {
    runToken.current += 1
    const inspected = await inspectFile(file)
    if (inspected.status === "rejected") {
      dispatch({ type: "reject-file", message: inspected.message })
      return
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const url = URL.createObjectURL(file)
    urlRef.current = url
    dispatch({
      type: "image-ready",
      url,
      file,
      filename: file.name,
      bytes: file.size,
      isSample,
      width: inspected.width,
      height: inspected.height,
      checks: inspected.checks,
      ok: inspected.ok,
      needsAcknowledgement: inspected.needsAcknowledgement,
    })
  }

  async function loadSample() {
    const response = await fetch(SAMPLE_URL)
    if (!response.ok) {
      dispatch({ type: "reject-file", message: "The sample image could not be loaded." })
      return
    }
    const blob = await response.blob()
    const file = new File([blob], SAMPLE_FILE_NAME, { type: "image/png" })
    await loadFile(file, true)
  }

  async function runAnalysis() {
    if (!state.blob || !state.imageOk || state.phase === "running") return
    if (state.needsAcknowledgement && !state.acknowledged) return
    const token = ++runToken.current
    const blob = state.blob
    const filename = state.filename
    const width = state.width
    const height = state.height
    dispatch({ type: "start-run" })
    try {
      const result = await postAnalysis(blob, filename, (value) => {
        if (token === runToken.current) dispatch({ type: "upload-progress", value })
      })
      if (token !== runToken.current) return
      if (result.image.width !== width || result.image.height !== height) {
        dispatch({
          type: "run-error",
          message: `The service read this image as ${result.image.width}×${result.image.height}, but the preview is ${width}×${height}. Overlays were not applied.`,
        })
        return
      }
      dispatch({ type: "set-result", result })
    } catch (error) {
      if (token !== runToken.current) return
      dispatch({
        type: "run-error",
        message: error instanceof Error ? error.message : "Analysis failed. The image is still loaded.",
      })
    }
  }

  function useSampleAnnotations() {
    if (!state.isSample || !sampleMatches(state.width, state.height)) {
      dispatch({ type: "reject-file", message: "Sample annotations only apply to the built-in demonstration image." })
      return
    }
    dispatch({ type: "set-result", result: sampleResult() })
  }

  function addAt(x: number, y: number) {
    if (!state.result || x < 0 || y < 0 || x >= state.width || y >= state.height) return
    const detection: Detection = {
      id: `m-${crypto.randomUUID().slice(0, 8)}`,
      source: "manual",
      centerX: round2(x),
      centerY: round2(y),
      bbox: null,
      polygon: null,
      objectProbability: null,
    }
    dispatch({ type: "add", detection })
  }

  function loadStored(record: StoredAnalysis) {
    runToken.current += 1
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    const url = URL.createObjectURL(record.imageBlob)
    urlRef.current = url
    dispatch({
      type: "hydrate",
      url,
      blob: record.imageBlob,
      filename: record.filename,
      bytes: record.byteSize,
      isSample: record.isSample,
      width: record.width,
      height: record.height,
      result: record.result,
      edit: record.edit,
      threshold: record.confidenceThreshold,
      displayMode: record.displayMode,
    })
  }

  const api: WorkspaceApi = {
    state,
    counts,
    included,
    modes,
    saveWarning,
    loadFile,
    loadSample,
    acknowledge: (value) => dispatch({ type: "acknowledge", value }),
    runAnalysis,
    useSampleAnnotations,
    setTool: (tool) => dispatch({ type: "set-tool", tool }),
    setShowOverlay: (value) => dispatch({ type: "set-overlay", value }),
    setDisplayMode: (mode) => dispatch({ type: "set-display", mode }),
    setThreshold: (value) => dispatch({ type: "set-threshold", value }),
    select: (id) => dispatch({ type: "select", id }),
    addAt,
    removeSelected: () => {
      if (state.selectedId) dispatch({ type: "remove", id: state.selectedId })
    },
    undo: () => dispatch({ type: "undo" }),
    redo: () => dispatch({ type: "redo" }),
    resetEdits: () => dispatch({ type: "reset-edits" }),
    markReviewed: () => dispatch({ type: "mark-reviewed" }),
    loadStored,
  }

  return <WorkspaceContext.Provider value={api}>{children}</WorkspaceContext.Provider>
}

export function useWorkspace(): WorkspaceApi {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error("useWorkspace must be used inside WorkspaceProvider")
  return value
}
