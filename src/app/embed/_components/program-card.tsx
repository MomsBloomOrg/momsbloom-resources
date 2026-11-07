import { ArrowRight, Check, Globe, MapPin, Phone, User } from "lucide-react";
import type { ProgramResult } from "@/directory/results";
import type { PostalAddress } from "@/directory/types";

/** The small light-green pill. Text is `ink`: green text on green fails contrast. */
export function Tag({ children }: { children: string }) {
  return <li className="rounded-md bg-secondary-soft px-2 py-0.5 text-xs">{children}</li>;
}

/** "In person and virtual", or the format labels joined. */
export function formatText(keys: readonly string[], labelOf: (key: string) => string): string | null {
  if (keys.includes("in-person") && keys.includes("virtual")) return "In person and virtual";
  return keys.length ? keys.map(labelOf).join(", ") : null;
}

/** "Accepts Medicaid + 2 plans". Unknown (null) shows nothing: never show it as "No". */
export function insuranceText(plans: readonly string[], accepts: ProgramResult["program"]["acceptsInsurance"], labelOf: (key: string) => string) {
  if (plans.length) return `Accepts ${labelOf(plans[0])}${plans.length > 1 ? ` + ${plans.length - 1} more` : ""}`;
  if (accepts === "yes") return "Accepts insurance";
  if (accepts === "no") return "Does not take insurance";
  return null;
}

/** "123 Example Ave SE, Suite 200, Grand Rapids, MI 49508". */
export function addressText(address: PostalAddress): string {
  return [address.street, address.suite, address.city].filter(Boolean).join(", ") + `, ${address.state} ${address.zip}`;
}

/** The detail page of a Program. `search` is the serialized results query, kept so "Back to results" restores it. */
export function detailsHref(id: string, search: string): string {
  return `/embed/programs/${id}${search ? `?${search}` : ""}`;
}

/** One Program in the results (docs/specs/public-directory.md, "Program card"). */
export function ProgramCard({
  result: { program, distanceMiles },
  labelOf,
  detailsHref,
}: {
  result: ProgramResult;
  labelOf: (key: string) => string;
  detailsHref: string;
}) {
  const values = program.facetValues;
  const format = formatText(values.format, labelOf);
  const facts = [
    insuranceText(values.insurance, program.acceptsInsurance, labelOf),
    ...values.cost.map(labelOf),
    values.language.map(labelOf).join(", "),
    format,
  ].filter((fact): fact is string => Boolean(fact));
  const [contact, ...otherContacts] = program.contacts;
  const { address } = program;

  return (
    <article id={`program-${program.id}`} className="rounded-2xl border border-line bg-surface p-5">
      <div className="flex items-start justify-between gap-3 text-sm text-muted">
        <p>{program.organization.name}</p>
        {distanceMiles !== null && (
          <p className="flex shrink-0 items-center gap-1">
            <MapPin aria-hidden="true" className="size-4" />
            {distanceMiles} mi
          </p>
        )}
      </div>
      <h3 className="mt-1 text-xl font-extrabold">{program.name}</h3>
      {values.category.length + values.subcategory.length > 0 && (
        <ul aria-label="Type of support" className="mt-2 flex flex-wrap gap-1.5">
          {[...values.category, ...values.subcategory].map((key) => (
            <Tag key={key}>{labelOf(key)}</Tag>
          ))}
        </ul>
      )}
      <p className="mt-3 line-clamp-3">{program.description}</p>
      <div className="mt-3 flex flex-col gap-1 text-sm">
        {/* No address (or virtual only): show how to connect instead (spec, "States and edge cases"). */}
        <p className="flex items-start gap-2">
          <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {address && !program.virtualOnly
            ? addressText(address)
            : (format ?? "Virtual and phone")}
        </p>
        {(program.phone || program.website) && (
          <p className="flex flex-wrap items-center gap-x-4">
            {program.phone && (
              <a href={`tel:${program.phone.replace(/[^\d+]/g, "")}`} className="flex min-h-11 items-center gap-2 font-bold text-primary-text underline md:min-h-6">
                <Phone aria-hidden="true" className="size-4" />
                {program.phone}
              </a>
            )}
            {program.website && (
              <a
                href={program.website}
                target="_blank"
                rel="noopener"
                className="flex min-h-11 items-center gap-2 font-bold text-primary-text underline md:min-h-6"
              >
                <Globe aria-hidden="true" className="size-4" />
                Website<span className="sr-only"> for {program.name} (opens in a new tab)</span>
              </a>
            )}
          </p>
        )}
      </div>
      {facts.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-sm">
          {facts.map((fact) => (
            <li key={fact} className="flex items-center gap-1">
              <Check aria-hidden="true" className="size-4" />
              {fact}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        {contact ? (
          <p className="flex items-center gap-2 text-muted">
            <User aria-hidden="true" className="size-4" />
            {[contact.name, contact.title].filter(Boolean).join(", ")}
            {otherContacts.length > 0 && ` +${otherContacts.length} more`}
          </p>
        ) : (
          <span />
        )}
        <a href={detailsHref} className="flex min-h-11 items-center gap-1 font-bold text-primary-text md:min-h-6">
          View details<span className="sr-only"> for {program.name}</span>
          <ArrowRight aria-hidden="true" className="size-4" />
        </a>
      </div>
    </article>
  );
}
