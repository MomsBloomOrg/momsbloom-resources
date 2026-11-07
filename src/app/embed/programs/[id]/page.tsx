import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, Globe, MapPin, Phone, User } from "lucide-react";
import { parseDirectoryQuery, serializeDirectoryQuery } from "@/directory/query";
import { IS_SAMPLE_DATA } from "@/directory/sample-flag";
import { getDirectorySnapshot } from "@/directory/snapshot";
import { EMBED_ROOT_ID } from "@/embed/protocol";
import { addressText, detailsHref, formatText, Tag, telHref, webUrl } from "../../_components/program-card";
import { ResizeReporter } from "../../_components/resize-reporter";

export const metadata: Metadata = {
  title: "MomsBloom Resource Directory",
  robots: { index: false, follow: true },
};

const MORE_LIMIT = 3;
const card = "rounded-2xl border border-line bg-surface p-5";
const heading = "text-base font-extrabold";
const pill = "flex min-h-11 items-center gap-2 rounded-full border px-4 font-bold min-[900px]:min-h-10";
const pillPlain = `${pill} border-line bg-surface`;
const link = "flex min-h-11 items-center font-bold text-primary-text underline min-[900px]:min-h-6";
const verified = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const insuranceAnswer = { yes: "Yes", no: "No", "not-applicable": "Not applicable" } as const;

/** A label and its value. Hidden when there is no value: never show a missing value as "No". */
function Field({ name, children }: { name: string; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="mt-3 first:mt-0">
      <p className="text-sm text-muted">{name}</p>
      <div>{children}</div>
    </div>
  );
}

/**
 * The detail view of one Program (docs/specs/public-directory.md, "Program detail"), no-map design.
 * Two columns from 900 px; below that one column with the actions on top. Unknown or Inactive IDs are
 * not in the snapshot: they go back to the results with a note.
 *
 * Keep all content inside EMBED_ROOT_ID: ResizeReporter measures it. `data-scroll-top` makes the host page
 * scroll to the top of the iframe when the page opens.
 */
