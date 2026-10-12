import type { Detection, Point } from "../types"

export type View = { scale: number; x: number; y: number }

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function zoomAt(
  view: View,
  anchorX: number,
  anchorY: number,
  factor: number,
  minScale: number,
  maxScale: number,
): View {
  const scale = clamp(view.scale * factor, minScale, maxScale)
  const ratio = scale / view.scale
  return {
    scale,
    x: anchorX - (anchorX - view.x) * ratio,
    y: anchorY - (anchorY - view.y) * ratio,
  }
}

export function clientToImage(view: View, localX: number, localY: number): Point {
  return {
    x: (localX - view.x) / view.scale,
    y: (localY - view.y) / view.scale,
  }
}

export function fitView(
  containerW: number,
  containerH: number,
  imageW: number,
  imageH: number,
  padding: number,
): View {
  const availableW = Math.max(1, containerW - padding * 2)
  const availableH = Math.max(1, containerH - padding * 2)
  const scale = clamp(Math.min(availableW / imageW, availableH / imageH), 0.05, 8)
  return {
    scale,
    x: (containerW - imageW * scale) / 2,
    y: (containerH - imageH * scale) / 2,
  }
}

export function oneToOne(containerW: number, containerH: number, imageW: number, imageH: number): View {
  return {
    scale: 1,
    x: (containerW - imageW) / 2,
    y: (containerH - imageH) / 2,
  }
}

export function pointInPolygon(x: number, y: number, polygon: Point[]): boolean {
  if (polygon.length < 3) return false
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (crosses) inside = !inside
  }
  return inside
}

export function polygonArea(polygon: Point[]): number {
  let sum = 0
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i]
    const next = polygon[(i + 1) % polygon.length]
    sum += current.x * next.y - next.x * current.y
  }
  return Math.abs(sum) / 2
}

/** Nearest centre wins. Zooming in shrinks the click tolerance in image pixels. */
export function hitTest(detections: Detection[], x: number, y: number, scale: number): Detection | null {
  const tolerance = 12 / Math.max(scale, 0.05)
  let best: { detection: Detection; distance: number } | null = null
  for (const detection of detections) {
    const distance = Math.hypot(detection.centerX - x, detection.centerY - y)
    const inside = detection.polygon ? pointInPolygon(x, y, detection.polygon) : false
    if (!inside && distance > tolerance) continue
    if (!best || distance < best.distance) best = { detection, distance }
  }
  return best?.detection ?? null
}
