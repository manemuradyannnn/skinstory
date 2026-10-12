import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ConfirmDialog } from "../components/Dialogs"
import { Button } from "../components/ui"
import { formatWhen } from "../lib/format"
import { reviewCounts } from "../lib/review"
import { deleteAnalysis, listAnalyses, type StoredAnalysis } from "../lib/storage"
import { useWorkspace } from "../state/WorkspaceContext"

export function AnalysesPage() {
  const navigate = useNavigate()
  const { loadStored } = useWorkspace()
  const [records, setRecords] = useState<StoredAnalysis[]>([])
  const [thumbs, setThumbs] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingDelete, setPendingDelete] = useState<StoredAnalysis | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const next = await listAnalyses()
      setRecords(next)
      setError(null)
    } catch {
      setError("Saved analyses could not be read from this browser.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refresh()
  }, [])

  useEffect(() => {
    const urls = Object.fromEntries(records.map((record) => [record.id, URL.createObjectURL(record.imageBlob)]))
    setThumbs(urls)
    return () => {
      for (const url of Object.values(urls)) URL.revokeObjectURL(url)
    }
  }, [records])

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <header className="border-b border-line bg-panel px-4 py-3">
        <h1 className="text-sm font-medium">Analyses</h1>
        <p className="text-xs text-muted">Saved in this browser. Nothing is uploaded except when you run analysis.</p>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6">
        {loading && <p className="text-sm text-muted">Loading saved analyses…</p>}
        {error && (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        )}
        {!loading && !error && records.length === 0 && (
          <p className="text-sm leading-relaxed text-muted">
            No analyses are saved in this browser yet. Run one from the workspace. Reviews stay on this computer.
          </p>
        )}
        <ul className="divide-y divide-line border border-line bg-panel">
          {records.map((record) => {
            const counts = reviewCounts(record.result, record.edit, record.confidenceThreshold)
            return (
              <li key={record.id} className="flex items-center gap-3 px-3 py-3">
                <img src={thumbs[record.id]} alt="" className="h-14 w-20 bg-canvas object-contain" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{record.filename}</p>
                  <p className="text-xs text-muted">
                    {formatWhen(record.updatedAt)} · {record.result.mode === "demo" ? "Sample annotations" : "Model"} ·{" "}
                    <span className="font-mono tabular-nums">{counts.current}</span> current · {record.edit.status === "reviewed" ? "Reviewed" : "Unreviewed"}
                  </p>
                </div>
                <Button
                  onClick={() => {
                    loadStored(record)
                    navigate("/")
                  }}
                >
                  Open
                </Button>
                <Button variant="quiet" onClick={() => setPendingDelete(record)}>
                  Delete
                </Button>
              </li>
            )
          })}
        </ul>
      </div>
      {pendingDelete && (
        <ConfirmDialog
          title="Delete analysis"
          body={`Delete the saved review of ${pendingDelete.filename}? This does not affect the original file.`}
          confirmLabel="Delete"
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            void deleteAnalysis(pendingDelete.id).then(refresh)
            setPendingDelete(null)
          }}
        />
      )}
    </div>
  )
}
