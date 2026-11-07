"use client";

import type { ComponentProps } from "react";

/**
 * A select that submits its form as soon as it changes. Without JavaScript it is a plain select in a
 * GET form, and the form's own submit button (or Enter in the search box) applies it.
 */
export function SubmitOnChangeSelect(props: ComponentProps<"select">) {
  return <select {...props} onChange={(event) => event.currentTarget.form?.requestSubmit()} />;
}
