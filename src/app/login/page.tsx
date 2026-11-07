import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Log in — MomsBloom Resource Directory Admin",
  robots: { index: false, follow: false },
};

/** Block on the server and send the full HTML (cacheComponents), as the embed pages do. */
export const instant = false;

/** Messages for the `error` values that Auth.js sends to this page. */
const ERROR_MESSAGES: Record<string, string> = {
  Verification: "This Login link expired or was already used. Get a new link below.",
  AccessDenied: "This email cannot log in to the Admin.",
};

async function LinkError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  if (typeof error !== "string") return null;
  const message = ERROR_MESSAGES[error] ?? "Login did not work. Try again, or get a new link below.";
  return (
    <p role="alert" className="mb-6 rounded-lg border-l-4 border-primary bg-primary-soft px-4 py-3 text-primary-text">
      {message}
    </p>
  );
}

/** The Staff admin login page (ADR 0003). There are no passwords. */
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="w-full flex-1 bg-background">
      <div className="mx-auto max-w-[480px] px-6 py-12 sm:py-16">
        <h1 className="mb-4 text-3xl font-bold">Log in to the Admin</h1>
        <p className="mb-8 text-muted">Staff admins log in with a link sent by email. There are no passwords.</p>
        <Suspense>
          <LinkError searchParams={searchParams} />
        </Suspense>
        <LoginForm />
      </div>
    </main>
  );
}
