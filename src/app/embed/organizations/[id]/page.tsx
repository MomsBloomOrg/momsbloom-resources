import type { Metadata } from "next";
import { ArrowLeft, Globe, MapPin, Phone } from "lucide-react";
import { publicCustomValues } from "@/custom-fields/values";
import { parseDirectoryQuery, serializeDirectoryQuery, shareSearch } from "@/directory/query";
import { facetLabelLookup } from "@/directory/search";
import { getDirectorySnapshot } from "@/directory/snapshot";
import { EMBED_ROOT_ID } from "@/embed/protocol";
import { addressText, supportTags, Tag, telHref, webUrl, type LabelOf } from "../../_components/program-card";
import { AnalyticsReporter } from "../../_components/analytics-reporter";
import { CustomField } from "../../_components/detail-fields";
import { HelpBox } from "../../_components/help-box";
import { ProgramMap } from "../../_components/program-map";
import { ProgramRows } from "../../_components/program-rows";
import { ResizeReporter } from "../../_components/resize-reporter";

export const metadata: Metadata = {
  title: "MomsBloom Resource Directory",
  robots: { index: false, follow: true },
};

/** Block on the server and send the full HTML, so the page works without JavaScript (cacheComponents). */
export const instant = false;

const backLink = "flex min-h-11 w-fit items-center gap-2 font-bold text-primary-text min-[900px]:min-h-6";
const card = "rounded-2xl border border-line bg-surface p-5";
const heading = "text-base font-extrabold";
const pill = "flex min-h-11 items-center gap-2 rounded-full border px-4 font-bold min-[900px]:min-h-10";
const pillPlain = `${pill} border-line bg-surface`;
const verified = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * The page for one Organization (docs/specs/public-directory.md, "Organization detail"). The same layout as
 * Program detail: two columns from 900 px; below that one column with the actions on top. Unknown or Inactive
 * IDs show a note and a link back to the results (inline, not redirect(): see Program detail).
 *
 * Keep all content inside EMBED_ROOT_ID: ResizeReporter measures it.
 */
