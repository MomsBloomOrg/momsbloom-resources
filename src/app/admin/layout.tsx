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
      <Image src={logo} alt="MomsBloom" priority className="h-8 w-auto sm:h-10" />
      <span className="text-lg font-normal sm:border-l sm:border-line sm:pl-4 sm:text-xl">Resource Directory Admin</span>
    </Link>
  );
}

/** The logged-in email and Sign out. Reads the session, so it is inside Suspense. */
async function AdminUser() {
  const admin = await getCurrentStaffAdmin();
  if (!admin) return null;
  return (
    <div className="flex items-center gap-4 text-sm">
      <span>{admin.email}</span>
      <form action={signOutAction}>
        <button type="submit" className="font-semibold underline decoration-1 underline-offset-2 hover:decoration-2">
          Sign out
        </button>
      </form>
    </div>
  );
}

/**
 * The Admin shell. Each page checks the login itself with `requireStaffAdmin()`; this layout does
 * not. The nav links are static text, so they show before the login check.
 *
 * Styled after momsbloom.org: a white top strip with the orange logo (as on the site; orange on
 * sage would be about 1.6:1), a full-width sage band (`secondary`) for the nav, then a white page in
 * light Nunito. Text on the sage band is `ink` (about 8:1); `muted` and `primary-text` fall to about
 * 3:1 there, so they are not used in the band.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface font-light tracking-[.02em] text-ink">
      <header>
        <div className="px-4 sm:px-8">
          <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 py-4">
            <AdminHomeLink />
            <Suspense fallback={<div className="h-6" />}>
              <AdminUser />
            </Suspense>
          </div>
        </div>
        <div className="bg-secondary px-4 pt-2 sm:px-8">
          <div className="mx-auto w-full max-w-5xl">
            <Suspense fallback={<div className="h-11" />}>
              <AdminNavLinks />
            </Suspense>
          </div>
        </div>
      </header>
      <main id="admin-main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-8 sm:px-8 sm:py-12">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
