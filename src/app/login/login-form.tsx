"use client";

import { useActionState } from "react";
import { requestMagicLink, type LoginState } from "./actions";

const initial: LoginState = { result: "idle" };

export function LoginForm() {
  const [state, action, pending] = useActionState(requestMagicLink, initial);

  if (state.result === "sent") {
    return (
      <p role="status" className="rounded-lg border-l-4 border-secondary bg-surface px-4 py-3">
        If <strong className="font-semibold">{state.email}</strong> is on the staff list, we sent a Login link.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="email" className="font-semibold">
        Email
      </label>
      <input
        id="email"
        name="email"
        type="email"
        autoComplete="email"
        required
        className="w-full rounded-lg border border-line bg-surface px-4 py-2"
      />
      {state.result === "error" && (
        <p role="alert" className="text-primary-text">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-full bg-primary-text px-6 py-3 font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send Login link"}
      </button>
    </form>
  );
}
