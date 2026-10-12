import { useState } from "react"
import { polygonArea } from "../lib/geometry"
import { formatCoord, formatDuration, formatScore } from "../lib/format"
import { findDetection, sourceLabel } from "../lib/review"
import { useService } from "../state/ServiceContext"
import { useWorkspace } from "../state/WorkspaceContext"
import { ConfirmDialog } from "./Dialogs"
import { Button, Field } from "./ui"

export function InspectionPanel() {
  const workspace = useWorkspace()
  const { health } = useService()
  const { state, counts, included } = workspace
  const selected = state.result ? findDetection(state.result, state.edit, state.selectedId) : null
  const selectedIncluded = selected ? included.some((detection) => detection.id === selected.id) : false
  const canRun = state.imageOk && state.phase !== "running" && (!state.needsAcknowledgement || state.acknowledged)
  const pristine = state.edit.removedIds.length === 0 && state.edit.additions.length === 0 && state.edit.status === "unreviewed"
  const [confirm, setConfirm] = useState<null | "reset" | "sample">(null)

  if (!state.filename) {
    return (
      <div className="px-4 py-4">
        <h2 className="text-sm font-medium">This workspace</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Load one fluorescence field, run nuclei detection, then correct anything the model missed or marked in error.
          Images here have no pixel calibration, so nothing is reported in physical units.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          The model is StarDist 2D_versatile_fluo. It is for 2D fluorescence images of a nuclear marker. Histology and brightfield are not supported.
        </p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {state.error && (
          <div className="mb-4 border border-[#e4cfcb] bg-[#faf4f2] px-3 py-2 text-sm text-danger" role="alert">
            <p>{state.error}</p>
            {state.imageOk && (
              <Button className="mt-2" onClick={() => void workspace.runAnalysis()} disabled={!canRun}>
                Retry analysis
              </Button>
            )}
          </div>
        )}

        {state.phase !== "results" ? (
          <Preparation canRun={canRun} />
        ) : (
          state.result &&
          counts && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted">{state.edit.status === "reviewed" ? "Reviewed" : "Unreviewed"}</p>
                <Button variant="quiet" onClick={workspace.markReviewed} disabled={state.edit.status === "reviewed"}>
                  Mark as reviewed
                </Button>
              </div>
              {state.result.mode === "demo" && (
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Sample annotations. These are the 2σ ellipses used to draw the demonstration image, not a model prediction.
                </p>
              )}
              {state.notice && <p className="mt-3 text-sm leading-relaxed text-muted">{state.notice}</p>}
              <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
                <Field label="Current count" value={counts.current} />
                <Field label={state.result.mode === "demo" ? "Original sample" : "Original model"} value={counts.original} />
                <Field label="Added" value={counts.additions} />
                <Field label="Removed" value={counts.removals} />
                {counts.hidden > 0 && <Field label="Hidden by score" value={counts.hidden} />}
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                The current count is the original detections, minus removals and any below the score cutoff, plus manual additions.
              </p>
              <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 border-t border-line pt-4 text-sm">
                <dt className="text-muted">Duration</dt>
                <dd className="text-right font-mono tabular-nums">
                  {state.result.mode === "demo" ? "Not timed" : formatDuration(state.result.durationMs)}
                </dd>
                <dt className="text-muted">Source</dt>
                <dd className="max-w-40 text-right">{state.result.model.name}</dd>
                <dt className="text-muted">Version</dt>
                <dd className="text-right font-mono">{state.result.model.version}</dd>
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-muted">
                Touching nuclei are not always separated. Zoom in before you remove or add a cell in a cluster.
              </p>

              {state.threshold != null && state.result.model.probabilityThreshold != null && (
                <div className="mt-4 border-t border-line pt-4">
                  <label htmlFor="score" className="flex items-baseline justify-between text-sm">
                    <span>Minimum object probability</span>
                    <span className="font-mono tabular-nums">{formatScore(state.threshold)}</span>
                  </label>
                  <input
                    id="score"
                    type="range"
                    min={state.result.model.probabilityThreshold}
                    max={1}
                    step={0.01}
                    value={state.threshold}
                    onChange={(event) => workspace.setThreshold(Number(event.target.value))}
                    aria-valuetext={formatScore(state.threshold)}
                  />
                  <p className="mt-1 text-xs leading-relaxed text-muted">
                    StarDist’s object probability for each nucleus. It is not a calibrated class probability. Detections below the model’s own threshold of{" "}
                    {formatScore(state.result.model.probabilityThreshold)} are not returned. Manual additions stay visible. Export uses this same set.
                  </p>
                </div>
              )}

              <section className="mt-4 border-t border-line pt-4">
                <h2 className="text-sm font-medium">Selected</h2>
                {!selected && <p className="mt-2 text-sm text-muted">Click a detection to inspect it.</p>}
                {selected && (
                  <div className="mt-2">
                    <p className="text-sm">
                      <span className="font-mono">{selected.id}</span>
                      <span className="text-muted"> · {sourceLabel(selected.source, state.result.mode)}</span>
                    </p>
                    {!selectedIncluded && (
                      <p className="mt-1 text-xs text-muted">Hidden from the count and from export by the probability cutoff.</p>
                    )}
                    <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm">
                      <Field label="Centre" value={`${formatCoord(selected.centerX)}, ${formatCoord(selected.centerY)}`} />
                      {selected.objectProbability != null && <Field label="Object probability" value={formatScore(selected.objectProbability)} />}
                      {selected.bbox && (
                        <Field
                          label="Box"
                          value={`${formatCoord(selected.bbox.x)}, ${formatCoord(selected.bbox.y)} · ${formatCoord(selected.bbox.width)}×${formatCoord(selected.bbox.height)}`}
                        />
                      )}
                      {selected.polygon && selected.polygon.length > 2 && (
                        <Field label="Area" value={`${Math.round(polygonArea(selected.polygon))} px²`} />
                      )}
                    </dl>
                    <p className="mt-2 text-xs leading-relaxed text-muted">
                      Coordinates are image pixels from the top left. Area is the contour in pixels, not a physical size.
                    </p>
                    <Button className="mt-3" variant="danger" onClick={workspace.removeSelected}>
                      Remove detection
                    </Button>
                  </div>
                )}
              </section>
            </div>
          )
        )}
      </div>
      {state.phase === "results" && (
        <div className="flex flex-wrap gap-2 border-t border-line px-4 py-3">
          <Button variant="quiet" onClick={workspace.undo} disabled={state.past.length === 0}>
            Undo
          </Button>
          <Button variant="quiet" onClick={workspace.redo} disabled={state.future.length === 0}>
            Redo
          </Button>
          <Button variant="quiet" onClick={() => setConfirm("reset")} disabled={pristine}>
            Reset edits
          </Button>
          <Button variant="quiet" onClick={() => void workspace.runAnalysis()} disabled={!state.imageOk}>
            Run again
          </Button>
          {state.isSample && state.result?.mode === "live" && (
            <Button variant="quiet" onClick={() => (pristine ? workspace.useSampleAnnotations() : setConfirm("sample"))}>
              Sample annotations
            </Button>
          )}
        </div>
      )}
      {confirm === "reset" && (
        <ConfirmDialog
          title="Reset edits"
          body="This restores the original detections and clears additions, removals, and the reviewed mark."
          confirmLabel="Reset edits"
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            workspace.resetEdits()
            setConfirm(null)
          }}
        />
      )}
      {confirm === "sample" && (
        <ConfirmDialog
          title="Use sample annotations"
          body="This replaces the model result on the demonstration image. The model result stays in Analyses if it was saved."
          confirmLabel="Use sample annotations"
          onClose={() => setConfirm(null)}
          onConfirm={() => {
            workspace.useSampleAnnotations()
            setConfirm(null)
          }}
        />
      )}
      {workspace.saveWarning && <p className="px-4 pb-3 text-xs text-danger">{workspace.saveWarning}</p>}
      {health.status === "offline" && state.phase !== "results" && (
        <p className="px-4 pb-3 text-xs text-muted">The analysis service is offline. The sample annotations still work on the demonstration image.</p>
      )}
    </div>
  )
}

