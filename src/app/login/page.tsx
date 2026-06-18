import { redirect } from "next/navigation";
import { auth, signIn } from "@/lib/auth";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/");

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <svg viewBox="0 0 24 24" fill="none" width="26" height="26">
            <path
              d="M12 3C8 3 4 6 4 10c0 3 2 5.5 5 6.5V21h6v-4.5c3-1 5-3.5 5-6.5 0-4-4-7-8-7z"
              fill="rgba(255,255,255,0.95)"
            />
            <circle cx="9" cy="10" r="1.5" fill="rgba(26,122,114,0.8)" />
            <circle cx="15" cy="10" r="1.5" fill="rgba(26,122,114,0.8)" />
          </svg>
        </div>
        <div className="login-title">ConveGenius Pre Sales Engine</div>
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
