/** Title and intro. Shared by the page and the error screen so the header does not jump. */
export function DirectoryHeader() {
  return (
    <header className="text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-muted">Located in Kent County</p>
      <h1 className="mt-1 text-3xl font-extrabold md:text-4xl">Postpartum Resources</h1>
      <p className="mx-auto mt-3 max-w-xl text-muted">
        Search local help for pregnancy and the first year after birth. Filter by what&apos;s near you, what your
        insurance covers, and the support type you need.
      </p>
    </header>
  );
}
