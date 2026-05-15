import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, right, className }) {
  return (
    <div className={cn("flex items-start justify-between gap-4 mb-6", className)}>
      <div>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight text-stone-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-stone-500 text-sm md:text-base">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  );
}

export function Card({ className, children, ...rest }) {
  return (
    <div
      className={cn(
        "bg-white border border-stone-200 rounded-3xl tactile p-6",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, description, icon, action, imageUrl }) {
  return (
    <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50/60 p-10 text-center">
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="mx-auto h-32 w-32 object-cover rounded-2xl mb-4 opacity-90"
        />
      )}
      {icon && <div className="mx-auto mb-3 text-stone-400">{icon}</div>}
      <p className="font-display text-lg font-semibold text-stone-800">{title}</p>
      {description && <p className="mt-1 text-sm text-stone-500 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, accent = "#FF8C6B", icon }) {
  return (
    <div className="relative overflow-hidden bg-white border border-stone-200 rounded-3xl p-6 tactile">
      <div
        className="absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-20"
        style={{ background: accent }}
      />
      <div className="flex items-center gap-3 text-stone-500 text-xs uppercase tracking-wider font-semibold">
        {icon && <span style={{ color: accent }}>{icon}</span>}
        {label}
      </div>
      <div className="mt-3 font-display text-3xl md:text-4xl font-bold text-stone-900">{value}</div>
      {hint && <div className="mt-1 text-xs text-stone-500">{hint}</div>}
    </div>
  );
}

export function Pill({ children, color = "stone", className }) {
  const map = {
    stone: "bg-stone-100 text-stone-700",
    brand: "bg-[#FFF3EF] text-[#FF7A54]",
    green: "bg-emerald-50 text-emerald-700",
    blue: "bg-sky-50 text-sky-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    purple: "bg-violet-50 text-violet-700",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold", map[color], className)}>
      {children}
    </span>
  );
}

export function SectionLabel({ children, className }) {
  return (
    <p className={cn("text-xs uppercase tracking-wider font-bold text-stone-400 mb-3", className)}>
      {children}
    </p>
  );
}
