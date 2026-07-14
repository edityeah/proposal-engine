"use client";

import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import GenerateForm, { type GenFormSnapshot } from "./GenerateForm";
import OutputView from "./OutputView";
import OiPanel from "./OiPanel";
import ChangeLog from "./ChangeLog";
import HistoryView from "./HistoryView";
import KnowledgeView from "./KnowledgeView";
import ChatView from "./ChatView";
import ResearchLanding from "./ResearchLanding";
import RecentDocsMenu from "./RecentDocsMenu";
import KnowAboutMe from "./KnowAboutMe";
import GenerateCopilot from "./GenerateCopilot";
import MarketingStudio from "./MarketingStudio";
import TeamAdmin from "./TeamAdmin";
import ProductsAdmin from "./ProductsAdmin";
import CurationStudio from "./CurationStudio";
import CostingView from "./CostingView";
import AnalyticsView from "./AnalyticsView";
import ModuleHome from "./ModuleHome";
import ProfileModal from "./ProfileModal";
import AboutBot from "./AboutBot";
import { getModule, moduleForScreen, type QuickLaunch } from "@/lib/nav";
import type { CurrentProposal, ModuleId, ProposalInputs, Screen, SessionUser } from "@/lib/types";

const EMPTY: CurrentProposal = {
  id: null,
  title: "",
  output: "",
  status: "draft",
  streaming: false,
  rfpLoaded: false,
};

async function streamInto(
  res: Response,
  onChunk: (text: string) => void,
): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    full += chunk;
    onChunk(full);
  }
  return full;
}

// Rough template used when generation can't run (no AI key). Built from the form
// inputs, with [INSERT: …] placeholders — enough to test the editor + inputs panel.
function buildTemplateDoc(inputs: ProposalInputs): string {
  const state = inputs.state || "[State]";
  const dept = inputs.department || "[Issuing department]";
  const product = inputs.productName || "[Product / package]";
  const genLabel = inputs.generatorLabel || "Proposal";
  const org = inputs.org === "direct" ? "ConveGenius direct" : "Via PSU partner";
  const secs = inputs.sections && inputs.sections.length
    ? inputs.sections
    : ["Executive summary", "Understanding of the requirement", "Proposed solution", "Implementation & governance", "Commercials"];
  const body = secs
    .map((s, i) => `## ${i + 1}. ${s}\n\n[INSERT: content for "${s}" — grounded in the brief, quantified, and cited (source + year).]`)
    .join("\n\n");
  const extra = inputs.additionalInstructions?.trim()
    ? `\n\n> **Additional instructions applied:** ${inputs.additionalInstructions.trim()}`
    : "";
  return [
    `# ${product} — ${genLabel}`,
    ``,
    `_Prepared for the ${dept}, School Education Department, Government of ${state}._`,
    ``,
    `**Reference:** [INSERT: RFP / PAB no.]  ·  **Submitted by:** ConveGenius Solutions Pvt. Ltd.  ·  **Mode:** ${org}`,
    ``,
    `---`,
    ``,
    body,
    extra,
    ``,
    `---`,
    ``,
    `> ⚠ **Rough template placeholder.** Add an AI key and click **Regenerate** for the full, grounded draft. Every \`[INSERT: …]\` marks a figure or detail to supply.`,
  ].join("\n");
}

