import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react"
import { clientToImage, fitView, hitTest, oneToOne, zoomAt, type View } from "../lib/geometry"
import { findDetection } from "../lib/review"
import { useWorkspace } from "../state/WorkspaceContext"
import type { Detection, DisplayMode } from "../types"

export type ViewerHandle = {
  zoomIn: () => void
  zoomOut: () => void
  fit: () => void
  reset: () => void
}

const MIN_SCALE = 0.05
const MAX_SCALE = 24

export const Viewer = forwardRef<ViewerHandle, { spacePan: boolean }>(function Viewer({ spacePan }, ref) {
  const workspace = useWorkspace()
  const { state, included, modes } = workspace
  const containerRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ scale: 1, x: 0, y: 0 })
  const viewRef = useRef(view)
  const fitted = useRef(true)
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)
  const press = useRef<{ x: number; y: number } | null>(null)
  viewRef.current = view

  function fit() {
    const element = containerRef.current
    if (!element || !state.width) return
    setView(fitView(element.clientWidth, element.clientHeight, state.width, state.height, 28))
    fitted.current = true
  }

  function reset() {
    const element = containerRef.current
    if (!element || !state.width) return
    setView(oneToOne(element.clientWidth, element.clientHeight, state.width, state.height))
    fitted.current = false
  }

  function zoomBy(factor: number) {
    const element = containerRef.current
    if (!element) return
    fitted.current = false
    setView(zoomAt(viewRef.current, element.clientWidth / 2, element.clientHeight / 2, factor, MIN_SCALE, MAX_SCALE))
  }

  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomBy(1.15),
    zoomOut: () => zoomBy(1 / 1.15),
    fit,
    reset,
  }))

  useEffect(() => {
    fit()
    // Fit when the image changes. Resize handling is below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.objectUrl, state.width, state.height])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      if (fitted.current) fit()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [state.width, state.height])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    function onWheel(event: WheelEvent) {
      event.preventDefault()
      const rect = element!.getBoundingClientRect()
      fitted.current = false
      const factor = event.deltaY < 0 ? 1.12 : 1 / 1.12
      setView(zoomAt(viewRef.current, event.clientX - rect.left, event.clientY - rect.top, factor, MIN_SCALE, MAX_SCALE))
    }
    element.addEventListener("wheel", onWheel, { passive: false })
    return () => element.removeEventListener("wheel", onWheel)
  }, [])

  const interactive = state.phase === "results" && Boolean(state.result)
  const selected = state.result ? findDetection(state.result, state.edit, state.selectedId) : null
  const selectedIncluded = selected ? included.some((detection) => detection.id === selected.id) : false
  const legend = state.result?.mode === "demo" ? "Sample" : "Model"
  const guidance = !interactive
    ? "Pan and zoom to check the field before running analysis."
    : state.tool === "add"
      ? "Click the centre of a missed cell. Hold Space and drag to pan."
      : state.tool === "pan" || spacePan
        ? "Drag to move the field. Selection and adding are off while panning."
        : state.showOverlay
          ? "Click a nucleus to inspect it. Switch to Add before marking a missed cell."
          : "Overlays are hidden. Show them to select a detection."

  function localPoint(event: { clientX: number; clientY: number }) {
    const rect = containerRef.current!.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  function onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (event.button === 1 || state.tool === "pan" || spacePan || !interactive) {
      drag.current = { x: event.clientX, y: event.clientY, vx: viewRef.current.x, vy: viewRef.current.y }
      event.currentTarget.setPointerCapture(event.pointerId)
      return
    }
    press.current = { x: event.clientX, y: event.clientY }
  }

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    fitted.current = false
    setView({
      scale: viewRef.current.scale,
      x: drag.current.vx + (event.clientX - drag.current.x),
      y: drag.current.vy + (event.clientY - drag.current.y),
    })
  }

  function onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (drag.current) {
      drag.current = null
      return
    }
    if (!press.current || !interactive) return
    const moved = (event.clientX - press.current.x) ** 2 + (event.clientY - press.current.y) ** 2
    press.current = null
    if (moved > 9) return
    const local = localPoint(event)
    const image = clientToImage(viewRef.current, local.x, local.y)
    if (state.tool === "add") workspace.addAt(image.x, image.y)
    if (state.tool === "select" && state.showOverlay) {
      const hit = hitTest(included, image.x, image.y, viewRef.current.scale)
      workspace.select(hit?.id ?? null)
    }
  }

  const cursor = spacePan || state.tool === "pan" || !interactive ? "cursor-grab active:cursor-grabbing" : state.tool === "add" ? "cursor-crosshair" : "cursor-default"
  const hidden = workspace.counts?.hidden ?? 0

  return (
    <div className="relative min-h-0 flex-1 bg-canvas">
      <div
        ref={containerRef}
        className={`canvas-ui absolute inset-0 overflow-hidden touch-none ${cursor}`}
        role="application"
        aria-label="Microscopy image viewer"
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onAuxClick={(event) => event.preventDefault()}
      >
        {state.objectUrl && (
          <div
            className="absolute top-0 left-0"
            style={{
              width: state.width,
              height: state.height,
              transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
              transformOrigin: "0 0",
            }}
          >
            <img
              src={state.objectUrl}
              alt={`${state.filename} fluorescence field`}
              width={state.width}
              height={state.height}
              draggable={false}
              className="block h-full w-full max-w-none select-none"
            />
            {interactive && state.showOverlay && (
              <svg className="absolute inset-0" width={state.width} height={state.height} viewBox={`0 0 ${state.width} ${state.height}`} aria-hidden="true">
                {included.filter((detection) => detection.id !== selected?.id).map((detection) => (
                  <DetectionShape key={detection.id} detection={detection} mode={state.displayMode} scale={view.scale} selected={false} faded={false} />
                ))}
                {selected && (
                  <DetectionShape detection={selected} mode={state.displayMode} scale={view.scale} selected faded={!selectedIncluded} />
                )}
              </svg>
            )}
          </div>
        )}
      </div>

      <p className="pointer-events-none absolute top-0 right-0 left-0 px-3 py-2 text-xs text-canvas-text">{guidance}</p>
      {interactive && state.showOverlay && (
        <div className="pointer-events-none absolute top-8 left-3 flex gap-3 text-[11px] text-canvas-text">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-model" />
            {legend}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-mark" />
            Manual
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full border border-white" />
            Selected
          </span>
        </div>
      )}

      {state.phase === "running" && (
        <div className="absolute inset-x-0 top-0 z-10">
          <div className="h-1 overflow-hidden bg-white/10">
            {state.runStage === "upload" ? (
              <div className="h-full bg-model" style={{ width: `${Math.round(state.uploadProgress * 100)}%` }} />
            ) : (
              <div className="indeterminate h-full w-1/3 bg-model" />
            )}
          </div>
          <p className="bg-canvas/80 px-3 py-2 text-xs text-canvas-text" role="status">
            {state.runStage === "upload"
              ? `Uploading ${Math.round(state.uploadProgress * 100)}%`
              : "Running StarDist on CPU. A field of this size can take a minute."}
          </p>
        </div>
      )}

      {state.error && (
        <div className="absolute inset-x-3 top-12 z-10 border border-[#6e3030] bg-[#2a1616] px-3 py-2 text-xs text-[#f3d2d2]" role="alert">
          {state.error}
        </div>
      )}

      <div className="canvas-ui absolute inset-x-2 bottom-2 flex flex-wrap items-center gap-1 rounded-md border border-canvas-line bg-canvas-2/95 p-1">
        <ToolButton label="Pan" pressed={state.tool === "pan"} onClick={() => workspace.setTool("pan")}>
          Pan
        </ToolButton>
        <ToolButton label="Select" pressed={state.tool === "select"} disabled={!interactive} onClick={() => workspace.setTool("select")}>
          Select
        </ToolButton>
        <ToolButton label="Add a missed cell" pressed={state.tool === "add"} disabled={!interactive} onClick={() => workspace.setTool("add")}>
          Add
        </ToolButton>
        <span className="mx-1 h-5 w-px bg-canvas-line" aria-hidden="true" />
        <ToolButton label="Zoom out" onClick={() => zoomBy(1 / 1.15)}>
          −
        </ToolButton>
        <span className="min-w-12 text-center font-mono text-xs text-canvas-text tabular-nums" aria-live="polite">
          {Math.round(view.scale * 100)}%
        </span>
        <ToolButton label="Zoom in" onClick={() => zoomBy(1.15)}>
          +
        </ToolButton>
        <ToolButton label="Fit to view" onClick={fit}>
          Fit
        </ToolButton>
        <ToolButton label="Reset zoom to 100 percent" onClick={reset}>
          Reset
        </ToolButton>
        <span className="mx-1 hidden h-5 w-px bg-canvas-line sm:block" aria-hidden="true" />
        <ToolButton
          label={state.showOverlay ? "Hide overlays" : "Show overlays"}
          pressed={state.showOverlay}
          disabled={!interactive}
          onClick={() => workspace.setShowOverlay(!state.showOverlay)}
        >
          Overlays
        </ToolButton>
        {interactive &&
          (["centres", "boxes", "boundaries"] as DisplayMode[])
            .filter((mode) => modes.includes(mode))
            .map((mode) => (
              <ToolButton key={mode} label={`Show ${mode}`} pressed={state.displayMode === mode} onClick={() => workspace.setDisplayMode(mode)}>
                {mode === "centres" ? "Centres" : mode === "boxes" ? "Boxes" : "Boundaries"}
              </ToolButton>
            ))}
        {interactive && (
          <span className="px-2 font-mono text-[11px] text-canvas-text tabular-nums">
            {included.length} shown{hidden > 0 ? ` · ${hidden} hidden` : ""}
          </span>
        )}
      </div>
    </div>
  )
})

