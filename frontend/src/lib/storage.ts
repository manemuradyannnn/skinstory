import type { AnalysisResult, DisplayMode, ReviewEdit } from "../types"

export type StoredAnalysis = {
  id: string
  filename: string
  createdAt: string
  updatedAt: string
  width: number
  height: number
  byteSize: number
  isSample: boolean
  imageBlob: Blob
  result: AnalysisResult
  edit: ReviewEdit
  confidenceThreshold: number | null
  displayMode: DisplayMode
}

const DB_NAME = "cellscope"
const STORE = "analyses"

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveAnalysis(record: StoredAnalysis): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE, "readwrite")
  tx.objectStore(STORE).put(record)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}

export async function listAnalyses(): Promise<StoredAnalysis[]> {
  const db = await openDb()
  const records = await requestToPromise(db.transaction(STORE, "readonly").objectStore(STORE).getAll())
  db.close()
  return records.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function deleteAnalysis(id: string): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STORE, "readwrite")
  tx.objectStore(STORE).delete(id)
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  db.close()
}
