import { useEffect, useRef, type ReactNode } from "react"
import { Button } from "./ui"

export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const focusable = () =>
      [...root.querySelectorAll<HTMLElement>("button, [href], input, select, textarea")].filter((element) => !element.hasAttribute("disabled"))
    focusable()[0]?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        closeRef.current()
        return
      }
      if (event.key !== "Tab") return
      const items = focusable()
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      previouslyFocused?.focus()
    }
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-[rgba(28,26,24,0.46)]" onClick={() => closeRef.current()} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative z-10 max-h-[min(640px,calc(100dvh-2rem))] w-full max-w-lg overflow-y-auto border border-line bg-panel shadow-[0_16px_40px_rgba(44,41,38,0.16)]"
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id="dialog-title" className="text-sm font-medium">
            {title}
          </h2>
          <Button variant="quiet" onClick={() => closeRef.current()}>
            Close
          </Button>
        </header>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  )
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Dialog title={title} onClose={onClose}>
      <p className="text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  )
}
