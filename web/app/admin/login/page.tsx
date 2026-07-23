import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, getSessionUser } from "@/lib/auth";
import LoginForm from "./login-form";
import "../admin.css";

export default async function AdminLoginPage() {
  const jar = await cookies();
  const user = await getSessionUser(jar.get(SESSION_COOKIE)?.value);
  if (user) redirect("/admin");
  return <LoginForm />;
}
