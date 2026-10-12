import type { ButtonHTMLAttributes, Ref } from "react";
import { Link, type LinkProps } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md px-4 text-base font-semibold no-underline transition-colors disabled:cursor-not-allowed disabled:opacity-50";

const variants: Record<Variant, string> = {
  primary: "bg-forest text-paper hover:bg-forest-deep",
  secondary: "border border-line bg-paper text-ink hover:bg-ivory-deep",
  ghost: "bg-transparent text-forest hover:bg-ivory-deep",
  danger: "bg-danger text-paper hover:bg-danger-deep",
};

export function buttonClasses(variant: Variant = "primary", className = "") {
  return `${base} ${variants[variant]} ${className}`.trim();
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  ref?: Ref<HTMLButtonElement>;
};

export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ref,
  ...props
}: ButtonProps) {
  return <button ref={ref} type={type} className={buttonClasses(variant, className)} {...props} />;
}

type ButtonLinkProps = LinkProps & {
  variant?: Variant;
};

export function ButtonLink({ variant = "primary", className = "", ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses(variant, className)} {...props} />;
}

export const fieldClass =
  "mt-2 w-full min-h-11 rounded-md border border-line bg-paper px-3 py-2 text-ink";
