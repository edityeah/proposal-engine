"use client";

import { useOthers } from "@liveblocks/react";
import UserAvatar from "./UserAvatar";

const MAX_VISIBLE = 4;

// A live avatar stack of OTHER people currently viewing this proposal. Renders
// nothing when you're the only one here. Must be mounted inside <ProposalRoom>.
export default function PresenceAvatars() {
  const others = useOthers();

  if (others.length === 0) return null;

  const visible = others.slice(0, MAX_VISIBLE);
  const overflow = others.length - visible.length;

  return (
    <div
      className="presence"
      title={`${others.length} other ${others.length === 1 ? "person is" : "people are"} viewing this proposal`}
    >
      <div className="presence-stack">
        {visible.map((o) => (
          <div key={o.connectionId} className="presence-avatar" title={o.info.name} aria-label={o.info.name}>
            <UserAvatar seed={o.id} avatar={o.info.avatar} size={30} />
          </div>
        ))}
        {overflow > 0 && <div className="presence-avatar presence-more">+{overflow}</div>}
      </div>
    </div>
  );
}
