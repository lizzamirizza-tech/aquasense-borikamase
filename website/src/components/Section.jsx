// Layout primitives shared by every page.

// Page title block.
export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="text-xs font-semibold tracking-[0.12em] text-accent uppercase">{eyebrow}</p>}
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

// Section inside a page.
export default function Section({ id, eyebrow, title, description, actions, children, className = "" }) {
  return (
    <section id={id} className={`scroll-mt-24 ${className}`}>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="text-[11px] font-semibold tracking-[0.12em] text-ink-faint uppercase">{eyebrow}</p>}
          {title && <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>}
          {description && <p className="mt-0.5 text-sm text-ink-soft">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

export function Panel({ children, className = "", as: Tag = "div", ...props }) {
  return (
    <Tag className={`rounded-2xl border border-line bg-surface shadow-card ${className}`} {...props}>
      {children}
    </Tag>
  )
}

export function PanelTitle({ children, hint, right }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{children}</p>
        {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
      </div>
      {right}
    </div>
  )
}

export function Button({ icon: Icon, children, variant = "secondary", size = "md", className = "", ...props }) {
  const styles = {
    primary: "border-accent bg-accent text-on-accent hover:bg-accent-strong",
    secondary: "border-line-strong bg-surface text-ink hover:border-accent-line hover:text-accent",
    ghost: "border-transparent bg-transparent text-ink-soft hover:bg-accent-soft hover:text-accent",
    danger: "border-danger-border bg-surface text-danger hover:bg-danger-bg",
  }[variant]
  const sizes = size === "sm" ? "min-h-9 px-3 text-xs" : "min-h-10 px-4 text-sm"
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${sizes} ${styles} ${className}`}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />}
      {children}
    </button>
  )
}

export function Alert({ tone = "warning", icon: Icon, children, action, className = "" }) {
  const styles = {
    warning: "border-warning-border bg-warning-bg text-warning",
    danger: "border-danger-border bg-danger-bg text-danger",
    good: "border-good-border bg-good-bg text-good",
    info: "border-accent-line bg-accent-soft text-accent-strong",
  }[tone]
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${styles} ${className}`}>
      {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />}
      <div className="min-w-0 flex-1">{children}</div>
      {action}
    </div>
  )
}
