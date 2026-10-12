import { Album, BookOpen, ClipboardList, PersonStanding, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAppState } from "../state/StoreProvider";
import { Button } from "./Button";

const NAV: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Overview", icon: BookOpen, end: true },
  { to: "/map", label: "Body Map", icon: PersonStanding },
  { to: "/journal", label: "Journal", icon: Album },
  { to: "/visit", label: "Visit Prep", icon: ClipboardList },
];

function Wordmark() {
  return (
    <span className="inline-flex items-center gap-2 font-serif text-xl tracking-tight text-ink">
      <svg viewBox="0 0 32 32" className="size-6 text-forest" aria-hidden="true">
        <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="19" cy="13" r="2.3" fill="currentColor" />
      </svg>
      SkinStory
    </span>
  );
}

export function Layout() {
  const { pathname, hash } = useLocation();
  const { toast, dispatch } = useAppState();

  useEffect(() => {
    if (hash) return;
    window.scrollTo(0, 0);
    const heading = document.querySelector("main h1");
    if (heading instanceof HTMLElement) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [pathname, hash]);

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)]">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-paper focus:px-4 focus:py-2 focus:text-ink"
      >
        Skip to content
      </a>

      <aside className="no-print sticky top-0 hidden h-dvh flex-col border-r border-line px-4 py-8 lg:flex">
        <NavLink to="/" aria-label="SkinStory, home" className="rounded-md px-2 no-underline">
          <Wordmark />
        </NavLink>
        <nav className="mt-10" aria-label="Primary">
          <ul className="grid gap-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex min-h-11 items-center gap-3 border-l-2 px-3 text-[0.98rem] no-underline ${
                      isActive
                        ? "border-forest font-semibold text-ink"
                        : "border-transparent font-medium text-muted hover:text-ink"
                    }`
                  }
                >
                  <item.icon aria-hidden="true" strokeWidth={1.5} className="size-5" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-auto px-3 text-sm leading-snug text-muted">
          Entries stay in this tab and reset when you refresh.
        </p>
      </aside>

      <div className="flex min-w-0 flex-col">
        <header className="no-print border-b border-line px-4 py-4 lg:hidden">
          <NavLink to="/" aria-label="SkinStory, home" className="no-underline">
            <Wordmark />
          </NavLink>
          <p className="mt-1 text-sm text-muted">Entries stay in this tab and reset when you refresh.</p>
        </header>

        <main id="content" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-28 outline-none sm:px-6 lg:px-10 lg:pt-12 lg:pb-16">
          <Outlet />
        </main>
      </div>

      <nav
        className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ivory pb-[env(safe-area-inset-bottom)] lg:hidden"
        aria-label="Primary"
      >
        <ul className="grid grid-cols-4">
          {NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex min-h-16 flex-col items-center justify-center gap-1 text-xs no-underline ${
                    isActive ? "font-semibold text-ink" : "font-medium text-muted"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`h-0.5 w-5 rounded-full ${isActive ? "bg-forest" : "bg-transparent"}`} />
                    <item.icon aria-hidden="true" strokeWidth={1.5} className="size-5" />
                    {item.label}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {toast ? (
        <div className="no-print fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] left-1/2 z-30 flex w-[min(24rem,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-4 border border-line bg-paper px-4 py-3 text-sm shadow-none lg:bottom-6">
          <p role="status">{toast.message}</p>
          <Button variant="ghost" className="min-h-9 px-2" onClick={() => dispatch({ type: "clear-toast" })}>
            Dismiss
          </Button>
        </div>
      ) : null}
    </div>
  );
}
