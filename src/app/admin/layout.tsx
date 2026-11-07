import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentStaffAdmin } from "@/auth/dal";
import { signOutAction } from "./actions";

export const metadata: Metadata = {
  title: "Admin — MomsBloom Resource Directory",
  robots: { index: false, follow: false },
};

/** The logged-in email and Sign out. Reads the session, so it is inside Suspense. */
async function AdminUser() {
  const admin = await getCurrentStaffAdmin();
  if (!admin) return null;
  return (
    <div className="flex items-center gap-4 text-sm">
      <span className="text-muted">{admin.email}</span>
      <form action={signOutAction}>
        <button type="submit" className="font-semibold text-primary-text underline hover:text-primary-hover">
          Sign out
        </button>
      </form>
    </div>
  );
}

/**
 * The Admin shell. Each page checks the login itself with `requireStaffAdmin()`; this layout does
 * not. Nav links come with the Admin pages.
 */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-line bg-surface px-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4 py-4">
          <Link href="/admin" className="text-lg font-bold">
            Resource Directory Admin
          </Link>
          <Suspense fallback={<div className="h-6" />}>
            <AdminUser />
          </Suspense>
        </div>
      </header>
      <main id="admin-main" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
