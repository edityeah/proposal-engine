"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useOthers, useSelf } from "@liveblocks/react";
import UserAvatar from "./UserAvatar";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "TEAM" strip for the document top bar: a compact avatar cluster of everyone
// on the doc right now (you + others). The "+" opens an invite overlay
// (email + access rights). Actual delivery/access enforcement is a later step.
export default function TeamBar() {
  const others = useOthers();
  const self = useSelf();

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [rights, setRights] = useState<"edit" | "view">("edit");
  const [sent, setSent] = useState(false);

  const people = [
    ...(self ? [{ key: "self", seed: self.id, avatar: self.info?.avatar, name: self.info?.name }] : []),
    ...others.slice(0, 4).map((o) => ({
      key: String(o.connectionId),
      seed: o.id,
      avatar: o.info?.avatar,
      name: o.info?.name,
    })),
  ];

  function close() { setInviteOpen(false); setEmail(""); setRights("edit"); setSent(false); }
  function send() {
    if (!EMAIL_RE.test(email.trim())) return;
    // TODO(invite-backend): this is a UI-only stub. Persist the invite
    // (proposal_id, email, rights), send the invite email, and enforce
    // edit/view access on the proposal API + Liveblocks room. See MEMORY.
    setSent(true);
  }

  return (
    <>
      <div className="teambar">
        <span className="teambar-label">Team</span>
        <div className="teambar-avatars">
          {people.map((p) => (
            <span key={p.key} className="teambar-av" title={p.name}>
              <UserAvatar seed={p.seed} avatar={p.avatar} size={28} />
            </span>
          ))}
          <button className="teambar-add" title="Invite a collaborator" onClick={() => setInviteOpen(true)}>
            <i className="ti ti-plus" />
          </button>
        </div>
      </div>

      {inviteOpen && createPortal(
        <div className="modal-overlay" onMouseDown={close}>
          <div className="modal-card" onMouseDown={(e) => e.stopPropagation()}>
            {sent ? (
              <>
                <div className="modal-title"><i className="ti ti-circle-check" /> Invite recorded</div>
                <div className="modal-sub">
                  <strong>{email.trim()}</strong> will be able to {rights === "edit" ? "edit" : "view"} this
                  proposal. Email delivery is coming soon.
                </div>
                <div className="modal-actions">
                  <button className="btn btn-primary" onClick={close}><i className="ti ti-check" /> Done</button>
                </div>
              </>
            ) : (
              <>
                <div className="modal-title"><i className="ti ti-user-plus" /> Invite a collaborator</div>
                <div className="modal-sub">Invite someone to this proposal by email and choose what they can do.</div>

                <div className="invite-label">Email address</div>
                <input
                  className="invite-input"
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@convegenius.ai"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && EMAIL_RE.test(email.trim())) send();
                    else if (e.key === "Escape") close();
                  }}
                />

                <div className="invite-label">Access</div>
                <div className="invite-rights">
                  <button className={"invite-right-btn" + (rights === "edit" ? " active" : "")} onClick={() => setRights("edit")}>
                    <i className="ti ti-edit" /> Can edit
                  </button>
                  <button className={"invite-right-btn" + (rights === "view" ? " active" : "")} onClick={() => setRights("view")}>
                    <i className="ti ti-eye" /> Can view
                  </button>
                </div>

                <div className="modal-actions">
                  <button className="btn btn-outline" onClick={close}>Cancel</button>
                  <button className="btn btn-primary" disabled={!EMAIL_RE.test(email.trim())} onClick={send}>
                    <i className="ti ti-send" /> Send invite
                  </button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
