import type { ButtonHTMLAttributes, ReactNode } from "react"

type Variant = "default" | "primary" | "danger" | "quiet"

const variants: Record<Variant, string> = {
  default: "border border-line bg-panel text-ink hover:bg-[#f6f3ee]",
  primary: "border border-teal bg-teal text-white hover:bg-[#0c5c56]",
  danger: "border border-[#e4cfcb] bg-panel text-danger hover:bg-[#faf4f2]",
  quiet: "border border-transparent bg-transparent text-muted hover:bg-[#f6f3ee] hover:text-ink",
}

export function Button({
  variant = "default",
  className = "",
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={`btn h-8 gap-1.5 rounded-md px-2.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "live" | "demo" | "danger" }) {
  const tones = {
    neutral: "border-line text-muted",
    live: "border-[#b7ddd8] bg-teal-soft text-teal",
    demo: "border-[#ead7ae] bg-[#fbf6ec] text-[#7a5414]",
    danger: "border-[#e4cfcb] bg-[#faf4f2] text-danger",
  }
  return <span className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs ${tones[tone]}`}>{children}</span>
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-mono tabular-nums">{value}</dd>
    </>
  )
}
