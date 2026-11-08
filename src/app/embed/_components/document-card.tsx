import { Download, FileText } from "lucide-react";
import type { DirectoryDocument } from "@/directory/types";
import { Highlight } from "./highlight";
import { supportTags, Tag, type LabelOf } from "./program-card";

/** One Document in "Guides and downloads": title, description, tags, "PDF" + languages, Download. */
export function DocumentCard({ document, labelOf, words = [] }: { document: DirectoryDocument; labelOf: LabelOf; words?: readonly string[] }) {
  const values = document.facetValues;
  const tags = supportTags(values, labelOf);
  return (
    <article className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
        <FileText aria-hidden="true" className="size-5" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <h3 className="font-extrabold">
          <Highlight text={document.title} words={words} />
        </h3>
        <p className="text-sm text-muted">
          <Highlight text={document.description} words={words} />
        </p>
        {tags.length > 0 && (
          <ul aria-label="Type of support" className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Tag key={tag.id} words={words}>
                {tag.label}
              </Tag>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted">{["PDF", values.language.map((key) => labelOf("language", key)).join(", ")].filter(Boolean).join(" · ")}</p>
          <a
            href={document.pdfUrl}
            data-event="document_download"
            data-document-id={document.id}
            data-document-title={document.title}
            target="_blank"
            rel="noopener"
            className="flex min-h-11 items-center gap-1 font-bold text-primary-text md:min-h-6"
          >
            <Download aria-hidden="true" className="size-4" />
            Download<span className="sr-only"> {document.title} (PDF, opens in a new tab)</span>
          </a>
        </div>
      </div>
    </article>
  );
}
