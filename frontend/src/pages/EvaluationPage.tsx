import { useEffect, useState } from "react"
import { Button } from "../components/ui"
import type { EvaluationReport } from "../types"

type LoadState =
  | { status: "loading" }
  | { status: "empty"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; report: EvaluationReport }

export function EvaluationPage() {
  const [load, setLoad] = useState<LoadState>({ status: "loading" })

  async function refresh() {
    setLoad({ status: "loading" })
    try {
      const response = await fetch("/api/evaluation")
      if (response.status === 404) {
        const body = (await response.json().catch(() => null)) as { detail?: string } | null
        setLoad({
          status: "empty",
          message: body?.detail || "No evaluation has been run.",
        })
        return
      }
      if (!response.ok) throw new Error("The evaluation report could not be read.")
      setLoad({ status: "ready", report: (await response.json()) as EvaluationReport })
    } catch (error) {
      setLoad({
        status: "error",
        message: error instanceof Error ? error.message : "The evaluation report could not be read.",
      })
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <header className="flex items-center justify-between border-b border-line bg-panel px-4 py-3">
        <div>
          <h1 className="text-sm font-medium">Model evaluation</h1>
          <p className="text-xs text-muted">Detection and counting are reported separately.</p>
        </div>
        <Button variant="quiet" onClick={() => void refresh()}>
          Refresh
        </Button>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6">
        {load.status === "loading" && <p className="text-sm text-muted">Loading evaluation…</p>}
        {load.status === "error" && (
          <p className="text-sm text-danger" role="alert">
            {load.message}
          </p>
        )}
        {load.status === "empty" && <EmptyEvaluation message={load.message} />}
        {load.status === "ready" && <ReportView report={load.report} />}
      </div>
    </div>
  )
}

function EmptyEvaluation({ message }: { message: string }) {
  return (
    <div className="max-w-xl">
      <h2 className="text-base font-medium">No evaluation is stored yet</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">{message}</p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        The script compares StarDist 2D_versatile_fluo with known nuclei on a synthetic validation split. Matching is greedy and one-to-one, and a pair counts only when the mask intersection-over-union is at least 0.5. Precision, recall, and F1 describe that matching. Mean absolute counting error describes only the difference in counts, which can stay small when misses and extra detections cancel.
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">
        From the backend directory, run <span className="font-mono text-xs">python scripts/evaluate.py</span>. This page stays empty until that file exists. It does not show placeholder numbers.
      </p>
    </div>
  )
}

function ReportView({ report }: { report: EvaluationReport }) {
  return (
    <article>
      <p className="text-sm leading-relaxed">{report.limitation}</p>
      <dl className="mt-6 grid gap-y-2 text-sm">
        <div>
          <dt className="text-muted">Dataset</dt>
          <dd>
            {report.dataset.name}, version {report.dataset.version}, {report.dataset.split} split, {report.dataset.imageCount} images, seed {report.dataset.seed}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Model</dt>
          <dd>
            {report.model.name} {report.model.version}. {report.model.domain}.
          </dd>
        </div>
        <div>
          <dt className="text-muted">Matching</dt>
          <dd>
            {report.matching.method}, {report.matching.criterion} ≥ {report.matching.threshold}. {report.matching.description}
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-sm leading-relaxed text-muted">{report.dataset.description}</p>

      <h2 className="mt-8 text-sm font-medium">Detection</h2>
      <p className="mt-1 text-sm text-muted">A nucleus counts as detected only when it is matched. An unmatched miss and an extra detection do not cancel.</p>
      <table className="mt-3 w-full border-collapse text-sm">
        <tbody>
          <Metric label="Precision" value={report.detection.precision} detail={`${report.detection.truePositives} matched / ${report.detection.truePositives + report.detection.falsePositives} predictions`} />
          <Metric label="Recall" value={report.detection.recall} detail={`${report.detection.truePositives} matched / ${report.detection.truePositives + report.detection.falseNegatives} ground truth`} />
          <Metric label="F1" value={report.detection.f1} detail="Harmonic mean of precision and recall" />
        </tbody>
      </table>

      <h2 className="mt-8 text-sm font-medium">Counting</h2>
      <p className="mt-1 text-sm text-muted">{report.counting.description}</p>
      <p className="mt-2 font-mono text-sm tabular-nums">Mean absolute error {report.counting.meanAbsoluteError.toFixed(3)}</p>
      <table className="mt-3 w-full border-collapse text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th className="border-b border-line py-1 font-medium">Image</th>
            <th className="border-b border-line py-1 text-right font-medium">Truth</th>
            <th className="border-b border-line py-1 text-right font-medium">Predicted</th>
            <th className="border-b border-line py-1 text-right font-medium">Abs. error</th>
            <th className="border-b border-line py-1 text-right font-medium">TP</th>
            <th className="border-b border-line py-1 text-right font-medium">FP</th>
            <th className="border-b border-line py-1 text-right font-medium">FN</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {report.counting.perImage.map((row) => (
            <tr key={row.id}>
              <td className="border-b border-line py-1 font-sans">{row.id}</td>
              <td className="border-b border-line py-1 text-right">{row.groundTruth}</td>
              <td className="border-b border-line py-1 text-right">{row.predicted}</td>
              <td className="border-b border-line py-1 text-right">{row.absoluteError}</td>
              <td className="border-b border-line py-1 text-right">{row.truePositives}</td>
              <td className="border-b border-line py-1 text-right">{row.falsePositives}</td>
              <td className="border-b border-line py-1 text-right">{row.falseNegatives}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-8 text-sm font-medium">Examples</h2>
      <p className="mt-1 text-sm text-muted">The first images in the split, in id order. Amber contours are ground truth. Teal contours are the model.</p>
      <div className="mt-4 space-y-6">
        {report.examples.map((example) => (
          <figure key={example.id}>
            <figcaption className="mb-2 text-sm">
              {example.id} · truth <span className="font-mono">{example.groundTruthCount}</span> · predicted{" "}
              <span className="font-mono">{example.predictedCount}</span>
            </figcaption>
            <div className="grid gap-2 sm:grid-cols-3">
              <ExampleImage src={example.inputUrl} label="Input" alt={`Validation image ${example.id}`} />
              <ExampleImage src={example.groundTruthUrl} label="Ground truth" alt={`Ground truth contours for ${example.id}`} />
              <ExampleImage src={example.predictionUrl} label="Prediction" alt={`Model contours for ${example.id}`} />
            </div>
          </figure>
        ))}
      </div>
      <p className="mt-6 text-xs text-muted">
        Generated {report.generatedAt}. Runtime {report.runtimeSeconds}s. Normalisation: {report.model.normalization}
      </p>
    </article>
  )
}

function Metric({ label, value, detail }: { label: string; value: number | null; detail: string }) {
  return (
    <tr>
      <th className="w-28 border-b border-line py-2 text-left font-medium">{label}</th>
      <td className="border-b border-line py-2 font-mono tabular-nums">{value == null ? "—" : value.toFixed(3)}</td>
      <td className="border-b border-line py-2 text-muted">{detail}</td>
    </tr>
  )
}

function ExampleImage({ src, label, alt }: { src: string; label: string; alt: string }) {
  return (
    <figure className="bg-canvas">
      <img src={src} alt={alt} className="h-40 w-full object-contain" />
      <figcaption className="px-2 py-1 text-[11px] text-canvas-text">{label}</figcaption>
    </figure>
  )
}
