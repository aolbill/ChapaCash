import { redirect } from "next/navigation";

export default function RegisterPage() {
  redirect("/play?auth=register");
}
