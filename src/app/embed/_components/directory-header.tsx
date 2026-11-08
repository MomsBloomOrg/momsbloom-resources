/** Title and intro. Shared by the page and the error screen so the header does not jump. */
export function DirectoryHeader() {
  return (
    <header className="text-center">
      <h1 className="text-3xl font-extrabold md:text-4xl">Pregnancy &amp; Postpartum Resources</h1>
      <p className="mx-auto mt-3 max-w-2xl text-lg">Local support, services, and resources for families in Kent County, Michigan.</p>
    </header>
  );
}
