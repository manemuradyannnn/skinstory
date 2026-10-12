import { useEffect, useRef, useState } from "react"
import { annotatedPngBlob } from "../lib/annotate"
import { buildExportDocument, exportRows, scoreFilterNote, toCsv } from "../lib/exportData"
import { downloadBlob, downloadText } from "../lib/download"
import { fileStem, formatBytes } from "../lib/format"
import { Dialog } from "../components/Dialogs"
import { InspectionPanel } from "../components/InspectionPanel"
import { Button, Pill } from "../components/ui"
import { Viewer, type ViewerHandle } from "../components/Viewer"
import { useWorkspace } from "../state/WorkspaceContext"

export function WorkspacePage() {
  const workspace = useWorkspace()
  const { state, counts, included } = workspace
  const inputRef = useRef<HTMLInputElement>(null)
  const viewerRef = useRef<ViewerHandle>(null)
  const [dragging, setDragging] = useState(false)
  const [spacePan, setSpacePan] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const wide = useMinWidth(1100)
  const dialogOpen = exportOpen || shortcutsOpen || pendingFile != null

  useEffect(() => {
    if (state.filename && !state.imageOk) setDetailsOpen(true)
  }, [state.filename, state.imageOk])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (dialogOpen) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest("input, textarea, select, button, a")) {
        if (event.code === "Space") return
      }
      if (event.code === "Space") {
        event.preventDefault()
        setSpacePan(true)
        return
      }
      if (isTyping(event.target)) return
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === "z") {
        event.preventDefault()
        if (event.shiftKey) workspace.redo()
        else workspace.undo()
        return
      }
      if ((event.metaKey || event.ctrlKey) && key === "y") {
        event.preventDefault()
        workspace.redo()
        return
      }
      if (key === "+" || key === "=") {
        event.preventDefault()
        viewerRef.current?.zoomIn()
      } else if (key === "-" || key === "_") {
        event.preventDefault()
        viewerRef.current?.zoomOut()
      } else if (key === "0") {
        viewerRef.current?.fit()
      } else if (key === "1") workspace.setTool("pan")
      else if (key === "2" && state.result) workspace.setTool("select")
      else if (key === "3" && state.result) workspace.setTool("add")
      else if ((key === "delete" || key === "backspace") && state.selectedId) {
        event.preventDefault()
        workspace.removeSelected()
      } else if (key === "?") setShortcutsOpen(true)
    }
    function onKeyUp(event: KeyboardEvent) {
      if (event.code === "Space") setSpacePan(false)
    }
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
    }
  }, [dialogOpen, state.result, state.selectedId, workspace])

  function requestFile(file: File | undefined) {
    if (!file || state.phase === "running") return
    if (state.result) setPendingFile(file)
    else void workspace.loadFile(file)
  }

  const tone = state.error ? "danger" : state.result?.mode === "demo" ? "demo" : state.result?.mode === "live" ? "live" : "neutral"
  const status = !state.filename
    ? "No image"
    : state.phase === "running"
      ? "Analysing"
      : state.result?.mode === "demo"
        ? "Sample annotations"
        : state.result?.mode === "live"
          ? "Model result"
          : state.error
            ? "Needs attention"
            : "Not analysed"

  const live = state.error
    ? state.error
    : state.phase === "running"
      ? state.runStage === "inference"
        ? "Running analysis"
        : `Uploading ${Math.round(state.uploadProgress * 100)} percent`
      : counts
        ? `${counts.current} detections in the current review`
        : state.filename
          ? `${state.filename} loaded`
          : "No image loaded"

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex min-h-12 items-center gap-2 border-b border-line bg-panel px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="min-w-0 truncate text-sm font-medium">{state.filename || "Workspace"}</h1>
            <Pill tone={tone}>{status}</Pill>
          </div>
          {state.filename && (
            <p className="truncate text-xs text-muted">
              {state.width}×{state.height} px · {formatBytes(state.bytes)}
              {counts ? ` · ${counts.current} current` : ""}
            </p>
          )}
        </div>
        <Button variant="quiet" className="hidden sm:inline-flex" onClick={() => setShortcutsOpen(true)}>
          Shortcuts
        </Button>
        {state.filename && (
          <Button variant="quiet" onClick={() => inputRef.current?.click()} disabled={state.phase === "running"}>
            Replace
          </Button>
        )}
        {!wide && (state.filename || state.error) && (
          <Button onClick={() => setDetailsOpen(true)}>
            Details
          </Button>
        )}
        <Button variant="primary" onClick={() => setExportOpen(true)} disabled={!state.result}>
          Export
        </Button>
      </header>
      <div className="sr-only" aria-live="polite">
        {live}
      </div>
      <div className="flex min-h-0 flex-1">
        <div
          className="flex min-w-0 flex-1 flex-col"
          onDragOver={(event) => {
            event.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault()
            setDragging(false)
            requestFile(event.dataTransfer.files?.[0])
          }}
        >
          {state.objectUrl ? (
            <Viewer ref={viewerRef} spacePan={spacePan} />
          ) : (
            <EmptyState dragging={dragging} error={state.error} onBrowse={() => inputRef.current?.click()} onSample={() => void workspace.loadSample()} />
          )}
        </div>
        {wide && (
          <aside className="w-[320px] shrink-0 border-l border-line bg-panel">
            <InspectionPanel />
          </aside>
        )}
      </div>
      {state.objectUrl && (
        <div className={`flex gap-2 border-t border-line bg-panel p-2 ${wide ? "hidden" : ""}`}>
          <Button className="flex-1" onClick={() => setDetailsOpen(true)}>
            {state.phase === "results" ? "Results" : "Check image"}
          </Button>
          {state.phase !== "results" && (
            <Button
              className="flex-1"
              variant="primary"
              disabled={!state.imageOk || state.phase === "running" || (state.needsAcknowledgement && !state.acknowledged)}
              onClick={() => void workspace.runAnalysis()}
            >
              {state.phase === "running" ? "Analysing…" : "Run analysis"}
            </Button>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        className="sr-only"
        onChange={(event) => {
          requestFile(event.target.files?.[0])
          event.target.value = ""
        }}
      />
      {!wide && detailsOpen && (
        <div className="fixed inset-0 z-30">
          <button className="absolute inset-0 bg-[rgba(28,26,24,0.46)]" aria-label="Close details" onClick={() => setDetailsOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(100%,380px)] flex-col bg-panel shadow-[0_16px_40px_rgba(44,41,38,0.16)]">
            <header className="flex h-12 items-center justify-between border-b border-line px-3">
              <h2 className="text-sm font-medium">Inspection</h2>
              <Button variant="quiet" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </header>
            <div className="min-h-0 flex-1">
              <InspectionPanel />
            </div>
          </div>
        </div>
      )}
      {exportOpen && state.result && counts && (
        <ExportDialog
          error={exportError}
          onClose={() => {
            setExportOpen(false)
            setExportError(null)
          }}
          onPng={async () => {
            if (!state.objectUrl) return
            try {
              const blob = await annotatedPngBlob({
                imageUrl: state.objectUrl,
                width: state.width,
                height: state.height,
                detections: included,
                displayMode: state.displayMode,
              })
              downloadBlob(blob, `cellscope-${fileStem(state.filename)}-annotated.png`)
              setExportError(null)
            } catch (error) {
              setExportError(error instanceof Error ? error.message : "The annotated image could not be created.")
            }
          }}
          onCsv={() => {
            downloadText(toCsv(exportRows(included, state.edit.status)), `cellscope-${fileStem(state.filename)}-detections.csv`, "text/csv")
          }}
          onJson={() => {
            const document = buildExportDocument({
              filename: state.filename,
              result: state.result!,
              edit: state.edit,
              threshold: state.threshold,
              included,
              counts,
            })
            downloadText(JSON.stringify(document, null, 2), `cellscope-${fileStem(state.filename)}-review.json`, "application/json")
          }}
        />
      )}
      {shortcutsOpen && (
        <Dialog title="Shortcuts" onClose={() => setShortcutsOpen(false)}>
          <ul className="space-y-1 text-sm">
            <Shortcut keys="+ / −" label="Zoom" />
            <Shortcut keys="0" label="Fit to view" />
            <Shortcut keys="1 / 2 / 3" label="Pan, select, add" />
            <Shortcut keys="Space" label="Pan while held" />
            <Shortcut keys="Delete" label="Remove the selected detection" />
            <Shortcut keys="Ctrl Z" label="Undo" />
            <Shortcut keys="Ctrl Shift Z" label="Redo" />
          </ul>
        </Dialog>
      )}
      {pendingFile && (
        <Dialog title="Replace image" onClose={() => setPendingFile(null)}>
          <p className="text-sm leading-relaxed text-muted">
            The current review stays in Analyses. This workspace will switch to the new image.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button onClick={() => setPendingFile(null)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={() => {
                const file = pendingFile
                setPendingFile(null)
                void workspace.loadFile(file)
              }}
            >
              Replace
            </Button>
          </div>
        </Dialog>
      )}
    </div>
  )
}

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <li className="flex items-baseline justify-between gap-4">
      <span>{label}</span>
      <span className="font-mono text-xs text-muted">{keys}</span>
    </li>
  )
}

function EmptyState({
  dragging,
  error,
  onBrowse,
  onSample,
}: {
  dragging: boolean
  error: string | null
  onBrowse: () => void
  onSample: () => void
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 py-8 md:px-10">
      <div className="mx-auto max-w-xl">
        <h2 className="text-lg font-medium">Load a fluorescence field</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          CellScope reviews nuclei in one 2D fluorescence image of a nuclear marker. Histology and brightfield are different images, and this model is not for them.
        </p>
        {error && (
          <p className="mt-4 border border-[#e4cfcb] bg-[#faf4f2] px-3 py-2 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        <div className={`mt-6 border border-dashed px-6 py-10 text-center ${dragging ? "border-teal bg-teal-soft" : "border-[#cfc6ba] bg-panel"}`}>
          <p className="text-sm">Drop a PNG or JPEG here</p>
          <p className="mt-1 text-xs text-muted">Up to 20 MB. Each side from 64 to 4096 px.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="primary" onClick={onBrowse}>
              Browse
            </Button>
            <Button onClick={onSample}>Try sample image</Button>
          </div>
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Supported model: StarDist 2D_versatile_fluo, trained for fluorescence nuclear markers. TIFF is not accepted. This is a research prototype and is not clinically validated.
        </p>
      </div>
    </div>
  )
}

function ExportDialog({
  onClose,
  onPng,
  onCsv,
  onJson,
  error,
}: {
  onClose: () => void
  onPng: () => void
  onCsv: () => void
  onJson: () => void
  error: string | null
}) {
  const { state, counts, included } = useWorkspace()
  if (!state.result || !counts) return null
  const filter = scoreFilterNote(state.threshold)
  return (
    <Dialog title="Export review" onClose={onClose}>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        <dt className="text-muted">Original detections</dt>
        <dd className="text-right font-mono tabular-nums">{counts.original}</dd>
        <dt className="text-muted">Final reviewed count</dt>
        <dd className="text-right font-mono tabular-nums">{counts.current}</dd>
        <dt className="text-muted">Included in these files</dt>
        <dd className="text-right font-mono tabular-nums">{included.length}</dd>
      </dl>
      <p className="mt-3 text-sm leading-relaxed text-muted">{filter.note}</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        The annotated PNG uses the current display ({state.displayMode}). Teal marks are {state.result.mode === "demo" ? "sample" : "model"} detections. Amber crosses are manual additions. Coordinates are original image pixels.
      </p>
      {state.result.mode === "demo" && (
        <p className="mt-2 text-sm leading-relaxed text-muted">These files describe the sample fixture and your edits. They are not live inference.</p>
      )}
      {error && (
        <p className="mt-3 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" onClick={onPng}>
          Annotated PNG
        </Button>
        <Button onClick={onCsv}>CSV</Button>
        <Button onClick={onJson}>JSON</Button>
      </div>
    </Dialog>
  )
}

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && target.closest("input, textarea, select") != null
}

function useMinWidth(width: number): boolean {
  const query = `(min-width: ${width}px)`
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    onChange()
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [query])
  return matches
}