function ToolButton({
  children,
  label,
  pressed,
  disabled,
  onClick,
}: {
  children: ReactNode
  label: string
  pressed?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className="h-8 rounded px-2 text-xs text-canvas-text hover:bg-white/10 disabled:opacity-40 aria-pressed:bg-white/15"
    >
      {children}
    </button>
  )
}

function DetectionShape({
  detection,
  mode,
  scale,
  selected,
  faded,
}: {
  detection: Detection
  mode: DisplayMode
  scale: number
  selected: boolean
  faded: boolean
}) {
  const color = selected ? "#f4f1eb" : detection.source === "manual" ? "#e0a84a" : "#7dcec6"
  const radius = (selected ? 6 : 4.5) / scale
  return (
    <g opacity={faded ? 0.4 : 1}>
      {mode === "boxes" && detection.bbox && (
        <rect
          x={detection.bbox.x}
          y={detection.bbox.y}
          width={detection.bbox.width}
          height={detection.bbox.height}
          fill="none"
          stroke={color}
          strokeWidth={selected ? 2.4 : 1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {mode === "boundaries" && detection.polygon && detection.polygon.length > 2 && (
        <polygon
          points={detection.polygon.map((point) => `${point.x},${point.y}`).join(" ")}
          fill={selected ? "rgba(244,241,235,0.12)" : "transparent"}
          stroke={color}
          strokeWidth={selected ? 2.4 : 1.5}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {detection.source === "manual" ? (
        <g stroke={color} strokeWidth={1.6} fill="none">
          <line x1={detection.centerX - radius} y1={detection.centerY} x2={detection.centerX + radius} y2={detection.centerY} vectorEffect="non-scaling-stroke" />
          <line x1={detection.centerX} y1={detection.centerY - radius} x2={detection.centerX} y2={detection.centerY + radius} vectorEffect="non-scaling-stroke" />
        </g>
      ) : (
        <circle cx={detection.centerX} cy={detection.centerY} r={mode === "centres" ? radius : radius * 0.7} fill={color} />
      )}
    </g>
  )
}
