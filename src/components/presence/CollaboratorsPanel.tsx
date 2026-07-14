"use client";

import { useOthers, useSelf } from "@liveblocks/react";
import UserAvatar from "./UserAvatar";

// Sidebar panel: the live list of people currently viewing this proposal
// (you + everyone else), plus a placeholder for inviting collaborators (the
// access/invite feature is a separate later step). Must be inside <ProposalRoom>.
export default function CollaboratorsPanel() {
  const others = useOthers();
  const self = useSelf();

  const people = [
    ...(self ? [{ key: "self", seed: self.id, name: self.info?.name ?? "You", avatar: self.info?.avatar, you: true }] : []),
    ...others.map((o) => ({
      key: String(o.connectionId),
      seed: o.id,
      name: o.info?.name ?? "Someone",
      avatar: o.info?.avatar,
      you: false,
    })),
  ];

  return (
    <>
      <div className="collab-hint">
        {others.length === 0
          ? "You're the only one here right now."
          : `${people.length} people viewing this proposal right now.`}
      </div>

      <div className="collab-list">
        {people.map((p) => (
          <div key={p.key} className="collab-row">
            <span className="collab-avatar">
              <UserAvatar seed={p.seed} avatar={p.avatar} size={28} />
            </span>
            <span className="collab-name">
              {p.name}
              {p.you && <span className="collab-you"> (you)</span>}
            </span>
            <span className="collab-dot" title="Viewing now" />
          </div>
        ))}
      </div>

      {/* Invite/access is a separate later step — placeholder affordance only. */}
      <button className="btn btn-outline" style={{ width: "100%", justifyContent: "center", marginTop: 12 }} disabled title="Coming soon">
        <i className="ti ti-user-plus" /> Invite collaborator
      </button>
      <div className="collab-soon">Invite by email — coming soon</div>
    </>
  );
}
