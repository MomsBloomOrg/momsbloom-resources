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
import type { StaffRole } from "@/auth/config";
import { addStaffAdminAction, removeStaffAdminAction, setStaffAdminRoleAction, type StaffAdminFormState } from "./actions";

const idle: StaffAdminFormState = { result: "idle" };

const ROLE_OPTIONS = (
  <>
    <option value="editor">Editor</option>
    <option value="admin">Admin</option>
  </>
);

function Message({ state }: { state: StaffAdminFormState }) {
  if (state.result === "idle") return null;
  return state.result === "error" ? (
    <Notice tone="error" role="alert">{state.message}</Notice>
  ) : (
    <Notice tone="success" role="status">{state.message}</Notice>
  );
}

/** Email field, Role choice (Editor first: least access), and Add button. Adding sends no email: the page message tells staff to send the person to /login. */
export function AddStaffAdminForm() {
  const [state, action, pending] = useActionState(addStaffAdminAction, idle);
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="add-staff-admin" className={labelClass}>
        Email address
      </label>
      <div className="flex flex-wrap gap-2">
        <input id="add-staff-admin" name="email" type="email" required maxLength={254} autoComplete="off" className={`${inputClass} max-w-sm`} />
        <label htmlFor="add-staff-admin-role" className="sr-only">
          Role
        </label>
        <select id="add-staff-admin-role" name="role" defaultValue="editor" className={`${inputClass} max-w-40`}>
          {ROLE_OPTIONS}
        </select>
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
  role: StaffRole;
  /** The row id when this row can be removed and its role changed (an added Staff admin that is not you); else null. */
  removeId: string | null;
  you: boolean;
}

/**
 * Role select and Save for one row. The server refuses an Owner or yourself; the page shows no form for
 * them. The table keys it on the role, so after a change it remounts with the new role selected.
 */
function RoleForm({ row, id, action, pending }: { row: StaffAdminRow; id: string; action: (data: FormData) => void; pending: boolean }) {
  const selectId = `role-${id}`;
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <label htmlFor={selectId} className="sr-only">
        Role for {row.email}
      </label>
      <div className="flex flex-wrap gap-2">
        <select id={selectId} name="role" defaultValue={row.role} className={`${inputClass} max-w-40`}>
          {ROLE_OPTIONS}
        </select>
        <button type="submit" disabled={pending} className={buttonClass("secondary", "sm")}>
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

/**
 * The Staff admin table. One remove action and one role action for the table, so their messages show
 * above the table and stay after the removed row is gone. Remove has a confirm step on the page (not a browser dialog),
 * so the warning that the person is logged out at once is part of the page.
 */
export function StaffAdminTable({ rows }: { rows: StaffAdminRow[] }) {
  const [state, action, pending] = useActionState(removeStaffAdminAction, idle);
  const [roleState, roleAction, rolePending] = useActionState(setStaffAdminRoleAction, idle);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-4">
      <Message state={state} />
      <Message state={roleState} />
      <table role="table" className={stackTableClass}>
        <caption className="sr-only">Staff admins</caption>
        <thead role="rowgroup" className={stackTheadClass}>
          <tr role="row" className={stackTheadRowClass}>
            <th role="columnheader" scope="col" className={thClass}>Email</th>
            <th role="columnheader" scope="col" className={thClass}>Kind</th>
            <th role="columnheader" scope="col" className={thClass}>Role</th>
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
              <td role="cell" data-label="Role" className={stackTdClass}>
                {row.removeId === null ? (
                  `${row.role === "admin" ? "Admin" : "Editor"}${row.owner ? " (Owner)" : ""}`
                ) : (
                  <RoleForm key={row.role} row={row} id={row.removeId} action={roleAction} pending={rolePending} />
                )}
              </td>
              <td role="cell" className={`${stackTdClass} lg:text-right max-lg:empty:hidden`}>
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