export default async function ProgramDetailPage({ params, searchParams }: PageProps<"/embed/programs/[id]">) {
  const [{ id }, rawQuery] = await Promise.all([params, searchParams]);
  const query = parseDirectoryQuery(rawQuery);
  const search = serializeDirectoryQuery(query);
  const snapshot = getDirectorySnapshot();
  const program = snapshot.programs.find((candidate) => candidate.id === id);
  if (!program) redirect(`/embed?${search ? `${search}&` : ""}unavailable=1`);

  const labels = new Map(snapshot.facets.flatMap((facet) => facet.values.map((value) => [value.key, value.label])));
  const labelOf = (key: string) => labels.get(key) ?? key;
  const values = program.facetValues;
  const { address, organization } = program;
  const place = address && !program.virtualOnly ? addressText(address) : null;
  const orgHref = `/embed?org=${organization.id}`;
  const siblings = snapshot.programs.filter((other) => other.organization.id === organization.id && other.id !== program.id);
  const tags = [...values.category, ...values.subcategory];
  const website = webUrl(program.website);
  const hasInsurance = Boolean(program.acceptsInsurance || values.insurance.length || values.cost.length || program.eligibilityNotes);
  const hasWho = values.language.length > 0 || values.whoItServes.length > 0;
  const newTab = <span className="sr-only"> (opens in a new tab)</span>;

  const hasActions = Boolean(program.phone || place || website);
  // Both action bars are in the page, one for each layout, so the tab order matches the screen.
  const actionBar = (className: string) =>
    hasActions && (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {program.phone && (
          <a href={telHref(program.phone)} className={`${pill} border-primary-text bg-primary-text text-white`}>
            <Phone aria-hidden="true" className="size-4" />
            Call<span className="sr-only"> {program.phone}</span>
          </a>
        )}
        {place && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`}
            target="_blank"
            rel="noopener"
            className={pillPlain}
          >
            <MapPin aria-hidden="true" className="size-4" />
            Directions{newTab}
          </a>
        )}
        {website && (
          <a href={website} target="_blank" rel="noopener" className={pillPlain}>
            <Globe aria-hidden="true" className="size-4" />
            Website{newTab}
          </a>
        )}
      </div>
    );

  return (
    <main id={EMBED_ROOT_ID} data-scroll-top="" className="mx-auto w-full max-w-6xl px-4 py-6">
      {IS_SAMPLE_DATA && (
        <p className="mb-4 text-sm text-muted">Sample data: these programs are made up while the directory is being built.</p>
      )}
      <a
        href={`/embed?${search}#program-${program.id}`}
        className="flex min-h-11 w-fit items-center gap-2 font-bold text-primary-text min-[900px]:min-h-6"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {query.q ? `Back to results for “${query.q}”` : "Back to results"}
      </a>
      <p className="flex min-h-11 items-center gap-1 text-muted min-[900px]:mt-2 min-[900px]:min-h-6">
        Part of{" "}
        <a href={orgHref} className="font-bold text-primary-text underline">
          {organization.name}
        </a>
      </p>
      <h1 className="mt-1 text-3xl font-extrabold min-[900px]:text-5xl">{program.name}</h1>
      {tags.length > 0 && (
        <ul aria-label="Type of support" className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((key) => (
            <Tag key={key}>{labelOf(key)}</Tag>
          ))}
        </ul>
      )}
      {actionBar("mt-4 min-[900px]:hidden")}

      {/* One grid, in the mobile order (actions, About, Location, Contacts, Insurance, Languages, More), so the tab order
          matches the screen. From 900 px the right-hand cards go to column 2 and `dense` packs each column from the top. Cards keep their own height (rows still align). */}
      <div className="mt-6 flex flex-col gap-4 min-[900px]:grid min-[900px]:grid-flow-dense min-[900px]:grid-cols-[minmax(0,1fr)_22rem] min-[900px]:items-start">
        {actionBar(`${card} hidden min-[900px]:col-start-2 min-[900px]:flex`)}
        <section aria-labelledby="about" className={`${card} min-[900px]:col-start-1`}>
          <h2 id="about" className={heading}>
            About
          </h2>
          <p className="mt-2">{program.description}</p>
        </section>
        <section aria-labelledby="location" className={`${card} min-[900px]:col-start-2`}>
          <h2 id="location" className={heading}>
            Location and hours
          </h2>
          <div className="mt-2">
            <Field name="Address">
              {place && (
                <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center underline min-[900px]:min-h-6">
                  {place}
                  {newTab}
                </a>
              )}
            </Field>
            <Field name="Hours">{program.hours}</Field>
            <Field name="How you'll connect">{formatText(values.format, labelOf)}</Field>
          </div>
        </section>
        {program.contacts.length > 0 && (
          <section aria-labelledby="contact" className={`${card} min-[900px]:col-start-1`}>
            <h2 id="contact" className={heading}>
              Who to contact
            </h2>
            <ul className="mt-2 flex flex-col gap-2">
              {program.contacts.map((contact) => (
                <li key={`${contact.name}-${contact.email}`} className="flex items-start gap-3">
                  <User aria-hidden="true" className="mt-1 size-8 shrink-0 rounded-full bg-secondary-soft p-2" />
                  <div>
                    <p>{contact.name}</p>
                    {contact.title && <p className="text-sm text-muted">{contact.title}</p>}
                    <p className="flex flex-wrap gap-x-4 text-sm">
                      {contact.phone && (
                        <a href={telHref(contact.phone)} className={link}>
                          {contact.phone}
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`} className={link}>
                          {contact.email}
                        </a>
                      )}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
        {hasInsurance && (
          <section aria-labelledby="insurance" className={`${card} min-[900px]:col-start-1`}>
            <h2 id="insurance" className={heading}>
              Insurance and cost
            </h2>
            <div className="mt-2">
              <Field name="Accepts insurance">{program.acceptsInsurance && insuranceAnswer[program.acceptsInsurance]}</Field>
              {values.insurance.length > 0 && (
                <ul aria-label="Insurance plans" className="mt-2 flex flex-wrap gap-1.5">
                  {values.insurance.map((key) => (
                    <Tag key={key}>{labelOf(key)}</Tag>
                  ))}
                </ul>
              )}
              <Field name="Cost">{values.cost.map(labelOf).join(", ")}</Field>
              <Field name="Eligibility notes">{program.eligibilityNotes}</Field>
            </div>
          </section>
        )}
        {hasWho && (
          <section aria-labelledby="who" className={`${card} min-[900px]:col-start-1`}>
            <h2 id="who" className={heading}>
              Languages and who it&apos;s for
            </h2>
            <div className="mt-2">
              <Field name="Languages">{values.language.map(labelOf).join(", ")}</Field>
              <Field name="Who it's for">{values.whoItServes.map(labelOf).join(", ")}</Field>
            </div>
          </section>
        )}
        {siblings.length > 0 && (
          <section aria-labelledby="more" className={`${card} min-[900px]:col-start-2`}>
            <h2 id="more" className={heading}>
              More from {organization.name}
            </h2>
            <p className="text-sm text-muted">Other programs at the same organization. Contacts and insurance may differ.</p>
            <ul className="mt-2">
              {siblings.slice(0, MORE_LIMIT).map((other) => (
                <li key={other.id} className="border-t border-line">
                  <a href={detailsHref(other.id, search)} className="flex min-h-11 items-center justify-between gap-2 py-2">
                    <span>
                      <span className="block">{other.name}</span>
                      <span className="block text-sm text-muted">
                        {[...other.facetValues.category, ...other.facetValues.subcategory].map(labelOf).join(" · ")}
                      </span>
                    </span>
                    <ArrowRight aria-hidden="true" className="size-4 shrink-0 text-primary-text" />
                  </a>
                </li>
              ))}
            </ul>
            <a href={orgHref} className="mt-2 flex min-h-11 items-center font-bold text-primary-text underline min-[900px]:min-h-6">
              See all {siblings.length + 1} programs at {organization.name}
            </a>
          </section>
        )}
      </div>
      {program.lastVerified && (
        <p className="mt-4 text-sm text-muted">Last verified {verified.format(new Date(program.lastVerified))}</p>
      )}
      <ResizeReporter />
    </main>
  );
}
