import type { Metadata } from "next";
import { ArrowLeft, Globe, MapPin, Phone, User } from "lucide-react";
import { publicCustomValues } from "@/custom-fields/values";
import { parseDirectoryQuery, serializeDirectoryQuery, shareSearch } from "@/directory/query";
import { facetLabelLookup } from "@/directory/search";
import { getDirectorySnapshot } from "@/directory/snapshot";
import { EMBED_ROOT_ID } from "@/embed/protocol";
import { addressText, formatText, organizationHref, supportTags, Tag, telHref, webUrl, type LabelOf } from "../../_components/program-card";
import { AnalyticsReporter } from "../../_components/analytics-reporter";
import { CustomField, Field, RequestUpdate } from "../../_components/detail-fields";
import { ProgramMap } from "../../_components/program-map";
import { ProgramRows } from "../../_components/program-rows";
import { ResizeReporter } from "../../_components/resize-reporter";

export const metadata: Metadata = {
  title: "MomsBloom Resource Directory",
  robots: { index: false, follow: true },
};

/** Block on the server and send the full HTML, so the page works without JavaScript (cacheComponents). */
export const instant = false;

const MORE_LIMIT = 3;
const backLink = "flex min-h-11 w-fit items-center gap-2 font-bold text-primary-text min-[900px]:min-h-6";
const card = "rounded-2xl border border-line bg-surface p-5";
const heading = "text-base font-extrabold";
const pill = "flex min-h-11 items-center gap-2 rounded-full border px-4 font-bold min-[900px]:min-h-10 min-[900px]:text-sm";
const pillPlain = `${pill} border-line bg-surface`;
const link = "flex min-h-11 items-center font-bold text-primary-text underline min-[900px]:min-h-6";
const verified = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const insuranceAnswer = { yes: "Yes", no: "No", "not-applicable": "Not applicable" } as const;

/**
 * The detail view of one Program (docs/specs/public-directory.md, "Program detail"), no-map design.
 * Two columns from 900 px; below that one column with the actions on top. Unknown or Inactive IDs are
 * not in the snapshot: they show a note and a link back to the results. An inline page, not redirect():
 * with cacheComponents the response has started, so a redirect needs JavaScript.
 *
 * Keep all content inside EMBED_ROOT_ID: ResizeReporter measures it. `data-scroll-top` makes the host page
 * scroll to the top of the iframe when the page opens.
 */
