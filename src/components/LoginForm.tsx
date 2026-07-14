"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm({ dev }: { dev: boolean }) {
  const [email, setEmail] = useState("");

  // On the login screen in dev, treat the user as signed out until they pick.
  useEffect(() => {
    if (dev) document.cookie = "cg-dev-role=; path=/; max-age=0";
  }, [dev]);

  function devLogin(role: "operator" | "admin") {
    document.cookie = `cg-dev-role=${role}; path=/; max-age=31536000`;
    window.location.assign("/"); // full nav so the server re-reads the cookie
  }

  if (!dev) {
    return (
      <div className="login-form">
        <div className="login-illus">
          <span className="login-illus-badge"><i className="ti ti-file-text" /></span>
          <span className="login-illus-spark"><i className="ti ti-sparkles" /></span>
        </div>
        <div className="login-title">ConveGenius Engine</div>
        <p className="sub">Sign in with your @convegenius.ai account.</p>
        <button
          className="btn btn-primary login-btn"
          style={{ marginTop: 22 }}
          onClick={() => signIn("google", { callbackUrl: "/" })}
        >
          <i className="ti ti-brand-google" /> Continue with Google
        </button>
        <p className="login-terms">By continuing, you agree to our Terms of Service and Privacy Policy.</p>
      </div>
    );
  }

  return (
    <div className="login-form">
      <div className="login-illus">
        <span className="login-illus-badge"><i className="ti ti-file-text" /></span>
        <span className="login-illus-spark"><i className="ti ti-sparkles" /></span>
      </div>
      <div className="login-title">ConveGenius Engine</div>
      <p className="sub">Two demo accounts — pick a portal to enter.</p>
      <input
        className="login-email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="name@convegenius.ai"
      />
      <button className="btn btn-primary login-btn" style={{ marginTop: 14 }} onClick={() => devLogin("operator")}>
        <i className="ti ti-user" /> Sign in as User
      </button>
      <div className="login-divider">or</div>
      <button className="btn btn-outline login-btn" onClick={() => devLogin("admin")}>
        <i className="ti ti-shield-lock" /> Sign in as Admin
      </button>
      <p className="login-terms">
        <strong>user@convegenius.ai</strong> → user portal · <strong>admin@convegenius.ai</strong> → admin portal.
      </p>
    </div>
  );
}
