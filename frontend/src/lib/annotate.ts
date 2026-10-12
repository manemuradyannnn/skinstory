import type { Detection, DisplayMode } from "../types"

const MODEL_COLOR = "#7dcec6"
const MANUAL_COLOR = "#e0a84a"

export async function annotatedPngBlob(input: {
  imageUrl: string
  width: number
  height: number
  detections: Detection[]
  displayMode: DisplayMode
}): Promise<Blob> {
  const image = new Image()
  image.src = input.imageUrl
  await image.decode()
  const canvas = document.createElement("canvas")
  canvas.width = input.width
  canvas.height = input.height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("The annotated image could not be drawn.")
  context.drawImage(image, 0, 0, input.width, input.height)
  const stroke = Math.max(2, input.width / 480)
  for (const detection of input.detections) {
    const color = detection.source === "manual" ? MANUAL_COLOR : MODEL_COLOR
    if (input.displayMode === "boxes" && detection.bbox) {
      strokeShape(context, stroke, color, () => {
        context.strokeRect(detection.bbox!.x, detection.bbox!.y, detection.bbox!.width, detection.bbox!.height)
      })
    } else if (input.displayMode === "boundaries" && detection.polygon && detection.polygon.length > 2) {
      strokeShape(context, stroke, color, () => {
        const [first, ...rest] = detection.polygon!
        context.beginPath()
        context.moveTo(first.x, first.y)
        for (const point of rest) context.lineTo(point.x, point.y)
        context.closePath()
        context.stroke()
      })
    }
    const radius = Math.max(4, input.width / 260)
    drawCentre(context, detection, color, input.displayMode === "centres" ? radius : radius * 0.62)
  }
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (!blob) throw new Error("The annotated image could not be encoded.")
  return blob
}

function strokeShape(context: CanvasRenderingContext2D, width: number, color: string, draw: () => void): void {
  context.save()
  context.lineJoin = "round"
  context.strokeStyle = "rgba(0,0,0,0.72)"
  context.lineWidth = width + 2
  draw()
  context.strokeStyle = color
  context.lineWidth = width
  draw()
  context.restore()
}

function drawCentre(context: CanvasRenderingContext2D, detection: Detection, color: string, radius: number): void {
  context.save()
  context.translate(detection.centerX, detection.centerY)
  context.strokeStyle = "rgba(0,0,0,0.72)"
  context.fillStyle = color
  context.lineWidth = Math.max(2, radius / 3)
  if (detection.source === "manual") {
    context.beginPath()
    context.moveTo(-radius, 0)
    context.lineTo(radius, 0)
    context.moveTo(0, -radius)
    context.lineTo(0, radius)
    context.stroke()
    context.strokeStyle = color
    context.lineWidth = Math.max(1.5, radius / 4)
    context.stroke()
  } else {
    context.beginPath()
    context.arc(0, 0, radius, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()
}
