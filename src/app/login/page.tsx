import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import LoginForm from "@/components/LoginForm";
import LoginPhotobooth from "@/components/LoginPhotobooth";
import Noise from "@/components/Noise";
import ThemeToggle from "@/components/ThemeToggle";

export default async function LoginPage() {
  const dev = process.env.DEV_NO_AUTH === "1";
  const session = await auth();
  // In production, an already-signed-in user skips the login screen. In dev the
  // picker always shows so you can switch between the user and admin portals.
  if (!dev && session?.user) redirect("/");

  return (
    <div className="login-split">
      <ThemeToggle className="theme-toggle-float" />
      <aside className="login-left">
        <div className="login-aurora" aria-hidden="true"><span /><span /><span /></div>
        <Noise />
        <div className="login-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ConveGenius.AI" />
        </div>
        <LoginPhotobooth />
        <blockquote className="login-quote">
          “From first RFP to a submitted PAB note in an afternoon — every draft grounded in our own winning proposals.”
          <span>— The ConveGenius Pre-Sales team</span>
        </blockquote>
      </aside>
      <main className="login-right">
        <LoginForm dev={dev} />
      </main>
    </div>
  );
}
