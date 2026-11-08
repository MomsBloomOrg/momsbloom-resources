"use client";

import { useState } from "react";
import { Copy, Mail } from "lucide-react";
import { programShareUrl } from "@/embed/protocol";

const pill = "flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3 font-bold min-[900px]:min-h-10 min-[900px]:text-sm";

/**
 * The "Share this resource" card on Program detail. Copy puts the Host page link on the clipboard; Email opens a
 * blank email with it. `data-event` attributes feed AnalyticsReporter. If the browser refuses the clipboard, the
 * link shows in a selected field so the family can copy it by hand.
 */
export function ShareTool({ programId, programName, className }: { programId: string; programName: string; className?: string }) {
  const link = programShareUrl(programId);
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const mailto = `mailto:?subject=${encodeURIComponent(`${programName} — MomsBloom Resource Directory`)}&body=${encodeURIComponent(`I found this resource for you: ${link}`)}`;
  const data = { "data-program-id": programId, "data-program-name": programName };

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <section aria-labelledby="share" className={className}>
      <h2 id="share" className="text-base font-extrabold">
        Share this resource
      </h2>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={copy} data-event="program_share_copy" {...data} className={pill}>
          <Copy aria-hidden="true" className="size-4" />
          Copy Page Link
        </button>
        <a href={mailto} data-event="program_share_email" {...data} className={pill}>
          <Mail aria-hidden="true" className="size-4" />
          Email
        </a>
      </div>
      <p role="status" className="mt-2 text-sm empty:hidden">
        {state === "copied" && "Link copied."}
        {state === "failed" && "Copy this link."}
      </p>
      {state === "failed" && (
        <input readOnly value={link} aria-label="Page link" onFocus={(event) => event.currentTarget.select()} autoFocus className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm" />
      )}
    </section>
  );
}
