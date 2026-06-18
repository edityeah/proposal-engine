"use client";

import { useCallback, useEffect, useState } from "react";

interface Version {
  id: string;
  version: number;
  label: string | null;
  content: string;
  createdAt: string;
}

export default function VersionHistory({
  proposalId,
  refreshKey,
  onRestore,
  onCompare,
}: {
  proposalId: string;
  refreshKey: number; // bump to refetch after a refine
  onRestore: (content: string) => void;
  onCompare: (content: string, label: string) => void;
}) {
  const [versions, setVersions] = useState<Version[]>([]);

  const load = useCallback(() => {
    fetch(`/api/proposals/${proposalId}`)
      .then((r) => r.json())
      .then((d) => setVersions(d.versions || []));
  }, [proposalId]);

  useEffect(load, [load, refreshKey]);

  async function restore(version: number) {
    const res = await fetch(`/api/proposals/${proposalId}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version }),
    });
    if (res.ok) {
      const d = await res.json();
      onRestore(d.content);
      load();
    }
  }

  if (versions.length <= 1) return null;

  return (
    <div className="output-side-card">
      <div className="output-side-title"><i className="ti ti-history" /> Version history</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {versions.map((v, idx) => (
          <div key={v.id} style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 600 }}>v{v.version}{idx === 0 && " · current"}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{v.label || "—"}</div>
            <div style={{ display: "flex", gap: 6 }}>
              <button className="btn btn-ghost" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => onCompare(v.content, `v${v.version}`)}>Compare</button>
              {idx !== 0 && <button className="btn btn-ghost" style={{ fontSize: 11, padding: "3px 8px" }} onClick={() => restore(v.version)}>Restore</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
