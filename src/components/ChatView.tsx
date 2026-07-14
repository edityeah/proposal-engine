"use client";

import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";
import ModelPicker from "./ModelPicker";
import AutoToggle from "./AutoToggle";

interface Doc { proposalId: string; title: string }
interface Msg { role: "user" | "assistant"; content: string; docs?: Doc[]; attName?: string; stopped?: boolean; autoModel?: string }
interface Model { id: string; label: string; hint?: string; provider?: string }

function md(s: string) {
  return DOMPurify.sanitize(marked.parse(s || "", { async: false }) as string, { USE_PROFILES: { html: true } });
}

export default function ChatView({
  onOpenProposal,
  openThread,
  seed,
  onThreadsChanged,
  onActiveThread,
  onNewChat,
}: {
  onOpenProposal: (id: string) => void;
  openThread?: { id: string } | null;
  seed?: { text: string; model?: string } | null;
  onThreadsChanged?: () => void; // bump the sidebar Recents when a thread is created/renamed
  onActiveThread?: (id: string | null) => void; // report the open chat so nav can reopen it
  onNewChat?: () => void; // user clicked "New chat" — clear the active chat
}) {
  const [models, setModels] = useState<Model[]>([]);
  const [model, setModel] = useState("claude-opus-4-8"); // the pinned model (used when Auto is off)
  const [auto, setAuto] = useState(false);               // Auto: engine picks the model per message
  const [autoConsent, setAutoConsent] = useState(false); // one-time OK to let Auto switch models
  const [askAuto, setAskAuto] = useState(false);         // consent prompt open
  const [modelTouched, setModelTouched] = useState(false); // did the user pick a model / touch Auto this chat?
  const [askFirstAuto, setAskFirstAuto] = useState(false); // "let AI decide?" prompt on first send
  const [promptedOnce, setPromptedOnce] = useState(false); // asked the "let AI decide?" prompt at least once (persisted)
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [tool, setTool] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [reactions, setReactions] = useState<Record<number, "up" | "down">>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [threads, setThreads] = useState<{ id: string; title: string }[]>([]);
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const threadIdRef = useRef<string | null>(null); // current thread (for the open-guard)
  const [attachment, setAttachment] = useState<{ filename: string; text: string; words: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);
  // Notify-when-ready: while a doc drafts, offer a browser notification on completion.
  const [notifyPerm, setNotifyPerm] = useState<NotificationPermission | "unsupported">("unsupported");
  const [notifyArmed, setNotifyArmed] = useState(false);
  const notifyArmedRef = useRef(false); // read inside the stream loop (avoids stale closure)
  const abortRef = useRef<AbortController | null>(null); // interrupt an in-flight response
  const turnTextRef = useRef(""); // current turn's assistant text (for source extraction)
  const [tipIndex, setTipIndex] = useState(0); // rotating loading tip
  // Right-hand doc panel (Claude-artifact style) — open a generated doc beside the chat.
  const [docPanel, setDocPanel] = useState<{ id: string; title: string; html: string } | null>(null);
  const [docLoading, setDocLoading] = useState(false);
  const [docGenerating, setDocGenerating] = useState(false); // panel shows a "drafting…" screen
  // Every document generated in THIS chat — powers the top-right "Generated
  // documents in this chat" dropdown (name + time, opens in the split panel).
  const [chatDocs, setChatDocs] = useState<{ proposalId: string; title: string; at: number }[]>([]);
  const [docsMenuOpen, setDocsMenuOpen] = useState(false);
  const docsMenuRef = useRef<HTMLDivElement>(null);
  // Web-search links surfaced in this chat (live session) — a chip beside the docs one.
  const [chatSources, setChatSources] = useState<{ url: string; title: string }[]>([]);
  const [sourcesMenuOpen, setSourcesMenuOpen] = useState(false);
  const sourcesMenuRef = useRef<HTMLDivElement>(null);
  const [docPanelPct, setDocPanelPct] = useState(48);         // doc-panel width (% of the split)
  const splitRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const seedRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) setNotifyPerm(Notification.permission);
    try {
      if (localStorage.getItem("cg-auto-consent") === "1") setAutoConsent(true);
      if (localStorage.getItem("cg-model-prompted") === "1") setPromptedOnce(true);
    } catch {}
  }, []);

  // Once the user has answered the first-send prompt OR made any model choice,
  // never ask again — persisted across new chats and revisits.
  function markPrompted() {
    try { localStorage.setItem("cg-model-prompted", "1"); } catch {}
    setPromptedOnce(true);
  }

  // Toggle Auto. Turning it on the first time asks for one consent; picking a
  // specific model from the dropdown (below) turns Auto back off.
  function toggleAuto() {
    setModelTouched(true); markPrompted();
    if (auto) { setAuto(false); return; }
    if (!autoConsent) { setAskAuto(true); return; }
    setAuto(true);
  }
  function acceptAuto() {
    try { localStorage.setItem("cg-auto-consent", "1"); } catch {}
    setAutoConsent(true); setAskAuto(false); setAuto(true); setModelTouched(true); markPrompted();
  }
  function pickModel(id: string) { setModel(id); setAuto(false); setModelTouched(true); markPrompted(); }

  // First-send prompt: user answered "yes, let AI decide" → turn Auto on and send.
  function firstAutoYes() {
    try { localStorage.setItem("cg-auto-consent", "1"); } catch {}
    setAutoConsent(true); setAuto(true); setModelTouched(true); markPrompted(); setAskFirstAuto(false);
    void send(undefined, "auto");
  }
  // "No, keep this model" → send with the currently-selected model.
  function firstAutoNo() {
    setModelTouched(true); markPrompted(); setAskFirstAuto(false);
    void send(undefined, model);
  }

  // Cycle a fresh random tip every few seconds while the bot is working.
  useEffect(() => {
    if (!busy) return;
    setTipIndex(Math.floor(Math.random() * LOADING_TIPS.length));
    const iv = window.setInterval(() => setTipIndex((i) => (i + 1) % LOADING_TIPS.length), 3800);
    return () => window.clearInterval(iv);
  }, [busy]);

  // Ask for browser-notification permission (user gesture), then arm the on-done ping.
  async function armNotify() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    let perm = Notification.permission;
    if (perm === "default") perm = await Notification.requestPermission();
    setNotifyPerm(perm);
    if (perm === "granted") { notifyArmedRef.current = true; setNotifyArmed(true); }
  }

  // Tab-title flash — a fallback that surfaces "document ready" even when the OS
  // suppresses the system banner (a focused tab, or Do Not Disturb / Focus on).
  const origTitleRef = useRef<string>("");
  const flashRef = useRef<number | null>(null);
  function stopTitleFlash() {
    if (flashRef.current !== null) { window.clearInterval(flashRef.current); flashRef.current = null; }
    if (origTitleRef.current) document.title = origTitleRef.current;
  }
  function startTitleFlash(msg: string) {
    if (typeof document === "undefined" || flashRef.current !== null) return;
    origTitleRef.current = document.title;
    let on = false;
    flashRef.current = window.setInterval(() => { document.title = on ? origTitleRef.current : msg; on = !on; }, 900);
  }
  useEffect(() => {
    const clear = () => { if (typeof document !== "undefined" && document.visibilityState === "visible") stopTitleFlash(); };
    if (typeof document !== "undefined") document.addEventListener("visibilitychange", clear);
    if (typeof window !== "undefined") window.addEventListener("focus", clear);
    return () => {
      if (typeof document !== "undefined") document.removeEventListener("visibilitychange", clear);
      if (typeof window !== "undefined") window.removeEventListener("focus", clear);
      stopTitleFlash();
    };
  }, []);

  // A short, pleasant "ready" chime synthesised with the Web Audio API — no asset
  // to ship, and it plays whether the tab is focused or in the background.
  const audioRef = useRef<AudioContext | null>(null);
  function playChime() {
    if (typeof window === "undefined") return;
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = audioRef.current || (audioRef.current = new AC());
      if (ctx.state === "suspended") void ctx.resume();
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      [880, 1174.66].forEach((freq, i) => { // A5 → D6, a gentle two-note rise
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.14);
        osc.connect(gain);
        osc.start(now + i * 0.14);
        osc.stop(now + i * 0.14 + 0.5);
      });
    } catch {}
  }

  // Fire the "ready" signal: sound + system notification (if armed) + a title
  // flash that shows regardless of whether the OS chose to display the banner.
  function notifyDone(title: string) {
    playChime();
    if (notifyArmedRef.current && typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      try {
        const n = new Notification("Your document is ready", { body: title, requireInteraction: true, tag: "cg-doc-ready" });
        n.onclick = () => { window.focus(); stopTitleFlash(); n.close(); };
      } catch {}
    }
    if (typeof document !== "undefined" && document.visibilityState === "hidden") startTitleFlash("✅ Document ready");
  }

  useEffect(() => {
    // Don't override a model the user picked on the Research landing (seed.model) —
    // only fall back to the server default when no model was seeded.
    fetch("/api/chat").then((r) => r.json()).then((d) => { setModels(d.models || []); if (!seed?.model) setModel(d.default || "claude-opus-4-8"); });
    if (seed?.model === "auto") setAuto(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (historyOpen) fetch("/api/chat/threads").then((r) => r.json()).then((d) => setThreads(d.threads || [])).catch(() => {});
  }, [historyOpen]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages, tool]);

  useEffect(() => { threadIdRef.current = threadId; }, [threadId]);

  // Open a thread requested from the sidebar Recents / history drawer — but NOT the
  // one already open (returning to the active chat must keep its in-progress state).
  useEffect(() => {
    if (openThread?.id && openThread.id !== threadIdRef.current) loadThread(openThread.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openThread]);

  // A message seeded from the Research landing — start a fresh chat and send it.
  useEffect(() => {
    if (seed?.text && seedRef.current !== seed.text) {
      seedRef.current = seed.text;
      setThreadId(null);
      setMessages([]);
      setTool(null);
      setReactions({});
      setThreadTitle(null);
      setChatDocs([]);
      setChatSources([]);
      setModelTouched(true); // seeded from the landing → its model choice is intentional
      if (seed.model === "auto") setAuto(true);
      else if (seed.model) { setModel(seed.model); setAuto(false); }
      void send(seed.text, seed.model);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  function newChat() { setThreadId(null); setMessages([]); setTool(null); setReactions({}); setThreadTitle(null); setChatDocs([]); setDocsMenuOpen(false); setChatSources([]); setSourcesMenuOpen(false); setDocPanel(null); setModelTouched(false); setAskFirstAuto(false); }

  async function loadThread(id: string) {
    setTool(null);
    setReactions({});
    const r = await fetch(`/api/chat/threads/${id}`);
    if (!r.ok) return;
    const d = await r.json();
    setThreadId(id);
    onActiveThread?.(id);
    if (d.thread.model === "auto") setAuto(true);
    else { setModel(d.thread.model); setAuto(false); }
    setThreadTitle(d.thread.title);
    const rows = d.messages as { role: "user" | "assistant"; content: string; proposalId: string | null; createdAt?: string }[];
    setMessages(
      rows.map((m) => ({
        role: m.role,
        content: m.content,
        docs: m.proposalId ? [{ proposalId: m.proposalId, title: "Generated document" }] : undefined,
      })),
    );
    // Rebuild this chat's document list (name + time). Titles aren't stored on the
    // message, so seed a placeholder from createdAt and backfill the real title.
    const docs = rows
      .filter((m) => m.proposalId)
      .map((m) => ({ proposalId: m.proposalId as string, title: "Generated document", at: m.createdAt ? new Date(m.createdAt).getTime() : Date.now() }));
    setChatDocs(docs);
    setDocsMenuOpen(false);
    // Rebuild the Sources chip from every assistant message (persisted marker +
    // any inline links), so reopening a chat keeps its web sources visible.
    const srcs: { url: string; title: string }[] = [];
    for (const m of rows) {
      if (m.role !== "assistant") continue;
      for (const s of parseSources(m.content)) if (!srcs.some((x) => x.url === s.url)) srcs.push(s);
    }
    setChatSources(srcs);
    setSourcesMenuOpen(false);
    docs.forEach(async (doc) => {
      try {
        const pr = await fetch(`/api/proposals/${doc.proposalId}`);
        if (!pr.ok) return;
        const { proposal } = await pr.json();
        if (proposal?.title) setChatDocs((cur) => cur.map((x) => (x.proposalId === doc.proposalId ? { ...x, title: proposal.title } : x)));
      } catch { /* keep the placeholder */ }
    });
  }

  async function send(override?: string, modelOverride?: string) {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    // First message of a brand-new chat, and the user never touched the model
    // selector or the Auto chip → offer to let the engine choose. The composer
    // keeps its text; firstAutoYes/No resume the send with an explicit model.
    if (modelOverride === undefined && threadId === null && messages.length === 0 && !auto && !modelTouched && !promptedOnce) {
      setAskFirstAuto(true);
      return;
    }
    if (override === undefined) { setInput(""); if (taRef.current) taRef.current.style.height = ""; }
    const att = attachment;
    setAttachment(null);
    setUploadErr(null);
    const useModel = modelOverride || (auto ? "auto" : model);
    setBusy(true);
    setTool(null);
    setMessages((m) => [...m, { role: "user", content: text, attName: att?.filename }, { role: "assistant", content: "" }]);
    turnTextRef.current = "";

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, message: text, model: useModel, attachment: att ? { filename: att.filename, text: att.text } : undefined }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");
      const dec = new TextDecoder();
      let buf = "";
      let curThread = threadId;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() || "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev: Record<string, unknown>;
          try { ev = JSON.parse(line); } catch { continue; }
          if (ev.t === "meta") { curThread = ev.threadId as string; setThreadId(curThread); onActiveThread?.(curThread); if (ev.title) setThreadTitle(ev.title as string); if (ev.isNew) onThreadsChanged?.(); }
          else if (ev.t === "title") { setThreadTitle(ev.title as string); onThreadsChanged?.(); }
          else if (ev.t === "model") { setMessages((m) => bumpLast(m, (a) => ({ ...a, autoModel: ev.label as string }))); }
          else if (ev.t === "source") { const url = ev.url as string; setChatSources((s) => (s.some((x) => x.url === url) ? s : [...s, { url, title: (ev.title as string) || url }])); }
          else if (ev.t === "text") { turnTextRef.current += ev.d as string; setMessages((m) => bumpLast(m, (a) => ({ ...a, content: a.content + (ev.d as string) }))); }
          else if (ev.t === "tool") {
            setTool(ev.name === "web_search" ? "Searching the web…" : "Drafting the document…");
            if (ev.name === "generate_document") {
              // Auto-open the right panel with a "drafting…" screen so the user sees progress.
              setDocGenerating(true);
              setDocPanel({ id: "", title: "Drafting your document…", html: "" });
              // Drafting can take a while — if notifications are already granted, arm silently.
              if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                notifyArmedRef.current = true; setNotifyArmed(true);
              }
            }
          }
          else if (ev.t === "doc") {
            setMessages((m) => bumpLast(m, (a) => ({ ...a, docs: [...(a.docs || []), { proposalId: ev.proposalId as string, title: ev.title as string }] }))); setTool(null);
            setDocGenerating(false);
            addChatDoc(ev.proposalId as string, (ev.title as string) || "Generated document", Date.now());
            void openDocPanel(ev.proposalId as string, ev.title as string); // swap the loading screen for the doc
            notifyDone((ev.title as string) || "Open it in the editor.");
            notifyArmedRef.current = false; setNotifyArmed(false);
          }
          else if (ev.t === "error") { setMessages((m) => bumpLast(m, (a) => ({ ...a, content: a.content + "\n\n⚠️ " + (ev.message as string) }))); }
          else if (ev.t === "done") {
            setTool(null); onThreadsChanged?.();
            // Merge any inline links from the finished answer (web_search sources
            // already arrived via {t:"source"}) so every link lands in the chip.
            const inline = parseSources(turnTextRef.current);
            if (inline.length) setChatSources((s) => { const out = [...s]; for (const x of inline) if (!out.some((y) => y.url === x.url)) out.push(x); return out; });
          }
        }
      }
    } catch (e) {
      // User pressed Stop → keep whatever streamed, no error noise.
      if (e instanceof Error && e.name === "AbortError") {
        setMessages((m) => bumpLast(m, (a) => ({ ...a, content: a.content || "_(stopped)_", stopped: true })));
      } else {
        setMessages((m) => bumpLast(m, (a) => ({ ...a, content: a.content + "\n\n⚠️ " + (e instanceof Error ? e.message : "failed") })));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setTool(null);
      // If generation ended without a doc (error/stopped), don't leave the panel
      // stuck on "Drafting…": drop the empty placeholder, keep a real doc panel.
      setDocGenerating(false);
      setDocPanel((p) => (p && !p.id ? null : p));
    }
  }

  // Interrupt an in-flight response.
  function stop() {
    abortRef.current?.abort();
  }

  // Save an edited chat title (top-bar rename).
  async function saveTitle() {
    const t = titleDraft.trim();
    setEditingTitle(false);
    if (!threadId || !t || t === threadTitle) return;
    setThreadTitle(t);
    try {
      await fetch(`/api/chat/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      onThreadsChanged?.();
    } catch {
      /* keep the optimistic title even if the save request failed */
    }
  }

  // Drag the divider to resize the doc panel (clamped 28–72% of the split width).
  function startDocDrag(e: React.MouseEvent) {
    e.preventDefault();
    const container = splitRef.current;
    if (!container) return;
    const onMove = (ev: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const pct = ((rect.right - ev.clientX) / rect.width) * 100;
      setDocPanelPct(Math.min(72, Math.max(28, pct)));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  // Open a generated doc in the right split panel (fetches its rendered content).
  // Record a document into this chat's list (dedup by id; keep insertion order).
  function addChatDoc(proposalId: string, title: string, at: number) {
    setChatDocs((d) => (d.some((x) => x.proposalId === proposalId) ? d : [...d, { proposalId, title, at }]));
  }

  // Close the chip dropdowns (docs / sources) on an outside click.
  useEffect(() => {
    if (!docsMenuOpen && !sourcesMenuOpen) return;
    function onDoc(e: MouseEvent) {
      if (docsMenuRef.current && !docsMenuRef.current.contains(e.target as Node)) setDocsMenuOpen(false);
      if (sourcesMenuRef.current && !sourcesMenuRef.current.contains(e.target as Node)) setSourcesMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [docsMenuOpen, sourcesMenuOpen]);

  async function openDocPanel(id: string, title: string) {
    setDocPanel({ id, title, html: "" });
    setDocLoading(true);
    try {
      const r = await fetch(`/api/proposals/${id}`);
      if (r.ok) {
        const { proposal } = await r.json();
        setDocPanel({ id, title: proposal.title || title, html: md(proposal.output || "") });
      }
    } catch {
      /* leave the panel with a friendly empty state */
    } finally {
      setDocLoading(false);
    }
  }

  // Re-ask the last user question (drops the trailing answer, streams a fresh one).
  function regenerate() {
    if (busy) return;
    let lastUser = "";
    for (let i = messages.length - 1; i >= 0; i--) { if (messages[i].role === "user") { lastUser = messages[i].content; break; } }
    if (!lastUser) return;
    setMessages((m) => {
      const copy = m.slice();
      while (copy.length && copy[copy.length - 1].role === "assistant") copy.pop();
      if (copy.length && copy[copy.length - 1].role === "user") copy.pop();
      return copy;
    });
    void send(lastUser);
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file later
    if (!file) return;
    setUploadErr(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await fetch("/api/rfp/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (!r.ok) { setUploadErr(d.error || "Upload failed."); return; }
      setAttachment({ filename: d.filename, text: d.text, words: d.words });
    } catch {
      setUploadErr("Upload failed. Try a text-based PDF, .docx, or .txt.");
    } finally {
      setUploading(false);
    }
  }

  async function copyMsg(text: string, i: number) {
    try { await navigator.clipboard.writeText(text); setCopied(i); setTimeout(() => setCopied((c) => (c === i ? null : c)), 1500); } catch { /* clipboard unavailable */ }
  }

  const lastIndex = messages.length - 1;

  return (
    <>
      <div className="topbar">
        <div className="topbar-left" style={{ minWidth: 0 }}>
          {editingTitle ? (
            <input
              className="chat-title-input"
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") saveTitle(); else if (e.key === "Escape") setEditingTitle(false); }}
              onBlur={saveTitle}
            />
          ) : (
            <button
              className="chat-title-btn"
              disabled={!threadId}
              onClick={() => { setTitleDraft(threadTitle || ""); setEditingTitle(true); }}
              title={threadId ? "Rename chat" : undefined}
            >
              <span className="topbar-title" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{threadTitle || "Research chat"}</span>
              {threadId && <i className="ti ti-pencil" />}
            </button>
          )}
        </div>
        <div className="topbar-right">
          <button className="btn btn-outline" onClick={() => { newChat(); onNewChat?.(); }}><i className="ti ti-plus" /> New chat</button>
          <button className="btn btn-outline" onClick={() => setHistoryOpen(true)}><i className="ti ti-history" /> Chat history</button>
        </div>
      </div>

      <div className={"chat-view" + (docPanel ? " chat-split" : "")} ref={splitRef}>
        <div className="chat-main">
        {(chatSources.length > 0 || chatDocs.length > 0) && (
        <div className="chat-chips">
          {chatSources.length > 0 && (
            <div className="chat-docs-chip" ref={sourcesMenuRef}>
              <button className={"chat-docs-chip-btn" + (sourcesMenuOpen ? " open" : "")} onClick={() => setSourcesMenuOpen((o) => !o)} title="Web sources used in this chat">
                <i className="ti ti-world-search" />
                <span className="chat-docs-chip-label">Sources</span>
                <span className="chat-docs-count">{chatSources.length}</span>
              </button>
              {sourcesMenuOpen && (
                <div className="chat-docs-list">
                  <div className="chat-docs-list-head">Web sources in this chat</div>
                  {chatSources.map((s, si) => (
                    <a
                      key={s.url + si}
                      className="chat-docs-item"
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setSourcesMenuOpen(false)}
                    >
                      <span className="chat-docs-item-ico src"><i className="ti ti-link" /></span>
                      <span className="chat-docs-item-text">
                        <span className="chat-docs-item-title">{s.title || s.url}</span>
                        <span className="chat-docs-item-time">{hostOf(s.url)}</span>
                      </span>
                      <i className="ti ti-external-link chat-docs-item-ext" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
          {chatDocs.length > 0 && (
          <div className="chat-docs-chip" ref={docsMenuRef}>
            <button className={"chat-docs-chip-btn" + (docsMenuOpen ? " open" : "")} onClick={() => setDocsMenuOpen((o) => !o)} title="Documents generated in this chat">
              <i className="ti ti-file-text" />
              <span className="chat-docs-chip-label">Documents</span>
              <span className="chat-docs-count">{chatDocs.length}</span>
            </button>
            {docsMenuOpen && (
              <div className="chat-docs-list">
                <div className="chat-docs-list-head">Documents in this chat</div>
                {chatDocs.map((d, di) => (
                  <button
                    key={d.proposalId}
                    className={"chat-docs-item" + (docPanel?.id === d.proposalId ? " active" : "")}
                    onClick={() => { openDocPanel(d.proposalId, d.title); setDocsMenuOpen(false); }}
                  >
                    <span className="chat-docs-item-ico"><i className="ti ti-file-text" /></span>
                    <span className="chat-docs-item-text">
                      <span className="chat-docs-item-title">{d.title || "Generated document"}</span>
                      <span className="chat-docs-item-time">{fmtDocTime(d.at)}</span>
                    </span>
                    <span className="chat-docs-item-n">#{di + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
        )}
        <div className="chat-scroll" ref={scrollRef}>
          <div className="chat-col">
            {messages.length === 0 && (
              <div className="chat-empty">
                <i className="ti ti-search" style={{ fontSize: 30, color: "var(--navy-500)" }} />
                <div style={{ fontWeight: 600, marginTop: 10 }}>Research the education ecosystem</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4, maxWidth: 460 }}>
                  Ask about live tenders, state budgets, schemes, or competitors — answers cite live web sources.
                  Or ask me to draft a proposal and I&apos;ll generate it for you.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 16 }}>
                  {["Which states have open FLN/NIPUN tenders right now?", "Summarise Rajasthan's 2025 Samagra Shiksha priorities", "Draft a concept note for VSK 2.0 in Bihar"].map((q) => (
                    <button key={q} className="btn btn-outline" style={{ fontSize: 12 }} onClick={() => setInput(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === "user" ? (
                <div key={i} className="chat-turn-user">
                  <div className="chat-user-pill">
                    {m.attName && <div className="chat-pill-attach"><i className="ti ti-paperclip" /> {m.attName}</div>}
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="chat-turn-ai">
                  {m.autoModel && (
                    <div className="chat-auto-pill"><i className="ti ti-sparkles" /> Auto · {m.autoModel}</div>
                  )}
                  {busy && i === lastIndex && tool && (
                    <div className="chat-loading-row">
                      <div className="chat-loading"><Burst /> <span>{tool}</span></div>
                      {tool === "Drafting the document…" && notifyPerm !== "unsupported" && (
                        notifyArmed ? (
                          <div className="chat-notify done"><i className="ti ti-bell-ringing" /> I&apos;ll notify you when it&apos;s ready.</div>
                        ) : notifyPerm !== "denied" ? (
                          <div className="chat-notify">
                            <i className="ti ti-bell" /> This can take a moment.
                            <button onClick={armNotify}>Notify me</button>
                          </div>
                        ) : null
                      )}
                    </div>
                  )}
                  {(() => {
                    const { text, chips } = parseSuggest(m.content);
                    const streaming = busy && i === lastIndex;
                    return (
                      <>
                        {text
                          ? <div className="markdown-body" dangerouslySetInnerHTML={{ __html: md(text) }} />
                          : streaming && !tool
                            ? <div className="chat-loading"><Burst /> <span>Thinking…</span></div>
                            : null}
                        {chips.length > 0 && !streaming && (
                          <div className="chat-suggests">
                            {chips.map((c, ci) => (
                              <button key={ci} className="chat-suggest" onClick={() => send(c)}>{c}</button>
                            ))}
                            <button className="chat-suggest other" onClick={() => taRef.current?.focus()}><i className="ti ti-pencil" /> Other…</button>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  {busy && i === lastIndex && !m.content && (
                    <div key={tipIndex} className="chat-tip"><i className="ti ti-bulb" /> {LOADING_TIPS[tipIndex]}</div>
                  )}

                  {m.docs?.map((d) => (
                    <div key={d.proposalId} className="chat-doc-card">
                      <i className="ti ti-file-text" style={{ fontSize: 20, color: "var(--primary)" }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{d.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Generated draft saved to History</div>
                      </div>
                      <button className="btn btn-primary" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => openDocPanel(d.proposalId, d.title)}>Open doc</button>
                    </div>
                  ))}

                  {m.content && !(busy && i === lastIndex) && (
                    <div className="chat-actions">
                      <button title="Copy" onClick={() => copyMsg(parseSuggest(m.content).text, i)}><i className={"ti " + (copied === i ? "ti-check" : "ti-copy")} /></button>
                      <button title="Good response" className={reactions[i] === "up" ? "on" : ""} onClick={() => setReactions((r) => ({ ...r, [i]: r[i] === "up" ? undefined : "up" } as Record<number, "up" | "down">))}><i className="ti ti-thumb-up" /></button>
                      <button title="Bad response" className={reactions[i] === "down" ? "on" : ""} onClick={() => setReactions((r) => ({ ...r, [i]: r[i] === "down" ? undefined : "down" } as Record<number, "up" | "down">))}><i className="ti ti-thumb-down" /></button>
                      <button title="Regenerate" onClick={regenerate}><i className="ti ti-refresh" /></button>
                    </div>
                  )}

                  {m.stopped && !busy && (
                    <div className="chat-followups">
                      <button className="chat-followup" onClick={regenerate}><i className="ti ti-send" /> Send again</button>
                      <button className="chat-followup" onClick={regenerate}><i className="ti ti-repeat" /> Request again</button>
                      <button className="chat-followup" onClick={() => send("Continue from where you stopped.")}><i className="ti ti-arrow-right" /> Continue again</button>
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </div>

        <div className="chat-composer">
          <div className="research-box">
            <textarea
              ref={taRef}
              className="research-input"
              value={input}
              onChange={(e) => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Write a message…"
              rows={1}
            />
            {attachment && (
              <div className="chat-attach">
                <i className="ti ti-file-text" />
                <span className="chat-fn">{attachment.filename}</span>
                <span className="chat-attach-meta">· {attachment.words.toLocaleString()} words</span>
                <button className="chat-attach-x" onClick={() => setAttachment(null)} aria-label="Remove attachment"><i className="ti ti-x" /></button>
              </div>
            )}
            {uploadErr && <div className="chat-upload-err"><i className="ti ti-alert-triangle" /> {uploadErr}</div>}
            <div className="research-box-bar">
              <button className="chat-plus" onClick={() => fileRef.current?.click()} disabled={uploading || busy} title="Attach a document">
                <i className={"ti " + (uploading ? "ti-loader" : "ti-plus")} />
              </button>
              <div className="research-actions">
                <AutoToggle on={auto} onToggle={toggleAuto} disabled={busy} />
                <ModelPicker models={models} value={model} onChange={pickModel} disabled={busy} up />
                {busy ? (
                  <button className="research-send research-stop" onClick={stop} aria-label="Stop generating" title="Stop">
                    <i className="ti ti-player-stop-filled" />
                  </button>
                ) : (
                  <button className="research-send" disabled={!input.trim()} onClick={() => send()} aria-label="Send">
                    <i className="ti ti-arrow-up" />
                  </button>
                )}
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt" hidden onChange={onPickFile} />
          </div>
        </div>
        </div>

        {docPanel && <div className="chat-doc-divider" onMouseDown={startDocDrag} role="separator" aria-orientation="vertical" aria-label="Resize document panel" title="Drag to resize" />}

        {docPanel && (
          <aside className="chat-doc-panel" style={{ flexBasis: `${docPanelPct}%`, maxWidth: `${docPanelPct}%` }}>
            <div className="chat-doc-panel-head">
              <div className="chat-doc-panel-title"><i className="ti ti-file-text" /> {docPanel.title}</div>
              <div className="chat-doc-panel-actions">
                <button className="btn btn-outline" onClick={() => onOpenProposal(docPanel.id)} disabled={!docPanel.id} title="Open the full editor">
                  <i className="ti ti-arrows-diagonal" /> Full editor
                </button>
                <button className="cp-close" onClick={() => setDocPanel(null)} aria-label="Close document"><i className="ti ti-x" /></button>
              </div>
            </div>
            <div className="chat-doc-panel-body">
              {docGenerating ? (
                <div className="chat-doc-gen">
                  <Burst />
                  <div className="chat-doc-gen-title">Drafting your document…</div>
                  <div className="chat-doc-gen-sub">Structuring sections, costing to PAB heads and grounding in your winning proposals. This can take a moment.</div>
                  <div className="chat-doc-skeleton">
                    {[92, 78, 85, 60, 88, 72].map((w, i) => <span key={i} style={{ width: w + "%" }} />)}
                  </div>
                </div>
              ) : docLoading ? (
                <div className="chat-doc-panel-loading"><span className="spinner-ring" /></div>
              ) : (
                <div className="output-doc markdown-body" dangerouslySetInnerHTML={{ __html: docPanel.html }} />
              )}
            </div>
          </aside>
        )}
      </div>

      {historyOpen && (
        <>
          <div className="drawer-backdrop" onClick={() => setHistoryOpen(false)} />
          <aside className="drawer">
            <div className="drawer-head">
              <div className="drawer-title"><i className="ti ti-history" /> Chat history</div>
              <button className="btn btn-ghost" onClick={() => setHistoryOpen(false)} aria-label="Close"><i className="ti ti-x" /></button>
            </div>
            <div className="drawer-body">
              {threads.length === 0 ? (
                <div className="drawer-empty">No chats yet.</div>
              ) : (
                threads.map((t) => (
                  <button key={t.id} className="drawer-item" onClick={() => { setHistoryOpen(false); loadThread(t.id); }}>
                    <i className="ti ti-message" />
                    <span>{t.title}</span>
                  </button>
                ))
              )}
            </div>
          </aside>
        </>
      )}

      {askAuto && (
        <div className="modal-overlay" onMouseDown={() => setAskAuto(false)}>
          <div className="auto-consent" onMouseDown={(e) => e.stopPropagation()}>
            <div className="auto-consent-ico"><i className="ti ti-sparkles" /></div>
            <div className="auto-consent-title">Let the assistant pick the model?</div>
            <p className="auto-consent-body">
              In <strong>Auto</strong> mode, the engine chooses the best model for each message —
              a fast one for quick questions, the strongest for drafting full proposals. You can
              switch back to a specific model any time from the selector.
            </p>
            <div className="auto-consent-actions">
              <button className="btn btn-outline" onClick={() => setAskAuto(false)}>Not now</button>
              <button className="btn btn-primary" onClick={acceptAuto}><i className="ti ti-sparkles" /> Turn on Auto</button>
            </div>
          </div>
        </div>
      )}

      {askFirstAuto && (
        <div className="modal-overlay" onMouseDown={firstAutoNo}>
          <div className="auto-consent" onMouseDown={(e) => e.stopPropagation()}>
            <div className="auto-consent-ico"><i className="ti ti-sparkles" /></div>
            <div className="auto-consent-title">Let AI choose the model?</div>
            <p className="auto-consent-body">
              You haven&apos;t picked a model. For better efficiency, the assistant can choose the
              right one for each message — a fast model for quick questions, the strongest for
              drafting full documents. You can switch to a specific model any time.
            </p>
            <div className="auto-consent-actions">
              <button className="btn btn-outline" onClick={firstAutoNo}>Cancel</button>
              <button className="btn btn-primary" onClick={firstAutoYes}><i className="ti ti-sparkles" /> Yes, let AI decide</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Pull an optional [[suggest: A | B | C]] block off the end of an assistant
// message → quick-reply chips. Also strips a still-streaming partial marker so
// the raw text never flashes on screen.
function parseSuggest(content: string): { text: string; chips: string[] } {
  let text = content || "";
  let chips: string[] = [];
  const m = text.match(/\[\[suggest:\s*([^\]]*?)\]\]/i);
  if (m) {
    chips = m[1].split("|").map((s) => s.trim()).filter(Boolean).slice(0, 6);
    text = text.replace(m[0], "");
  }
  // Strip the hidden markers (complete or still-streaming) so they never render.
  text = text.replace(/\[\[suggest:[^\]]*$/i, "");
  text = text.replace(/\[\[sources:[\s\S]*?\]\]/i, "").replace(/\[\[sources:[\s\S]*$/i, "");
  return { text: text.trim(), chips };
}

// The hostname of a URL for the web-sources list (e.g. "pib.gov.in").
function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

// Pull web sources out of an assistant message: the persisted [[sources: …]]
// marker first, then any inline markdown links and bare URLs (so a chat that
// simply cited a link still shows it in the Sources chip). Deduped by URL.
function parseSources(content: string): { url: string; title: string }[] {
  const out: { url: string; title: string }[] = [];
  const seen = new Set<string>();
  const add = (rawUrl: string, title?: string) => {
    const url = (rawUrl || "").replace(/[.,);\]]+$/, "").trim();
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({ url, title: (title && title.trim()) || hostOf(url) });
  };
  const marker = content.match(/\[\[sources:([\s\S]*?)\]\]/i);
  if (marker) {
    for (const part of marker[1].split(";;")) {
      const i = part.indexOf("|");
      if (i < 0) add(part);
      else add(part.slice(0, i), part.slice(i + 1));
    }
  }
  const body = content.replace(/\[\[sources:[\s\S]*?\]\]/i, "");
  let mm: RegExpExecArray | null;
  const mdLink = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  while ((mm = mdLink.exec(body))) add(mm[2], mm[1]);
  const bare = /https?:\/\/[^\s)\]]+/g;
  while ((mm = bare.exec(body))) add(mm[0]);
  return out.slice(0, 30);
}

// Friendly timestamp for the "Generated documents" list — e.g. "Jul 14, 3:42 PM".
function fmtDocTime(at: number): string {
  const d = new Date(at);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Product tips shown under the loader — teach features while the user waits.
const LOADING_TIPS = [
  "Tip: change the accent colour and light/dark mode from your profile (bottom-left).",
  "Tip: upload past winning proposals to the Knowledge Base so every draft stays grounded.",
  "Tip: highlight any text in a document to Enhance, tighten, or reword it with Co-Pilot.",
  "Tip: just say “generate a PAB note for <state>” and I’ll draft it right here.",
  "Tip: mark a doc Won or Lost in My Docs — it sharpens future drafts.",
  "Tip: switch the AI model anytime with the selector below the input.",
  "Tip: open the RFP library to chat grounded in a specific tender.",
  "Tip: click a generated doc to open it in a panel beside the chat.",
  "Tip: check Win/Loss analytics for win-rate by state, product and doc type.",
  "Tip: your chats auto-save — find them under “Previous chats” or the sidebar Recents.",
  "Tip: attach a reference file with “+” to ground the answer in it.",
];

// Minimal sunburst loader — spokes fade on a staggered delay so the highlight
// chases around the circle.
const BURST_SPOKES = 12;
function Burst() {
  return (
    <span className="chat-burst" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22">
        {Array.from({ length: BURST_SPOKES }).map((_, i) => (
          <line
            key={i}
            x1="12" y1="12" x2="12" y2="3"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"
            transform={`rotate(${(i * 360) / BURST_SPOKES} 12 12)`}
            style={{ animationDelay: `${(-(i * 1.1) / BURST_SPOKES).toFixed(3)}s` }}
          />
        ))}
      </svg>
    </span>
  );
}

function bumpLast(m: Msg[], fn: (a: Msg) => Msg): Msg[] {
  if (!m.length) return m;
  const copy = m.slice();
  copy[copy.length - 1] = fn(copy[copy.length - 1]);
  return copy;
}