function Preparation({ canRun }: { canRun: boolean }) {
  const workspace = useWorkspace()
  const { state } = workspace
  const { health } = useService()
  return (
    <div>
      <h2 className="text-sm font-medium">Compatibility</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        StarDist 2D_versatile_fluo detects nuclei in 2D fluorescence images of a nuclear marker. It does not analyse histology or brightfield. Color images are reduced to luminance.
      </p>
      <ul className="mt-4 space-y-3">
        {state.checks.map((check) => (
          <li key={check.id}>
            <p className="text-sm">
              <span className={check.state === "fail" ? "text-danger" : check.state === "warn" ? "text-[#7a5414]" : "text-teal"}>
                {check.state === "pass" ? "Pass" : check.state === "warn" ? "Warning" : "Fail"}
              </span>
              <span className="text-muted"> · {check.label}</span>
            </p>
            <p className="text-sm text-ink">{check.detail}</p>
          </li>
        ))}
      </ul>
      {state.needsAcknowledgement && (
        <label className="mt-4 flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={state.acknowledged}
            onChange={(event) => workspace.acknowledge(event.target.checked)}
          />
          <span>This image is a 2D fluorescence micrograph of a nuclear marker.</span>
        </label>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="primary" disabled={!canRun} onClick={() => void workspace.runAnalysis()}>
          {state.phase === "running" ? "Analysing…" : state.error ? "Retry analysis" : "Run analysis"}
        </Button>
        {state.isSample && (
          <Button onClick={workspace.useSampleAnnotations} disabled={!state.imageOk || state.phase === "running"}>
            Review sample annotations
          </Button>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">
        {health.status === "online" && health.modelLoaded
          ? "Run analysis sends the image to StarDist. Sample annotations are a separate, labelled fixture."
          : health.status === "checking"
            ? "Checking whether the model is available."
            : health.error || "Live inference is unavailable until the analysis service loads the model."}
      </p>
    </div>
  )
}
