/** Title and intro. Shared by the page and the error screen so the header does not jump. */
export function DirectoryHeader({ className = "" }: { className?: string }) {
  return (
    <header className={`text-center ${className}`}>
      <h1 className="text-3xl font-extrabold md:text-4xl">Postpartum Resources</h1>
      <p className="mx-auto mt-3 max-w-xl text-muted">
        Find nearby support that fits your family, your insurance, and your needs.
      </p>
    </header>
  );
}