export default async function ProgramDetailPage({ params, searchParams }: PageProps<"/embed/programs/[id]">) {
  const [{ id }, rawQuery] = await Promise.all([params, searchParams]);
  const query = parseDirectoryQuery(rawQuery);
  const search = serializeDirectoryQuery(query);
  const snapshot = await getDirectorySnapshot();
  const program = snapshot.programs.find((candidate) => candidate.id === id);
  if (!program) {
    return (
      <main id={EMBED_ROOT_ID} data-scroll-top="" className="mx-auto w-full max-w-6xl px-4 py-6">
        <p role="status">That resource isn&apos;t available anymore.</p>
        <a href={`/embed${search ? `?${search}` : ""}`} className={`${backLink} mt-4`}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to results
        </a>
        <ResizeReporter share={shareSearch(query)} />
      </main>
    );
  }

  const findLabel = facetLabelLookup(snapshot.facets);
  const labelOf: LabelOf = (facet, key) => findLabel(facet, key) ?? key;
  const values = program.facetValues;
  const { address, organization } = program;
  const place = address && !program.virtualOnly ? addressText(address) : null;
  const orgHref = `/embed?org=${organization.id}`;
  const siblings = snapshot.programs.filter((other) => other.organization.id === organization.id && other.id !== program.id);
  const tags = supportTags(values, labelOf);
  const website = webUrl(program.website);
  const hasInsurance = Boolean(program.acceptsInsurance || values.insurance.length || values.cost.length || program.eligibilityNotes);
  const hasWho = values.language.length > 0 || values.whoItServes.length > 0;
  const programDetails = publicCustomValues(snapshot.customFields, "program", program.custom);
  const organizationDetails = publicCustomValues(snapshot.customFields, "organization", program.organizationCustom);
  const newTab = <span className="sr-only"> (opens in a new tab)</span>;

  const hasActions = Boolean(program.phone || place || website);
  // Both action bars are in the page, one for each layout, so the tab order matches the screen.
  const actionBar = (className: string) =>
    hasActions && (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {program.phone && (
          <a href={telHref(program.phone)} data-event="program_call" data-program-id={program.id} data-program-name={program.name} className={`${pill} border-primary-text bg-primary-text text-white`}>
            <Phone aria-hidden="true" className="size-4" />
            Call<span className="sr-only"> {program.phone}</span>
          </a>
        )}
        {place && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`}
            data-event="program_directions"
            data-program-id={program.id} data-program-name={program.name}
            target="_blank"
            rel="noopener"
            className={pillPlain}
          >
            <MapPin aria-hidden="true" className="size-4" />
            Directions{newTab}
          </a>
        )}
        {website && (
          <a href={website} data-event="program_website" data-program-id={program.id} data-program-name={program.name} target="_blank" rel="noopener" className={pillPlain}>
            <Globe aria-hidden="true" className="size-4" />
            Website{newTab}
          </a>
        )}
      </div>
    );

  return (
    <main id={EMBED_ROOT_ID} data-scroll-top="" className="mx-auto w-full max-w-6xl px-4 py-6">
      <a
        href={`/embed?${search}#program-${program.id}`}
        className={backLink}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        {query.q ? `Back to results for “${query.q}”` : "Back to results"}
      </a>
      <p className="flex min-h-11 items-center gap-1 text-muted min-[900px]:mt-2 min-[900px]:min-h-6">
        Part of{" "}
        <a href={organizationHref(organization.id, search)} className="font-bold text-primary-text underline">
          {organization.name}
        </a>
      </p>
      <h1 className="mt-1 text-3xl font-extrabold min-[900px]:text-5xl">{program.name}</h1>
      {tags.length > 0 && (
        <ul aria-label="Type of support" className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Tag key={tag.id}>{tag.label}</Tag>
          ))}
        </ul>
      )}
      {actionBar("mt-4 min-[900px]:hidden")}

      {/* Two stacks from 900 px, so each column packs its own cards from the top (one shared grid lined up
          rows across the columns and left gaps). Below 900 px the stacks are `contents`, and `order-*` puts the
          cards in the mobile order: About, Location, Contacts, Insurance, Languages, More details, the
          Organization's details, More from. */}
      <div className="mt-6 flex flex-col gap-4 min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_25rem] min-[900px]:items-start">
        <div className="contents min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-4">
          <section aria-labelledby="about" className={`${card} order-1`}>
            <h2 id="about" className={heading}>
              About
            </h2>
            <p className="mt-2">{program.description}</p>
          </section>
          {program.contacts.length > 0 && (
            <section aria-labelledby="contact" className={`${card} order-3`}>
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
                          <a href={telHref(contact.phone)} data-event="program_call" data-program-id={program.id} data-program-name={program.name} className={link}>
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
            <section aria-labelledby="insurance" className={`${card} order-4`}>
              <h2 id="insurance" className={heading}>
                Insurance and cost
              </h2>
              <div className="mt-2">
                <Field name="Accepts insurance">{program.acceptsInsurance && insuranceAnswer[program.acceptsInsurance]}</Field>
                {values.insurance.length > 0 && (
                  <ul aria-label="Insurance plans" className="mt-2 flex flex-wrap gap-1.5">
                    {values.insurance.map((key) => (
                      <Tag key={key}>{labelOf("insurance", key)}</Tag>
                    ))}
                  </ul>
                )}
                <Field name="Cost">{values.cost.map((key) => labelOf("cost", key)).join(", ")}</Field>
                <Field name="Eligibility notes">{program.eligibilityNotes}</Field>
              </div>
            </section>
          )}
          {hasWho && (
            <section aria-labelledby="who" className={`${card} order-5`}>
              <h2 id="who" className={heading}>
                Languages and who it&apos;s for
              </h2>
              <div className="mt-2">
                <Field name="Languages">{values.language.map((key) => labelOf("language", key)).join(", ")}</Field>
                <Field name="Who it's for">{values.whoItServes.map((key) => labelOf("whoItServes", key)).join(", ")}</Field>
              </div>
            </section>
          )}
          {programDetails.length > 0 && (
            <section aria-labelledby="details" className={`${card} order-6`}>
              <h2 id="details" className={heading}>
                More details
              </h2>
              <div className="mt-2">
                {programDetails.map((field) => (
                  <CustomField key={field.fieldId} field={field} />
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="contents min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-4">
          {actionBar(`${card} hidden min-[900px]:flex`)}
          <section aria-labelledby="location" className={`${card} order-2`}>
            <h2 id="location" className={heading}>
              Location and hours
            </h2>
            {program.location && !program.virtualOnly && (
              <div className="mt-2">
                <ProgramMap
                  compact
                  programs={[
                    {
                      id: program.id,
                      number: 1,
                      name: program.name,
                      organizationName: organization.name,
                      distanceMiles: null,
                      lat: program.location.lat,
                      lng: program.location.lng,
                      detailsHref: "",
                      directionsHref: "",
                    },
                  ]}
                />
              </div>
            )}
            <div className="mt-2">
              <Field name="Address">
                {place && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`} data-event="program_directions" data-program-id={program.id} data-program-name={program.name} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center underline min-[900px]:min-h-6">
                    {place}
                    {newTab}
                  </a>
                )}
              </Field>
              <Field name="Hours">{program.hours}</Field>
              <Field name="How you'll connect">{formatText(values.format, labelOf)}</Field>
            </div>
          </section>
          {organizationDetails.length > 0 && (
            <section aria-labelledby="org-details" className={`${card} order-7`}>
              <h2 id="org-details" className={heading}>
                About {organization.name}
              </h2>
              <div className="mt-2">
                {organizationDetails.map((field) => (
                  <CustomField key={field.fieldId} field={field} />
                ))}
              </div>
            </section>
          )}
          {siblings.length > 0 && (
            <section aria-labelledby="more" className={`${card} order-8`}>
              <h2 id="more" className={heading}>
                More from {organization.name}
              </h2>
              <p className="text-sm text-muted">Other programs at the same organization. Contacts and insurance may differ.</p>
              <ProgramRows programs={siblings.slice(0, MORE_LIMIT)} labelOf={labelOf} search={search} />
              <a href={orgHref} className="mt-2 flex min-h-11 items-center font-bold text-primary-text underline min-[900px]:min-h-6">
                See all {siblings.length + 1} programs at {organization.name}
              </a>
            </section>
          )}
        </div>
      </div>
      <p className="mt-4 text-sm text-muted">
        {program.lastVerified && <>Last verified {verified.format(new Date(program.lastVerified))}. </>}
        <RequestUpdate record={`${program.name} (Program ${program.id})`} />
      </p>
      <ResizeReporter share={shareSearch(query)} program={program.id} />
      <AnalyticsReporter programId={program.id} programName={program.name} />
    </main>
  );
}
