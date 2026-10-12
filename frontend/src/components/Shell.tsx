import { NavLink, Outlet } from "react-router-dom"
import { useService } from "../state/ServiceContext"

const items = [
  { to: "/", label: "Workspace", end: true, icon: FrameIcon },
  { to: "/analyses", label: "Analyses", end: false, icon: ListIcon },
  { to: "/evaluation", label: "Model evaluation", end: false, icon: TargetIcon },
  { to: "/guide", label: "Guide", end: false, icon: BookIcon },
]

export function Shell() {
  const { health } = useService()
  const status =
    health.status === "checking"
      ? "Checking model"
      : health.status === "offline"
        ? "Service offline"
        : health.modelLoaded
          ? "Model ready"
          : "Model unavailable"
  const dot = health.modelLoaded ? "bg-teal" : health.status === "checking" ? "bg-[#c4b8a8]" : "bg-[#c4843a]"

  return (
    <div className="flex h-dvh flex-col bg-paper text-ink md:flex-row">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:bg-panel focus:px-3 focus:py-2">
        Skip to content
      </a>
      <aside className="nav-rail border-r border-line bg-panel">
        <div className="flex h-12 items-center px-3">
          <span className="nav-narrow-only text-sm font-medium">Cs</span>
          <span className="nav-wide-only text-sm font-medium tracking-tight">CellScope</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-2" aria-label="Primary">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) =>
                `flex h-10 items-center gap-2.5 rounded-md px-2 text-sm ${isActive ? "bg-teal-soft text-teal" : "text-ink hover:bg-[#f6f3ee]"}`
              }
            >
              <item.icon />
              <span className="nav-wide-only whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line px-3 py-3" title={health.error || status}>
          <p className="flex items-center gap-2 text-xs text-muted">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
            <span className="nav-wide-only whitespace-nowrap">{status}</span>
            <span className="sr-only">{status}</span>
          </p>
          <p className="nav-wide-block mt-2 text-[11px] leading-snug text-muted">Research prototype. Not clinically validated.</p>
        </div>
      </aside>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <nav className="flex border-b border-line bg-panel md:hidden" aria-label="Primary">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex-1 px-1 py-2 text-center text-[11px] ${isActive ? "text-teal" : "text-muted"}`
              }
            >
              {item.label === "Model evaluation" ? "Evaluation" : item.label}
            </NavLink>
          ))}
        </nav>
        <div id="main" className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

function FrameIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 4.5h10M3 8h10M3 11.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function TargetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.2" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="1.3" fill="currentColor" />
    </svg>
  )
}

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 3.2h4.2c.7.6 1.6.6 2.3 0H13V12.8h-3.5c-.7.6-1.6.6-2.3 0H3V3.2Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
