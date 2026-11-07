import { phoneDigits } from "@/admin/help-box";
import { loadHelpBoxContent } from "./help-box-content";

/** The green "Can't find what you need?" box. It always comes last. Staff edit its text (Admin, Content). */
export async function HelpBox() {
  const content = await loadHelpBoxContent();
  // Each {phone} in the body shows as the bold tel: link; React escapes the rest, so the body is plain text.
  const parts = content.body.split("{phone}");
  const tel = phoneDigits(content.phone);
  return (
    <aside
      aria-labelledby="help-heading"
      className="flex flex-col gap-4 rounded-2xl bg-secondary-soft p-6 md:flex-row md:items-center md:justify-between"
    >
      <div>
        <h2 id="help-heading" className="font-extrabold">
          {content.heading}
        </h2>
        <p className="mt-1 whitespace-pre-line text-sm">
          {parts.map((part, i) => (
            <span key={i}>
              {i > 0 && (
                <a href={`tel:${tel}`} className="font-bold underline">
                  {content.phone}
                </a>
              )}
              {part}
            </span>
          ))}
        </p>
      </div>
      {/* target=_top: open the contact page in the whole window, not inside the iframe. */}
      <a
        href={content.buttonUrl}
        target="_top"
        className="flex min-h-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface px-6 font-bold"
      >
        {content.buttonLabel}
      </a>
    </aside>
  );
}
