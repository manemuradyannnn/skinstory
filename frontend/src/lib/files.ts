import type { Check } from "../types"
import { formatBytes } from "./format"

export const MAX_BYTES = 20 * 1024 * 1024
export const MIN_EDGE = 64
export const MAX_EDGE = 4096

export function sniffImageType(bytes: Uint8Array): "png" | "jpeg" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png"
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg"
  return null
}

export function extensionKind(name: string): "png" | "jpeg" | "tiff" | "other" {
  const ext = name.split(".").pop()?.toLowerCase()
  if (ext === "png") return "png"
  if (ext === "jpg" || ext === "jpeg") return "jpeg"
  if (ext === "tif" || ext === "tiff") return "tiff"
  return "other"
}

export type PixelStats = { median: number; meanSaturation: number }

export function statsFromPixels(data: Uint8ClampedArray): PixelStats {
  const pixels = Math.max(1, data.length / 4)
  const luminance: number[] = []
  let saturation = 0
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index]
    const green = data[index + 1]
    const blue = data[index + 2]
    const max = Math.max(red, green, blue)
    const min = Math.min(red, green, blue)
    luminance.push(0.2126 * red + 0.7152 * green + 0.0722 * blue)
    saturation += max === 0 ? 0 : (max - min) / max
  }
  luminance.sort((a, b) => a - b)
  return {
    median: luminance[Math.floor(luminance.length / 2)] ?? 0,
    meanSaturation: saturation / pixels,
  }
}

export function appearanceFromStats(stats: PixelStats): "pass" | "warn" {
  const brightColored = stats.median > 110 && stats.meanSaturation > 0.22
  const veryBright = stats.median > 160
  return brightColored || veryBright ? "warn" : "pass"
}

export function buildChecks(input: {
  bytes: number
  width: number
  height: number
  appearance: "pass" | "warn"
}): { checks: Check[]; ok: boolean; needsAcknowledgement: boolean } {
  const longSide = Math.max(input.width, input.height)
  const shortSide = Math.min(input.width, input.height)
  const dimensionsOk = shortSide >= MIN_EDGE && longSide <= MAX_EDGE
  const checks: Check[] = [
    { id: "format", label: "Format", state: "pass", detail: "PNG or JPEG." },
    { id: "size", label: "File size", state: "pass", detail: `${formatBytes(input.bytes)}. Limit 20 MB.` },
    { id: "decode", label: "Decode", state: "pass", detail: "The file opened without error." },
    {
      id: "dimensions",
      label: "Dimensions",
      state: dimensionsOk ? "pass" : "fail",
      detail: dimensionsOk
        ? `${input.width}×${input.height} px.`
        : `${input.width}×${input.height} px. Each side must be between ${MIN_EDGE} and ${MAX_EDGE} px.`,
    },
    {
      id: "appearance",
      label: "Appearance",
      state: input.appearance === "warn" ? "warn" : "pass",
      detail:
        input.appearance === "warn"
          ? "The field is bright and looks unlike a dark fluorescence image. StarDist 2D_versatile_fluo is only supported for fluorescence nuclear markers."
          : "Dark background. This is consistent with fluorescence, but it does not identify the stain.",
    },
  ]
  const ok = checks.every((check) => check.state !== "fail")
  return {
    checks,
    ok,
    needsAcknowledgement: ok && input.appearance === "warn",
  }
}

export function rejectReason(file: File, bytes: Uint8Array): string | null {
  if (file.size === 0) return "The file is empty."
  if (file.size > MAX_BYTES) return `This file is ${formatBytes(file.size)}. The limit is 20 MB.`
  const extension = extensionKind(file.name)
  if (extension === "tiff") return "TIFF is not supported. Export a PNG or JPEG from your imaging software."
  if (extension === "other") return "PNG and JPEG only. This file is not one of those formats."
  const sniffed = sniffImageType(bytes)
  if (!sniffed) return "The file contents are not a PNG or JPEG. It may be damaged or renamed."
  if (extension === "png" && sniffed !== "png") return "The file name says PNG, but the contents are not a PNG."
  if (extension === "jpeg" && sniffed !== "jpeg") return "The file name says JPEG, but the contents are not a JPEG."
  return null
}

export async function inspectFile(file: File): Promise<
  | { status: "rejected"; message: string }
  | {
      status: "ready"
      width: number
      height: number
      checks: Check[]
      ok: boolean
      needsAcknowledgement: boolean
    }
> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer())
  const rejected = rejectReason(file, header)
  if (rejected) return { status: "rejected", message: rejected }
  try {
    const decoded = await decodeFile(file)
    const built = buildChecks({
      bytes: file.size,
      width: decoded.width,
      height: decoded.height,
      appearance: decoded.appearance,
    })
    return { status: "ready", width: decoded.width, height: decoded.height, ...built }
  } catch {
    return { status: "rejected", message: "This file could not be decoded. It may be damaged or not a real PNG or JPEG." }
  }
}

async function decodeFile(file: File): Promise<{ width: number; height: number; appearance: "pass" | "warn" }> {
  const bitmap = await createImageBitmap(file)
  try {
    return { width: bitmap.width, height: bitmap.height, appearance: appearanceOf(bitmap) }
  } finally {
    bitmap.close()
  }
}

function appearanceOf(bitmap: ImageBitmap): "pass" | "warn" {
  const canvas = document.createElement("canvas")
  const width = 96
  const height = Math.max(1, Math.round((bitmap.height * width) / bitmap.width))
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) return "pass"
  context.drawImage(bitmap, 0, 0, width, height)
  return appearanceFromStats(statsFromPixels(context.getImageData(0, 0, width, height).data))
}
