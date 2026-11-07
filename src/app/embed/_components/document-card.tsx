import { Download, FileText } from "lucide-react";
import type { DirectoryDocument } from "@/directory/types";
import { Tag } from "./program-card";

/** One Document in "Guides and downloads": title, description, tags, "PDF" + languages, Download. */
export function DocumentCard({ document, labelOf }: { document: DirectoryDocument; labelOf: (key: string) => string }) {
  const values = document.facetValues;
  const tags = [...values.category, ...values.subcategory];
  return (
    <article className="flex gap-4 rounded-2xl border border-line bg-surface p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
        <FileText aria-hidden="true" className="size-5" />
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <h3 className="font-extrabold">{document.title}</h3>
        <p className="text-sm text-muted">{document.description}</p>
        {tags.length > 0 && (
          <ul aria-label="Type of support" className="flex flex-wrap gap-1.5">
            {tags.map((key) => (
              <Tag key={key}>{labelOf(key)}</Tag>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-muted">{["PDF", values.language.map(labelOf).join(", ")].filter(Boolean).join(" · ")}</p>
          <a
            href={document.pdfUrl}
            data-event="document_download"
            data-document-id={document.id}
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
