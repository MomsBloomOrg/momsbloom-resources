import { IS_SAMPLE_DATA } from "@/directory/snapshot";

/** Title, intro, and the "Sample data" note. Shared by the page, the loading skeleton, and the error screen so nothing jumps. */
export function DirectoryHeader() {
  return (
    <header className="text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-muted">Located in Kent County</p>
      <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Postpartum Resources</h1>
      <p className="mx-auto mt-3 max-w-xl text-muted">
        Search local help for pregnancy and the first year after birth. Filter by what&apos;s near you, what your
        insurance covers, and the support type you need.
      </p>
      {IS_SAMPLE_DATA && (
        <p className="mx-auto mt-3 w-fit rounded-full bg-primary-soft px-3 py-1 text-xs font-bold">
          Sample data: these programs are made up while the directory is being built.
        </p>
      )}
    </header>
  );
}
