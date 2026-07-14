"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

// Segmented light/dark switch. Applies the theme by setting data-theme on <html>
// (the CSS variables flip there) and persists the choice to localStorage. A tiny
// inline script in the root layout applies the saved theme before paint (no flash).
export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    let saved: Theme | null = null;
    try {
      saved = localStorage.getItem("theme") as Theme | null;
    } catch {}
    const current = document.documentElement.getAttribute("data-theme") as Theme | null;
    setTheme(saved || current || "light");
  }, []);

  function apply(t: Theme) {
    setTheme(t);
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("theme", t);
    } catch {}
  }

  return (
    <div className={"theme-toggle" + (className ? " " + className : "")} role="group" aria-label="Theme">
      <button
        type="button"
        className={"theme-opt" + (theme === "light" ? " active" : "")}
        onClick={() => apply("light")}
        title="Light mode"
        aria-pressed={theme === "light"}
      >
        <i className="ti ti-sun" /> <span>Light</span>
      </button>
      <button
        type="button"
        className={"theme-opt" + (theme === "dark" ? " active" : "")}
        onClick={() => apply("dark")}
        title="Dark mode"
        aria-pressed={theme === "dark"}
      >
        <i className="ti ti-moon" /> <span>Dark</span>
      </button>
    </div>
  );
}
