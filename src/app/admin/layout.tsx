import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import logo from "../_brand/momsbloom-logo.webp";
import { Suspense } from "react";
import { getCurrentStaffAdmin } from "@/auth/dal";
import { signOutAction } from "./actions";
import { AdminNavLinks } from "./_components/admin-nav-links";

export const metadata: Metadata = {
  title: "Admin — MomsBloom Resource Directory",
  robots: { index: false, follow: false },
};

/** The MomsBloom logo and "Resource Directory Admin": the link to the Admin home. */
function AdminHomeLink() {
  return (
    <Link href="/admin" className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {/* The logo's text is the alt, so the link reads "MomsBloom Resource Directory Admin". */}
      <Image src={logo} alt="MomsBloom" priority className="h-8 w-auto sm:h-11" />
      <span className="sr-only">Resource Directory Admin</span>
    </Link>
  );
}

/** The nav for the logged-in role. Reads the session, so it is inside Suspense. */
async function AdminNav() {
  const admin = await getCurrentStaffAdmin();
  return <AdminNavLinks admin={admin?.role === "admin"} />;
}

/** The logged-in email and Sign out. Reads the session, so it is inside Suspense. */
async function AdminUser() {
  const admin = await getCurrentStaffAdmin();
  if (!admin) return null;
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-muted">{admin.email}</span>
      <form action={signOutAction}>
        <button type="submit" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
          Sign out
        </button>
      </form>
    </div>
  );
}

/**
 * The Admin shell. Each page checks the login itself with `requireStaffAdmin()` or `requireAdmin()`;
 * this layout does not. The nav shows Resources only until the session is read, so the admin-only
 * links never flash for an editor.
 *
 * The Admin design ("Resource Admin List"): a white header with the orange logo and the nav, a thin
 * sage rule under it, then the warm `background` page in light Nunito.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background font-light tracking-[.02em] text-ink">
      <header className="border-b-[6px] border-secondary bg-surface px-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-10 gap-y-2 py-4 sm:py-6">
          <AdminHomeLink />
          <div className="flex flex-wrap items-center gap-x-8 gap-y-1">
            <Suspense fallback={<AdminNavLinks admin={false} />}>
              <AdminNav />
            </Suspense>
            <Suspense fallback={<div className="h-6" />}>
              <AdminUser />
            </Suspense>
          </div>
        </div>
      </header>
      <main id="admin-main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
