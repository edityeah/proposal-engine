"use client";

import { useEffect, useRef, useState } from "react";

export interface Model { id: string; label: string; hint?: string; provider?: string }

const GROUP_LABEL: Record<string, string> = {
  auto: "",
  anthropic: "Claude (Anthropic)",
  openai: "OpenAI",
  gemini: "Google Gemini",
};
const GROUP_ORDER = ["auto", "anthropic", "openai", "gemini"];

// Custom dropdown (not a native <select>) so the trigger + menu are fully
// styled and consistent across browsers/OSes. Shows a human, task-oriented hint
// under each model, groups by provider, and pins the "Auto" pick at the top.
export default function ModelPicker({
  models,
  value,
  onChange,
  disabled,
  up,
}: {
  models: Model[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  up?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = models.find((m) => m.id === value);
  const isAuto = value === "auto";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Preserve incoming order within each provider group.
  const groups = GROUP_ORDER
    .map((g) => ({ key: g, label: GROUP_LABEL[g], items: models.filter((m) => (m.provider || "anthropic") === g) }))
    .filter((grp) => grp.items.length > 0);

  return (
    <div className="mp" ref={ref}>
      <button type="button" className={"mp-trigger" + (isAuto ? " auto" : "")} disabled={disabled} onClick={() => setOpen((o) => !o)}>
        {isAuto && <i className="ti ti-sparkles mp-auto-ico" />}
        <span className="mp-label">{current?.label || "Model"}</span>
        <i className={"ti " + (up ? "ti-chevron-up" : "ti-chevron-down")} />
      </button>
      {open && (
        <div className={"mp-menu" + (up ? " up" : "")}>
          {groups.map((grp) => (
            <div key={grp.key} className="mp-group">
              {grp.label && <div className="mp-group-head">{grp.label}</div>}
              {grp.items.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  className={"mp-item" + (m.id === value ? " sel" : "") + (m.id === "auto" ? " auto" : "")}
                  onClick={() => { onChange(m.id); setOpen(false); }}
                >
                  {m.id === "auto" && <i className="ti ti-sparkles mp-auto-ico" />}
                  <span className="mp-item-text">
                    <span className="mp-item-name">{m.label}</span>
                    {m.hint && <span className="mp-item-hint">{m.hint}</span>}
                  </span>
                  {m.id === value && <i className="ti ti-check mp-item-check" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
