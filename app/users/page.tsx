import { redirect } from "next/navigation";

/** Legacy /users → Settings hub (Users tab) */
export default function UsersRedirectPage() {
  redirect("/settings?tab=users");
}
