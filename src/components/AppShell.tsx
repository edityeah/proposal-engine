"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import GenerateForm from "./GenerateForm";
import OutputView from "./OutputView";
import HistoryView from "./HistoryView";
import KnowledgeView from "./KnowledgeView";
import ProductsAdmin from "./ProductsAdmin";
import CostingView from "./CostingView";
import AnalyticsView from "./AnalyticsView";
import type { CurrentProposal, ProposalInputs, Screen, SessionUser } from "@/lib/types";

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
  const [proposal, setProposal] = useState<CurrentProposal>(initialProposal ?? EMPTY);
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleGenerate(inputs: ProposalInputs) {
    const title = `${inputs.generatorLabel || "Document"} — ${inputs.productName} · ${inputs.state}`;
    setProposal({ id: null, title, output: "", status: "draft", streaming: true, rfpLoaded: inputs.rfpLoaded });
    setScreen("output");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setProposal((p) => ({ ...p, streaming: false, output: "Error: " + (d.error || res.status) }));
        return;
      }
      const id = res.headers.get("X-Proposal-Id");
      const full = await streamInto(res, (text) => setProposal((p) => ({ ...p, output: text })));
      setProposal((p) => ({ ...p, id, output: full, streaming: false }));
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setProposal((p) => ({ ...p, streaming: false, output: "Error: " + (e instanceof Error ? e.message : "failed") }));
    }
  }

  async function handleRefine(instruction: string, selection: string) {
    if (!proposal.id) return;
    setProposal((p) => ({ ...p, output: "", streaming: true }));
    try {
      const res = await fetch(`/api/proposals/${proposal.id}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction, selection }),
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

  async function handleSetStatus(status: string) {
    if (!proposal.id) return;
    setProposal((p) => ({ ...p, status }));
    await fetch(`/api/proposals/${proposal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }).catch(() => {});
  }

  async function openProposal(id: string) {
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
    });
  }

  return (
    <div className="layout">
      <Sidebar screen={screen} onNavigate={setScreen} user={user} />
      <div className="main-area">
        {screen === "generate" && (
          <>
            <div className="topbar">
              <div className="topbar-left"><div className="topbar-title">Generate document</div></div>
            </div>
            <GenerateForm onGenerate={handleGenerate} busy={proposal.streaming} />
          </>
        )}

        {screen === "output" && (
          <OutputView
            proposal={proposal}
            refreshKey={refreshKey}
            onBack={() => setScreen("generate")}
            onRefine={handleRefine}
            onSetStatus={handleSetStatus}
            onRestore={(content) => { setProposal((p) => ({ ...p, output: content })); setRefreshKey((k) => k + 1); }}
          />
        )}

        {screen === "history" && <HistoryView onOpen={openProposal} />}
        {screen === "analytics" && <AnalyticsView />}
        {screen === "knowledge" && <KnowledgeView mode="knowledge" />}
        {screen === "rfplibrary" && <KnowledgeView mode="rfp" />}
        {screen === "products" && <ProductsAdmin />}
        {screen === "costing" && <CostingView />}

        {screen === "soon" && (
          <>
            <div className="topbar"><div className="topbar-left"><div className="topbar-title">Team access</div></div></div>
            <div className="page-content">
              <div className="card">
                <div className="card-title"><i className="ti ti-users-group" /> Team access</div>
                <p style={{ marginTop: 10, color: "var(--text-secondary)" }}>
                  Anyone with an <strong>@convegenius.ai</strong> Google account can sign in today.
                  Fine-grained roles and an invite list are a later enhancement.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
