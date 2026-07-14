"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  forId: string | null;
  forName: string | null;
  quote: string;
  body: string;
  resolved: boolean;
  createdAt: string;
}
interface DirUser { id: string; name: string | null; email: string; image: string | null }
export interface PendingComment { quote: string; rect: { left: number; top: number; bottom: number; width: number } }

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

// Find the first occurrence of `quote` inside the editor and return a Range.
function findRange(root: HTMLElement, quote: string): Range | null {
  const q = (quote || "").trim();
  if (!q) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const map: { node: Text; start: number }[] = [];
  let full = "";
  let n: Node | null;
  while ((n = walker.nextNode())) { const t = n as Text; map.push({ node: t, start: full.length }); full += t.data; }
  const idx = full.indexOf(q);
  if (idx < 0) return null;
  const locate = (pos: number) => {
    for (let i = map.length - 1; i >= 0; i--) if (map[i].start <= pos) return { node: map[i].node, offset: pos - map[i].start };
    return { node: map[0]?.node, offset: 0 };
  };
  const s = locate(idx), e = locate(idx + q.length);
  if (!s.node || !e.node) return null;
  const r = document.createRange();
  r.setStart(s.node, Math.min(s.offset, s.node.data.length));
  r.setEnd(e.node, Math.min(e.offset, e.node.data.length));
  return r;
}

