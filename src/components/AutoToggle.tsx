"use client";

// Standalone "Auto" pill shown just left of the model picker. When on, the engine
// picks the best model per message; the model picker still lets the user pin a
// specific model (which turns Auto off).
export default function AutoToggle({
  on,
  onToggle,
  disabled,
}: {
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={"auto-toggle" + (on ? " on" : "")}
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={on}
      title={on ? "Auto is on — the assistant picks the best model per message" : "Auto — let the assistant pick the best model per message"}
    >
      <i className="ti ti-sparkles" />
      <span>Auto AI Model</span>
    </button>
  );
}