export default async function OrganizationDetailPage({ params, searchParams }: PageProps<"/embed/organizations/[id]">) {
  const [{ id }, rawQuery] = await Promise.all([params, searchParams]);
  const query = parseDirectoryQuery(rawQuery);
  const search = serializeDirectoryQuery(query);
  const resultsHref = `/embed${search ? `?${search}` : ""}`;
  const snapshot = await getDirectorySnapshot();
  const organization = snapshot.organizations.find((candidate) => candidate.id === id);
  if (!organization) {
    return (
      <main id={EMBED_ROOT_ID} data-scroll-top="" className="mx-auto w-full max-w-6xl px-4 py-6">
        <p role="status">That resource isn&apos;t available anymore.</p>
        <a href={resultsHref} className={`${backLink} mt-4`}>
          <ArrowLeft aria-hidden="true" className="size-4" />
          Back to results
        </a>
        <ResizeReporter share={shareSearch(query)} />
      </main>
    );
  }

  const findLabel = facetLabelLookup(snapshot.facets);
  const labelOf: LabelOf = (facet, key) => findLabel(facet, key) ?? key;
  const programs = snapshot.programs.filter((program) => program.organization.id === organization.id);
  // The Facet values that any of its Programs has, in the order staff set.
  const union = (facet: "category" | "subcategory") =>
    (snapshot.facets.find((definition) => definition.key === facet)?.values ?? [])
      .map((value) => value.key)
      .filter((key) => programs.some((program) => program.facetValues[facet].includes(key)));
  const tags = supportTags({ category: union("category"), subcategory: union("subcategory") }, labelOf);
  // Public fields only: the mapper already dropped staff-only answers, and this checks the field list again.
  const details = publicCustomValues(snapshot.customFields, "organization", organization.custom);
  const place = organization.address ? addressText(organization.address) : null;
  const website = webUrl(organization.website);
  const newTab = <span className="sr-only"> (opens in a new tab)</span>;

  const hasActions = Boolean(organization.phone || place || website);
  // Both action bars are in the page, one for each layout, so the tab order matches the screen.
  const actionBar = (className: string) =>
    hasActions && (
      <div className={`flex flex-wrap gap-2 ${className}`}>
        {organization.phone && (
          <a href={telHref(organization.phone)} className={`${pill} border-primary-text bg-primary-text text-white`}>
            <Phone aria-hidden="true" className="size-4" />
            Call<span className="sr-only"> {organization.phone}</span>
          </a>
        )}
        {place && (
          <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(place)}`} target="_blank" rel="noopener" className={pillPlain}>
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
      <a href={resultsHref} className={backLink}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        {query.q ? `Back to results for “${query.q}”` : "Back to results"}
      </a>
      <h1 className="mt-1 text-3xl font-extrabold min-[900px]:mt-2 min-[900px]:text-5xl">{organization.name}</h1>
      {tags.length > 0 && (
        <ul aria-label="Type of support" className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <Tag key={tag.id}>{tag.label}</Tag>
          ))}
        </ul>
      )}
      {actionBar("mt-4 min-[900px]:hidden")}

      {/* Two stacks from 900 px, as on Program detail. Below 900 px the stacks are `contents`, and `order-*`
          puts the cards in the mobile order: About, More details, Programs, Location. */}
      <div className="mt-6 flex flex-col gap-4 min-[900px]:grid min-[900px]:grid-cols-[minmax(0,1fr)_22rem] min-[900px]:items-start">
        <div className="contents min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-4">
          {organization.about && (
            <section aria-labelledby="about" className={`${card} order-1`}>
              <h2 id="about" className={heading}>
                About
              </h2>
              <p className="mt-2">{organization.about}</p>
            </section>
          )}
          {details.length > 0 && (
            <section aria-labelledby="details" className={`${card} order-2`}>
              <h2 id="details" className={heading}>
                More details
              </h2>
              <div className="mt-2">
                {details.map((field) => (
                  <CustomField key={field.fieldId} field={field} />
                ))}
              </div>
            </section>
          )}
          {programs.length > 0 && (
            <section aria-labelledby="programs" className={`${card} order-3`}>
              <h2 id="programs" className={heading}>
                Programs at {organization.name}
              </h2>
              <p className="text-sm text-muted">Contacts and insurance may differ for each program.</p>
              <ProgramRows programs={programs} labelOf={labelOf} search={search} />
            </section>
          )}
        </div>
        <div className="contents min-[900px]:flex min-[900px]:flex-col min-[900px]:gap-4">
          {actionBar(`${card} hidden min-[900px]:flex`)}
          {(place || organization.location) && (
            <section aria-labelledby="location" className={`${card} order-4`}>
              <h2 id="location" className={heading}>
                Location
              </h2>
              {organization.location && (
                <div className="mt-2">
                  <ProgramMap
                    compact
                    programs={[
                      {
                        id: organization.id,
                        number: 1,
                        name: organization.name,
                        organizationName: organization.name,
                        distanceMiles: null,
                        lat: organization.location.lat,
                        lng: organization.location.lng,
                        detailsHref: "",
                        directionsHref: "",
                      },
                    ]}
                  />
                </div>
              )}
              {place && (
                <div className="mt-2">
                  <p className="text-sm text-muted">Address</p>
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`} target="_blank" rel="noopener" className="inline-flex min-h-11 items-center underline min-[900px]:min-h-6">
                    {place}
                    {newTab}
                  </a>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
      {programs.length === 0 && (
        <div className="mt-4">
          <HelpBox />
        </div>
      )}
      {organization.lastVerified && (
        <p className="mt-4 text-sm text-muted">Last verified {verified.format(new Date(organization.lastVerified))}</p>
      )}
      <ResizeReporter share={shareSearch(query)} />
      <AnalyticsReporter organizationId={organization.id} organizationName={organization.name} />
    </main>
  );
}
