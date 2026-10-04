import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  forwardRef,
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from "react"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "icon" | "nav" | "small" | "mobileNav"
}

const buttonStyles = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-card bg-terracotta px-6 py-3.5 text-sm font-bold text-white transition hover:bg-terracotta-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-fern",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-card border border-walnut/25 bg-transparent px-6 py-3.5 text-sm font-bold text-walnut transition hover:border-deep-fern hover:text-deep-fern focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-fern",
  icon: "inline-grid size-10 place-items-center rounded-full text-walnut transition hover:bg-sage/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-fern",
  nav: "inline-flex items-center gap-1 rounded-card px-3 py-2 text-sm font-semibold text-walnut transition hover:bg-sage/20 focus-visible:outline-2 focus-visible:outline-deep-fern",
  small:
    "inline-flex items-center justify-center rounded-card bg-deep-fern px-4 py-2.5 text-xs font-bold text-cream transition hover:bg-walnut focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-deep-fern",
  mobileNav:
    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-card text-[10px] font-semibold text-walnut transition hover:bg-sage/20 focus-visible:outline-2 focus-visible:outline-deep-fern",
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button className={`${buttonStyles[variant]} ${className}`} {...props} />
  )
}

type NavLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: "default" | "footer" | "mobileNav"
}

const linkStyles = {
  default:
    "text-walnut transition hover:text-deep-fern focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold",
  footer:
    "text-sm text-cream/70 transition hover:text-cream focus-visible:outline-2 focus-visible:outline-gold",
  mobileNav:
    "flex min-h-16 flex-col items-center justify-center gap-1 rounded-card text-[10px] font-semibold text-walnut transition hover:bg-sage/20 focus-visible:outline-2 focus-visible:outline-deep-fern",
}

export function NavLink({
  variant = "default",
  className = "",
  ...props
}: NavLinkProps) {
  return <a className={`${linkStyles[variant]} ${className}`} {...props} />
}

export const TextField =
  forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
    function TextField({ className = "", ...props }, ref) {
      return (
        <input
          ref={ref}
          className={`h-11 rounded-card border border-walnut/15 bg-white/55 px-4 text-sm text-walnut outline-none transition placeholder:text-walnut/45 focus:border-deep-fern focus:bg-white focus:ring-2 focus:ring-sage/30 ${className}`}
          {...props}
        />
      )
    },
  )

export function TextArea({
  className = "",
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-28 rounded-card border border-walnut/15 bg-white/55 px-4 py-3 text-sm text-walnut outline-none transition placeholder:text-walnut/45 focus:border-deep-fern focus:bg-white focus:ring-2 focus:ring-sage/30 ${className}`}
      {...props}
    />
  )
}

export function RadioField({
  label,
  description,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  description: string
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-card border border-walnut/15 bg-white/45 p-4 has-[:checked]:border-deep-fern has-[:checked]:bg-sage/15">
      <input type="radio" className="mt-1 accent-deep-fern" {...props} />
      <span>
        <span className="block text-sm font-bold">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-walnut/60">
          {description}
        </span>
      </span>
    </label>
  )
}

export function Heading({
  level,
  className = "",
  children,
}: {
  level: 1 | 2 | 3
  className?: string
  children: ReactNode
}) {
  const classes = `font-heading font-semibold tracking-tight text-walnut ${className}`
  if (level === 1) return <h1 className={classes}>{children}</h1>
  if (level === 2) return <h2 className={classes}>{children}</h2>
  return <h3 className={classes}>{children}</h3>
}

const paths: Record<string, ReactNode> = {
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  bag: (
    <>
      <path d="M5 8h14l-1 13H6L5 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </>
  ),
  chevronDown: <path d="m7 10 5 5 5-5" />,
  arrowRight: (
    <>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </>
  ),
  arrowLeft: (
    <>
      <path d="M19 12H5" />
      <path d="m10 17-5-5 5-5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v11h14V10M9 21v-7h6v7" />
    </>
  ),
  grid: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </>
  ),
  sprout: (
    <>
      <path d="M12 21v-9" />
      <path d="M12 14C7 14 4 11 4 6c5 0 8 3 8 8Z" />
      <path d="M12 11c0-4 3-7 8-7 0 5-3 8-8 8Z" />
    </>
  ),
  moon: <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
  sparkle: (
    <>
      <path d="m12 3 1.3 4.2L17 9l-3.7 1.8L12 15l-1.3-4.2L7 9l3.7-1.8L12 3Z" />
      <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
    </>
  ),
  flask: (
    <>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
      <path d="M7 15h10" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v11H3zM14 10h4l3 3v4h-7z" />
      <circle cx="7" cy="19" r="2" />
      <circle cx="18" cy="19" r="2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  alert: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 17h.01" />
    </>
  ),
  star: (
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
}

export function Icon({
  name,
  size = "md",
}: {
  name: string
  size?: "xs" | "sm" | "md" | "xl"
}) {
  const sizes = { xs: "size-3.5", sm: "size-4.5", md: "size-5", xl: "size-12" }
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={sizes[size]}
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}
