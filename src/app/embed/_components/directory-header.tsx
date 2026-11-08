/** Title and intro. Shared by the page and the error screen so the header does not jump. */
export function DirectoryHeader() {
  return (
    <header className="text-left md:text-center">
      <h1 className="text-3xl font-medium md:text-5xl">Pregnancy &amp; Postpartum Resources</h1>
      <p className="mt-2 max-w-xl text-muted md:mx-auto">Find nearby support that fits your family, your insurance, and your needs.</p>
    </header>
  );
}
