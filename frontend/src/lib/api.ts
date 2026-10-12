import type { AnalysisResult } from "../types"

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function postAnalysis(blob: Blob, filename: string, onProgress: (fraction: number) => void): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/analyze")
    xhr.timeout = 5 * 60 * 1000
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress(event.loaded / event.total)
    }
    xhr.upload.onload = () => onProgress(1)
    xhr.onload = () => {
      const body = parseBody(xhr.responseText)
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body as AnalysisResult)
        return
      }
      reject(new ApiError(detailOf(body) || "Analysis failed before a result was produced.", xhr.status))
    }
    xhr.onerror = () => reject(new ApiError("The analysis service is not running. Start the backend and retry. The image stays loaded.", 0))
    xhr.ontimeout = () => reject(new ApiError("Analysis timed out. You can retry. The image is still loaded.", 0))
    const form = new FormData()
    form.append("file", blob, filename)
    xhr.send(form)
  })
}

function parseBody(text: string): unknown {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function detailOf(body: unknown): string | null {
  if (body && typeof body === "object" && "detail" in body && typeof body.detail === "string") return body.detail
  return null
}
