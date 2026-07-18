import { redirect } from "next/navigation";

/** Legacy /profile → Settings hub (Profile tab) */
export default function ProfileRedirectPage() {
  redirect("/settings?tab=profile");
}
