import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="login-wrap">
      <div className="login-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="ConveGenius.AI" style={{ width: 240, maxWidth: "100%", height: "auto", margin: "0 auto 20px", display: "block" }} />
        <div className="login-title">Pre Sales Engine</div>
        <div className="login-sub">Sign in with your @convegenius.ai account</div>
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/" });
          }}
        >
          <button className="btn btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>
            <i className="ti ti-brand-google" /> Continue with Google
          </button>
        </form>
      </div>
    </div>
  );
}