export default function DocComments({
  proposalId,
  editorRef,
  pending,
  onClose,
}: {
  proposalId: string;
  editorRef: React.RefObject<HTMLDivElement | null>;
  pending: PendingComment | null;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [dir, setDir] = useState<DirUser[]>([]);
  const [open, setOpen] = useState(false);        // drawer
  const [showResolved, setShowResolved] = useState(false);
  const [body, setBody] = useState("");
  const [forId, setForId] = useState("");
  const [saving, setSaving] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(() => {
    fetch(`/api/proposals/${proposalId}/comments`).then((r) => r.json()).then((d) => setComments(d.comments || [])).catch(() => {});
  }, [proposalId]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    fetch("/api/users/directory").then((r) => r.json()).then((d) => setDir(d.users || [])).catch(() => {});
  }, []);

  // When a selection is handed in, reset the composer and focus it.
  useEffect(() => {
    if (pending) { setBody(""); setForId(""); setTimeout(() => taRef.current?.focus(), 40); }
  }, [pending]);

  const openCount = comments.filter((c) => !c.resolved).length;

  async function submit() {
    if (!pending || !body.trim()) return;
    setSaving(true);
    const forUser = dir.find((u) => u.id === forId);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote: pending.quote,
          body: body.trim(),
          forId: forUser?.id ?? null,
          forName: forUser ? forUser.name || forUser.email : null,
        }),
      });
      if (res.ok) { refresh(); setOpen(true); onClose(); }
    } finally {
      setSaving(false);
    }
  }

  async function toggleResolved(c: Comment) {
    setComments((cs) => cs.map((x) => (x.id === c.id ? { ...x, resolved: !x.resolved } : x)));
    await fetch(`/api/proposals/${proposalId}/comments/${c.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resolved: !c.resolved }),
    }).catch(() => {});
  }
  async function remove(c: Comment) {
    setComments((cs) => cs.filter((x) => x.id !== c.id));
    await fetch(`/api/proposals/${proposalId}/comments/${c.id}`, { method: "DELETE" }).catch(() => {});
  }

  // Scroll to the quoted text and flash a highlight over it.
  function locate(c: Comment) {
    const root = editorRef.current;
    if (!root) return;
    const range = findRange(root, c.quote);
    if (!range) return;
    range.startContainer.parentElement?.scrollIntoView({ block: "center" });
    requestAnimationFrame(() => {
      for (const rc of Array.from(range.getClientRects())) {
        const d = document.createElement("div");
        d.className = "cmt-flash";
        d.style.cssText = `position:fixed;left:${rc.left}px;top:${rc.top}px;width:${rc.width}px;height:${rc.height}px;`;
        document.body.appendChild(d);
        setTimeout(() => d.remove(), 1700);
      }
    });
  }

  const visible = comments.filter((c) => showResolved || !c.resolved);

  return (
    <>
      {/* Composer popover, anchored under the selection */}
      {pending && (
        <>
          <div className="cmt-scrim" onMouseDown={onClose} />
          <div
            className="cmt-composer"
            style={{
              position: "fixed",
              left: Math.max(8, Math.min(pending.rect.left, (typeof window !== "undefined" ? window.innerWidth : 1200) - 416)),
              top: pending.rect.bottom + 8,
              zIndex: 120,
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="cmt-quote"><i className="ti ti-quote" /> {pending.quote.length > 140 ? pending.quote.slice(0, 140) + "…" : pending.quote}</div>
            <textarea
              ref={taRef}
              className="cmt-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit(); } if (e.key === "Escape") onClose(); }}
              placeholder="Add a comment…"
              rows={3}
            />
            <div className="cmt-composer-bar">
              <label className="cmt-for">
                <i className="ti ti-at" />
                <select value={forId} onChange={(e) => setForId(e.target.value)}>
                  <option value="">For anyone</option>
                  {dir.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                </select>
              </label>
              <div className="cmt-composer-actions">
                <button className="btn btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
                <button className="btn btn-primary" onClick={submit} disabled={saving || !body.trim()}>
                  <i className="ti ti-message-plus" /> Comment
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Floating toggle */}
      <button className={"cmt-fab" + (open ? " on" : "")} onClick={() => setOpen((o) => !o)} title="Comments">
        <i className="ti ti-messages" />
        <span>Comments</span>
        {openCount > 0 && <span className="cmt-fab-count">{openCount}</span>}
      </button>

      {/* Drawer */}
      {open && (
        <>
          <div className="drawer-backdrop" onClick={() => setOpen(false)} />
          <aside className="drawer cmt-drawer">
            <div className="drawer-head">
              <div className="drawer-title"><i className="ti ti-messages" /> Comments</div>
              <button className="btn btn-ghost" onClick={() => setOpen(false)} aria-label="Close"><i className="ti ti-x" /></button>
            </div>
            <div className="cmt-drawer-sub">
              <span>{openCount} open{comments.length - openCount > 0 ? ` · ${comments.length - openCount} resolved` : ""}</span>
              {comments.some((c) => c.resolved) && (
                <button className="cmt-linkbtn" onClick={() => setShowResolved((v) => !v)}>{showResolved ? "Hide resolved" : "Show resolved"}</button>
              )}
            </div>
            <div className="drawer-body cmt-list">
              {visible.length === 0 ? (
                <div className="cmt-empty">
                  <i className="ti ti-message-2" />
                  <div>No comments yet.</div>
                  <div className="cmt-empty-sub">Select any text in the document and click <strong>Comment</strong>.</div>
                </div>
              ) : (
                visible.map((c) => (
                  <div key={c.id} className={"cmt-card" + (c.resolved ? " resolved" : "")}>
                    <button className="cmt-card-quote" onClick={() => locate(c)} title="Jump to the text">
                      <i className="ti ti-quote" /> {c.quote.length > 90 ? c.quote.slice(0, 90) + "…" : c.quote || "(text)"}
                    </button>
                    <div className="cmt-card-body">{c.body}</div>
                    <div className="cmt-card-meta">
                      <span className="cmt-author">{c.authorName}</span>
                      {c.forName && <span className="cmt-for-badge"><i className="ti ti-at" />{c.forName}</span>}
                      <span className="cmt-time">{timeAgo(c.createdAt)}</span>
                    </div>
                    <div className="cmt-card-actions">
                      <button onClick={() => toggleResolved(c)}>{c.resolved ? <><i className="ti ti-rotate" /> Reopen</> : <><i className="ti ti-check" /> Resolve</>}</button>
                      <button onClick={() => remove(c)}><i className="ti ti-trash" /> Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </aside>
        </>
      )}
    </>
  );
}