export default function AppShell({
  user,
  initialScreen,
  initialProposal,
}: {
  user: SessionUser;
  initialScreen?: Screen;
  initialProposal?: CurrentProposal;
}) {
  const [screen, setScreen] = useState<Screen>(initialScreen ?? "generate");
  // Where the output view's Back button returns to — the screen the doc was
  // opened from (e.g. "My docs"), set whenever we switch into "output".
  const [backScreen, setBackScreen] = useState<Screen>("generate");
  // Which module the user is in; null = the landing module picker.
  const [moduleId, setModuleId] = useState<ModuleId | null>(
    initialScreen ? moduleForScreen(initialScreen) : null,
  );
  const [proposal, setProposal] = useState<CurrentProposal>(initialProposal ?? EMPTY);
  // Generator preselected from a landing "Quick launch" chip; null = default.
  const [initialGenerator, setInitialGenerator] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [navOpen, setNavOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // Thread the sidebar Recents asked Research chat to open ({id} so reopening
  // the same thread still re-triggers the load).
  const [chatThreadId, setChatThreadId] = useState<{ id: string } | null>(null);
  // The chat the user is currently in. Navigating away and back to Research reopens
  // it (instead of a fresh landing) until they click "New chat".
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  // A message typed on the Research landing for ChatView to auto-send.
  const [chatSeed, setChatSeed] = useState<{ text: string; model?: string } | null>(null);
  const [genCopilot, setGenCopilot] = useState(false);
  // Snapshot of the form that produced the current doc — pre-fills the output
  // view's "Generation inputs" panel so it can be edited + regenerated.
  const [genSnapshot, setGenSnapshot] = useState<GenFormSnapshot | null>(null);
  // The raw inputs behind the current doc — used to persist a not-yet-saved
  // (template-mode) doc into "My docs" when the user clicks Save.
  const [lastInputs, setLastInputs] = useState<ProposalInputs | null>(null);

  // Remove the Liveblocks attribution badge — it can set an inline !important
  // that beats a CSS rule, so strip the element (and catch re-adds to <body>).
  useEffect(() => {
    const kill = () => document.querySelectorAll(".liveblocks-badge").forEach((el) => el.remove());
    kill();
    const obs = new MutationObserver(kill);
    obs.observe(document.body, { childList: true });
    return () => obs.disconnect();
  }, []);

  // The nav is expanded by default and re-expands whenever the user lands on the
  // Generate form; generating/regenerating a doc auto-collapses it (see
  // handleGenerate) to give the document more room. Manual collapse still works.
  useEffect(() => {
    if (screen === "generate") setNavCollapsed(false);
    else if (screen === "output") setNavCollapsed(true); // entering a document frees the doc room
  }, [screen]);

  const isAdmin = user.role === "admin";
  const ADMIN_SCREENS: Screen[] = ["curation", "products", "costing", "team"];
  // Defense in depth: non-admins can't land on an admin screen even if routed there.
  const activeScreen: Screen = !isAdmin && ADMIN_SCREENS.includes(screen) ? "generate" : screen;

  function selectModule(m: ModuleId) {
    const def = getModule(m);
    if (def.adminOnly && !isAdmin) return;
    setInitialGenerator(null);
    setModuleId(m);
    setScreen(def.defaultScreen);
    setNavOpen(false);
  }

  // "Jump straight to a tool" from a landing card chip.
  function launchTool(m: ModuleId, ql: QuickLaunch) {
    const def = getModule(m);
    if (def.adminOnly && !isAdmin) return;
    setInitialGenerator(ql.generatorId ?? null);
    setModuleId(m);
    setScreen(ql.screen);
    setNavOpen(false);
  }

  // Sidebar navigation drops any preselected generator so the Generate form
  // reverts to its default when reached through the nav rather than a chip.
  function navigate(s: Screen) {
    setInitialGenerator(null);
    // Returning to Research reopens the active chat until the user starts a new one.
    if (s === "research" && activeChatId) {
      setChatSeed(null);
      setChatThreadId({ id: activeChatId });
      setScreen("chat");
      return;
    }
    setScreen(s);
  }

  async function handleGenerate(inputs: ProposalInputs, snapshot?: GenFormSnapshot) {
    if (snapshot) setGenSnapshot(snapshot);
    setLastInputs(inputs);
    setNavCollapsed(true); // (re)generating a doc collapses the nav to free up room
    const title = `${inputs.generatorLabel || "Document"} — ${inputs.productName} · ${inputs.state}`;
    setProposal({ id: null, title, output: "", status: "draft", streaming: true, rfpLoaded: inputs.rfpLoaded });
    setBackScreen("generate"); // a freshly generated doc came from the Generate screen
    setScreen("output");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      if (!res.ok) {
        // No AI key / generation failed → load a rough template so the editor + inputs
        // panel are testable. (Real generation takes over once a key is set.)
        await new Promise((r) => setTimeout(r, 1600)); // let the "drafting" animation play
        setProposal((p) => ({ ...p, output: buildTemplateDoc(inputs), streaming: false }));
        return;
      }
      const id = res.headers.get("X-Proposal-Id");
      const full = await streamInto(res, (text) => setProposal((p) => ({ ...p, output: text })));
      setProposal((p) => ({ ...p, id, output: full, streaming: false }));
      setRefreshKey((k) => k + 1);
    } catch {
      await new Promise((r) => setTimeout(r, 1600));
      setProposal((p) => ({ ...p, output: buildTemplateDoc(inputs), streaming: false }));
    }
  }

  async function handleRefine(
    instruction: string,
    selection: string,
    opts?: { model?: string; attachment?: { filename: string; text: string } },
  ) {
    if (!proposal.id) return;
    setProposal((p) => ({ ...p, output: "", streaming: true }));
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, selection, model: opts?.model, attachment: opts?.attachment }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setProposal((p) => ({ ...p, streaming: false, output: "Error: " + (d.error || res.status) }));
        return;
      }
      const full = await streamInto(res, (text) => setProposal((p) => ({ ...p, output: text })));
      setProposal((p) => ({ ...p, output: full, streaming: false }));
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setProposal((p) => ({ ...p, streaming: false, output: "Error: " + (e instanceof Error ? e.message : "failed") }));
    }
  }

  // Persist a manual edit (Google-Docs-style save) as a new version.
  async function handleSaveEdit(content: string): Promise<boolean> {
    try {
      // Existing doc → update in place.
      if (proposal.id) {
        const res = await fetch(`/api/proposals/${proposal.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
        if (!res.ok) return false;
        setProposal((p) => ({ ...p, output: content }));
        setRefreshKey((k) => k + 1);
        return true;
      }
      // Not-yet-persisted doc (e.g. template-mode draft) → create it so it lands
      // in "My docs" and gains an id (which also enables Ask Co-Pilot on it).
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: proposal.title,
          output: content,
          inputs: lastInputs ?? undefined,
        }),
      });
      if (!res.ok) return false;
      const { id } = (await res.json()) as { id?: string };
      if (!id) return false;
      setProposal((p) => ({ ...p, id, output: content }));
      setRefreshKey((k) => k + 1);
      return true;
    } catch {
      return false;
    }
  }

  async function handleSetStatus(status: string, reason: string) {
    if (!proposal.id) return;
    setProposal((p) => ({ ...p, status, outcomeReason: reason }));
    await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, reason }),
    }).catch(() => {});
  }

  async function openProposal(id: string) {
    // Remember where we came from (My docs / Research chat / …) so Back returns
    // there rather than always to Generate. Ignore if already on the output view.
    if (screen !== "output") setBackScreen(screen);
    setGenSnapshot(null); // opened an existing doc — the inputs panel starts fresh
    setProposal({ ...EMPTY, id, streaming: false, title: "Loading…" });
    setScreen("output");
    const res = await fetch(`/api/proposals/${id}`);
    if (!res.ok) {
      setProposal((p) => ({ ...p, title: "Not found" }));
      return;
    }
    const { proposal: row } = await res.json();
    setProposal({
      id: row.id,
      title: row.title,
      output: row.output,
      status: row.status,
      streaming: false,
      rfpLoaded: !!row.rfpBlobUrl || !!(row.inputs && row.inputs.rfpLoaded),
      outcomeReason:
        row.inputs && typeof row.inputs.outcomeReason === "string"
          ? row.inputs.outcomeReason
          : undefined,
      starred: !!(row.inputs && row.inputs.starred),
    });
  }

  if (!moduleId) {
    return <ModuleHome user={user} onSelect={selectModule} onLaunch={launchTool} />;
  }

  return (
    <div className={"layout" + (navCollapsed ? " nav-collapsed" : "")}>
      {profileOpen && <ProfileModal user={user} onClose={() => setProfileOpen(false)} />}
      {aboutOpen && <AboutBot onClose={() => setAboutOpen(false)} />}
      <button className="nav-hamburger" aria-label="Open menu" onClick={() => setNavOpen(true)}>
        <i className="ti ti-menu-2" />
      </button>
      {navOpen && <div className="nav-backdrop" onClick={() => setNavOpen(false)} />}
      <Sidebar
        moduleId={moduleId}
        screen={activeScreen}
        onNavigate={navigate}
        onHome={() => { setModuleId(null); setNavOpen(false); }}
        onOpenProposal={openProposal}
        onOpenChat={(id) => { setChatSeed(null); setChatThreadId({ id }); setActiveChatId(id); setScreen("chat"); }}
        recentsKey={refreshKey}
        user={user}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        collapsed={navCollapsed}
        onToggleCollapse={() => setNavCollapsed((v) => !v)}
        onOpenProfile={() => setProfileOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
      />
      <div className="main-area">
        {activeScreen === "research" && (
          <ResearchLanding
            onResearch={(message, model) => { setChatThreadId(null); setChatSeed({ text: message, model }); setScreen("chat"); }}
            onGenerate={() => { setInitialGenerator(null); setScreen("generate"); }}
            onOpenChat={(id) => { setChatSeed(null); setChatThreadId({ id }); setActiveChatId(id); setScreen("chat"); }}
          />
        )}

        {activeScreen === "generate" && (
          <>
            <div className="topbar">
              <div className="topbar-left"><div className="topbar-title">Generate document</div></div>
              <div className="topbar-right">
                <KnowAboutMe
                  icon="ti-sparkles"
                  sub="Turn a short brief into a complete, PAB-ready document."
                  can={[
                    "I draft structured, costed, evidence-led documents — proposals, PAB notes, RFP responses, concept notes and more — grounded in your winning proposals and live web sources.",
                    "Claims carry numbers where they exist, assessments are cited with source and year, and every cost maps to a PAB budget head.",
                  ]}
                  how={[
                    "Choose a document type, product and state, then add any brief or context.",
                    "Attach an RFP to respond to it directly (optional).",
                    "Generate, then review and refine inline — and set <strong>Won/Lost</strong> later so I learn from the outcome.",
                  ]}
                />
                <RecentDocsMenu onOpen={openProposal} onShowMore={() => navigate("history")} />
              </div>
            </div>
            <div className={"generate-wrap" + (genCopilot ? " copilot-open" : "")}>
              <GenerateForm
                onGenerate={handleGenerate}
                busy={proposal.streaming}
                initialGeneratorId={initialGenerator}
              />
            </div>
            <GenerateCopilot open={genCopilot} onOpenChange={setGenCopilot} />
          </>
        )}

        {activeScreen === "output" && (
          <>
            {/* Left ~20–30%: the pre-filled "Generation inputs" panel (edit + Regenerate),
                shown beside the document whenever the doc came from the Generate flow. */}
            {genSnapshot && (
              <aside className="oi-inputs">
                <OiPanel
                  snapshot={genSnapshot}
                  inputs={lastInputs}
                  proposal={proposal}
                  busy={proposal.streaming}
                  onGenerate={handleGenerate}
                  onRefine={handleRefine}
                />
              </aside>
            )}
            <OutputView
              proposal={proposal}
              refreshKey={refreshKey}
              hasInputs={!!genSnapshot}
              onBack={() => setScreen(backScreen)}
              onRefine={handleRefine}
              onSetStatus={handleSetStatus}
              onSaveEdit={handleSaveEdit}
              onRestore={(content) => { setProposal((p) => ({ ...p, output: content })); setRefreshKey((k) => k + 1); }}
            />
          </>
        )}

        {/* ChatView stays mounted (hidden when off-screen) so an in-progress response
            and the conversation survive navigating to a doc/other tab and back. */}
        <div style={{ display: activeScreen === "chat" ? "contents" : "none" }}>
          <ChatView
            onOpenProposal={openProposal}
            openThread={chatThreadId}
            seed={chatSeed}
            onThreadsChanged={() => setRefreshKey((k) => k + 1)}
            onActiveThread={(id) => setActiveChatId(id)}
            onNewChat={() => { setActiveChatId(null); setChatThreadId(null); setChatSeed(null); setScreen("research"); }}
          />
        </div>
        {activeScreen === "marketing" && <MarketingStudio onAssetCreated={() => setRefreshKey((k) => k + 1)} />}
        {activeScreen === "team" && <TeamAdmin />}
        {activeScreen === "history" && <HistoryView onOpen={openProposal} onNew={() => navigate("generate")} />}
        {activeScreen === "analytics" && <AnalyticsView />}
        {activeScreen === "knowledge" && <KnowledgeView mode="knowledge" />}
        {activeScreen === "rfplibrary" && <KnowledgeView mode="rfp" />}
        {activeScreen === "curation" && <CurationStudio />}
        {activeScreen === "products" && <ProductsAdmin />}
        {activeScreen === "costing" && <CostingView />}
        {activeScreen === "changelog" && <ChangeLog />}

      </div>
    </div>
  );
}
