import { redirect } from "next/navigation";

/** Demo has no landing/login — drop visitors straight into the live app. */
export default function Home() {
  redirect("/dashboard");
}
