import { redirect } from "next/navigation";

// Test connection check
export default function Home() {
  redirect("/login");
}
