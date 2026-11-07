import { redirect } from "next/navigation";

/** Filter options has one page for each Facet; Categories is the first. */
export default function SettingsPage() {
  redirect("/admin/settings/category");
}
