"use client";

import { useEffect, useState } from "react";
import type { ModuleId } from "@/lib/types";

type RecentType = "deck" | "chat" | "proposal";
interface RecentItem {
  id: string;
  type: RecentType;
  title: string;
  at: number; // epoch ms for sorting
  url?: string | null;
}

const ICON: Record<RecentType, string> = {
  deck: "ti-file-type-ppt",
  chat: "ti-message",
  proposal: "ti-file-text",
};

async function getJson(url: string): Promise<Record<string, unknown>> {
  try {
    const r = await fetch(url);
    return r.ok ? await r.json() : {};
  } catch {
    return {};
  }
}

// Fetches the recent items relevant to the current module (per-module scope).
async function loadRecents(moduleId: ModuleId): Promise<RecentItem[]> {
  if (moduleId === "marketing") {
    const d = await getJson("/api/marketing/deck");
    const assets = (d.assets as { id: string; title: string; type: string; blobUrl: string | null; createdAt: string }[]) || [];
    return assets.map((a) => ({
      id: a.id,
      type: "deck",
      title: a.title,
      at: new Date(a.createdAt).getTime() || 0,
      url: a.blobUrl,
    }));
  }
  if (moduleId === "proposal") {
    const [p, c] = await Promise.all([getJson("/api/proposals"), getJson("/api/chat/threads")]);
    const proposals = (p.proposals as { id: string; title: string; createdAt: string }[]) || [];
    const threads = (c.threads as { id: string; title: string; updatedAt: string }[]) || [];
    const items: RecentItem[] = [
      ...proposals.map((x) => ({ id: x.id, type: "proposal" as const, title: x.title, at: new Date(x.createdAt).getTime() || 0 })),
      ...threads.map((x) => ({ id: x.id, type: "chat" as const, title: x.title, at: new Date(x.updatedAt).getTime() || 0 })),
    ];
    return items.sort((a, b) => b.at - a.at);
  }
  return [];
}

export default function SidebarRecents({
  moduleId,
  refreshKey,
  onOpenProposal,
  onOpenChat,
  onClose,
}: {
  moduleId: ModuleId;
  refreshKey: number;
  onOpenProposal: (id: string) => void;
  onOpenChat: (threadId: string) => void;
  onClose?: () => void;
}) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    let live = true;
    loadRecents(moduleId).then((r) => { if (live) setItems(r.slice(0, 15)); });
    return () => { live = false; };
  }, [moduleId, refreshKey]);

  if (moduleId === "admin") return null;

  function open(it: RecentItem) {
    if (it.type === "deck") { if (it.url) window.open(it.url, "_blank"); }
    else if (it.type === "proposal") onOpenProposal(it.id);
    else if (it.type === "chat") onOpenChat(it.id);
    onClose?.();
  }

  return (
    <div className="sidebar-section sidebar-recents">
      <div className="sidebar-section-label">Recents</div>
      {items.length === 0 ? (
        <div className="sidebar-recents-empty">Nothing yet.</div>
      ) : (
        items.map((it) => (
          <button key={it.type + it.id} className="recent-item" onClick={() => open(it)} title={it.title}>
            <i className={"ti " + ICON[it.type]} />
            <span>{it.title}</span>
          </button>
        ))
      )}
    </div>
  );
}
