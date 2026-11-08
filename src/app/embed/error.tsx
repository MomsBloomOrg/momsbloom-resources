"use client";

import { useEffect } from "react";
import { EMBED_ROOT_ID } from "@/embed/protocol";
import { DirectoryHeader } from "./_components/directory-header";
import { ResizeReporter } from "./_components/resize-reporter";

export default function DirectoryError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => console.error(error), [error]);

  return (
    <main id={EMBED_ROOT_ID} className="mx-auto w-full max-w-6xl px-4 py-8">
      <DirectoryHeader />
      <div id="help" className="mx-auto mt-8 flex max-w-2xl flex-col items-start gap-4 rounded-2xl bg-secondary-soft p-6">
        <p role="alert">
          We couldn&apos;t load the directory right now. Call{" "}
          <a href="tel:211" className="font-bold underline">
            211
          </a>{" "}
          or{" "}
          {/* target=_top: open the contact page in the whole window, not inside the iframe. */}
          <a href="https://www.momsbloom.org/contact" target="_top" className="font-bold underline">
            contact MomsBloom
          </a>{" "}
          and we&apos;ll help you look.
        </p>
        <button
          type="button"
          onClick={() => retry()}
          className="min-h-12 rounded-full bg-primary-text px-6 font-bold text-white hover:bg-primary-hover"
        >
          Try again
        </button>
      </div>
      <ResizeReporter />
    </main>
  );
}
