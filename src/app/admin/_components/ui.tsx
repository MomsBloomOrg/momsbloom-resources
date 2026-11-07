/**
 * Shared Admin UI: class helpers and small components. No "use client" and no server-only imports,
 * so server pages and client forms use the same parts. Colors are the momsbloom tokens in
 * globals.css (white on `primary-text` is about 5:1; never put white on `primary`).
 */
import type { ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors " +
  "disabled:cursor-not-allowed disabled:opacity-60";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary-text text-white hover:bg-primary-hover",
  secondary: "border border-muted bg-surface text-ink hover:border-ink",
  danger: "border border-red-700 bg-surface text-red-700 hover:bg-red-50",
};

const BUTTON_SIZES = {
  md: "min-h-11 px-5 py-2 text-sm sm:min-h-10",
  sm: "min-h-9 px-4 py-1.5 text-sm",
};

/** A pill button (or a link that looks like one). */
export function buttonClass(variant: ButtonVariant = "secondary", size: keyof typeof BUTTON_SIZES = "md"): string {
  return `${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]}`;
}

export const linkClass = "text-primary-text underline decoration-1 underline-offset-2 hover:text-primary-hover";
export const inputClass =
  "w-full rounded-md border border-muted bg-surface px-3 py-2 text-ink placeholder:text-muted disabled:bg-background";
export const labelClass = "font-semibold text-ink";
export const hintClass = "text-sm text-muted";

/** A white box with an optional heading. */
export function Card({
  title,
  actions,
  className = "",
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-4 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-xl font-bold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

/** The top of an Admin page: an optional back link, the h1, and optional actions. */
export function PageHeader({ title, back, actions }: { title: ReactNode; back?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-2">
      {back && <p className="text-sm">{back}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 tabIndex={-1} className="min-w-0 text-2xl font-bold [overflow-wrap:anywhere]">
          {title}
        </h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export type BadgeTone = "good" | "warning" | "neutral";

const BADGE_TONES: Record<BadgeTone, string> = {
  good: "bg-secondary-soft text-ink",
  warning: "bg-amber-100 text-amber-900",
  neutral: "bg-background text-ink",
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE_TONES[tone]}`}>
      {children}
    </span>
  );
}

export type NoticeTone = "success" | "error" | "info" | "warning";

const NOTICE_TONES: Record<NoticeTone, string> = {
  success: "border-secondary bg-secondary-soft text-ink",
  error: "border-red-700 bg-red-50 text-red-900",
  info: "border-line bg-background text-ink",
  warning: "border-amber-600 bg-amber-50 text-amber-950",
};

export function noticeClass(tone: NoticeTone): string {
  return `rounded-md border-l-4 border-y border-r px-4 py-3 ${NOTICE_TONES[tone]}`;
}

/** A notice box. `role` is "status" for results and "alert" for errors; omit it for static text. */
export function Notice({ tone, role, children }: { tone: NoticeTone; role?: "status" | "alert"; children: ReactNode }) {
  return (
    <div role={role} className={noticeClass(tone)}>
      {children}
    </div>
  );
}

/** "Nothing here" text in a list or a card. */
export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="rounded-md border border-dashed border-line px-4 py-6 text-center text-muted">{children}</p>;
}

// Tables: the stack* classes make each row a block below `lg` (1024 px), so a phone shows every cell
// and control without sideways scroll. Put `data-label` on each cell. The table keeps its ARIA roles in
// the markup, because Safari drops table semantics when the display changes.
export const stackTableClass = "w-full border-collapse text-left max-lg:block";
export const stackTheadClass = "max-lg:sr-only";
export const stackTheadRowClass = "border-b-2 border-line";
export const stackTbodyClass = "max-lg:block";
export const stackRowClass =
  "border-b border-line align-top last:border-b-0 max-lg:flex max-lg:flex-col max-lg:gap-1 max-lg:py-3";
export const thClass = "px-3 py-2 text-sm font-semibold first:pl-0 last:pr-0";
export const stackTdClass =
  "px-3 py-3 first:pl-0 last:pr-0 max-lg:block max-lg:p-0 max-lg:before:mr-2 max-lg:before:text-sm " +
  "max-lg:before:font-semibold max-lg:before:text-muted max-lg:before:content-[attr(data-label)_/_'']";
