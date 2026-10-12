import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"

export type ServiceHealth = {
  status: "checking" | "online" | "offline"
  modelLoaded: boolean
  error: string | null
  domain: string
}

const ServiceContext = createContext<{ health: ServiceHealth; refresh: () => Promise<void> } | null>(null)

const INITIAL: ServiceHealth = {
  status: "checking",
  modelLoaded: false,
  error: null,
  domain: "2D fluorescence microscopy of a nuclear marker",
}

export function ServiceProvider({ children }: { children: ReactNode }) {
  const [health, setHealth] = useState<ServiceHealth>(INITIAL)
  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/health")
      if (!response.ok) throw new Error("unavailable")
      const body = (await response.json()) as {
        modelLoaded?: boolean
        error?: string | null
        modelDomain?: string
      }
      setHealth({
        status: "online",
        modelLoaded: Boolean(body.modelLoaded),
        error: body.error ?? null,
        domain: body.modelDomain || INITIAL.domain,
      })
    } catch {
      setHealth({
        status: "offline",
        modelLoaded: false,
        error: "The analysis service is not running.",
        domain: INITIAL.domain,
      })
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return <ServiceContext.Provider value={{ health, refresh }}>{children}</ServiceContext.Provider>
}

export function useService() {
  const value = useContext(ServiceContext)
  if (!value) throw new Error("useService must be used inside ServiceProvider")
  return value
}
