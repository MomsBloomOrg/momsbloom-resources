"use client";

import { useActionState, useState } from "react";
import {
  Badge,
  Notice,
  buttonClass,
  inputClass,
  labelClass,
  stackRowClass,
  stackTableClass,
  stackTbodyClass,
  stackTdClass,
  stackTheadClass,
  stackTheadRowClass,
  thClass,
} from "../_components/ui";
import { addStaffAdminAction, removeStaffAdminAction, type StaffAdminFormState } from "./actions";

const idle: StaffAdminFormState = { result: "idle" };

function Message({ state }: { state: StaffAdminFormState }) {
  if (state.result === "idle") return null;
  return state.result === "error" ? (
    <Notice tone="error" role="alert">{state.message}</Notice>
  ) : (
    <Notice tone="success" role="status">{state.message}</Notice>
  );
}

/** Email field and Add button. Adding sends no email: the page message tells staff to send the person to /login. */
export function AddStaffAdminForm() {
  const [state, action, pending] = useActionState(addStaffAdminAction, idle);
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="add-staff-admin" className={labelClass}>
        Email address
      </label>
      <div className="flex flex-wrap gap-2">
        <input id="add-staff-admin" name="email" type="email" required maxLength={254} autoComplete="off" className={`${inputClass} max-w-sm`} />
        <button type="submit" disabled={pending} className={buttonClass("primary", "sm")}>
          {pending ? "Adding…" : "Add Staff admin"}
        </button>
      </div>
      <Message state={state} />
    </form>
  );
}

export interface StaffAdminRow {
  email: string;
  /** "Owner", or "Added <date>". */
  label: string;
  owner: boolean;
  /** The row id when this row can be removed (an added Staff admin that is not you); else null. */
  removeId: string | null;
  you: boolean;
}

/**
 * The Staff admin table. One remove action for the table, so its message shows above the table and
 * stays after the removed row is gone. Remove has a confirm step on the page (not a browser dialog),
 * so the warning that the person is logged out at once is part of the page.
 */
export function StaffAdminTable({ rows }: { rows: StaffAdminRow[] }) {
  const [state, action, pending] = useActionState(removeStaffAdminAction, idle);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <Message state={state} />
      <table role="table" className={stackTableClass}>
        <caption className="sr-only">Staff admins</caption>
        <thead role="rowgroup" className={stackTheadClass}>
          <tr role="row" className={stackTheadRowClass}>
            <th role="columnheader" scope="col" className={thClass}>Email</th>
            <th role="columnheader" scope="col" className={thClass}>Kind</th>
            <th role="columnheader" scope="col" className={thClass}><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody role="rowgroup" className={stackTbodyClass}>
          {rows.map((row) => (
            <tr key={row.email} role="row" className={stackRowClass}>
              <td role="cell" className={`${stackTdClass} font-semibold [overflow-wrap:anywhere]`}>
                {row.email}
                {row.you && <span className="font-normal text-muted"> (you)</span>}
              </td>
              <td role="cell" data-label="Kind" className={stackTdClass}>
                <Badge tone={row.owner ? "good" : "neutral"}>{row.label}</Badge>
              </td>
              <td role="cell" className={`${stackTdClass} lg:text-right`}>
                {row.removeId === null ? null : confirmId === row.removeId ? (
                  <form action={action} className="flex flex-col gap-2 lg:items-end">
                    <input type="hidden" name="id" value={row.removeId} />
                    <p role="alert" className="text-sm font-semibold">
                      Remove {row.email}? They are logged out at once and can no longer log in.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button type="submit" disabled={pending} className={buttonClass("danger", "sm")}>
                        {pending ? "Removing…" : "Yes, remove"}
                      </button>
                      <button type="button" disabled={pending} onClick={() => setConfirmId(null)} className={buttonClass("secondary", "sm")}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => setConfirmId(row.removeId)} aria-label={`Remove ${row.email}`} className={buttonClass("danger", "sm")}>
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
