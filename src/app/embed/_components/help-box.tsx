/** The green "Can't find what you need?" box. It always comes last. */
export function HelpBox() {
  return (
    <aside
      aria-labelledby="help-heading"
      className="flex flex-col gap-4 rounded-2xl bg-secondary-soft p-6 md:flex-row md:items-center md:justify-between"
    >
      <div>
        <h2 id="help-heading" className="font-extrabold">
          Can&apos;t find what you need?
        </h2>
        <p className="mt-1 text-sm">
          Call or text <a href="tel:211" className="font-bold underline">211</a> for free, confidential help finding local
          services, or contact the MomsBloom team and we&apos;ll help you look.
        </p>
      </div>
      {/* target=_top: open the contact page in the whole window, not inside the iframe. */}
      <a
        href="https://www.momsbloom.org/contact"
        target="_top"
        className="flex min-h-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface px-6 font-bold"
      >
        Contact MomsBloom
      </a>
    </aside>
  );
}
