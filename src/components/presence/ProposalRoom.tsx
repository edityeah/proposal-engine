"use client";

import { LiveblocksProvider, RoomProvider } from "@liveblocks/react";
import type { ReactNode } from "react";

// Scopes Liveblocks presence to a single proposal: one room per proposal id, so
// avatars only show people viewing THIS document. Mount this only when the
// proposal has a persisted id.
export default function ProposalRoom({
  proposalId,
  children,
}: {
  proposalId: string;
  children: ReactNode;
}) {
  return (
    <LiveblocksProvider
      authEndpoint={async (room) => {
        // Dev-only: forward a `?devUser=NAME` query param so distinct viewers
        // can be simulated across browser windows while DEV_NO_AUTH is on. In
        // production the server ignores it (see /api/liveblocks-auth).
        const devUser =
          typeof window !== "undefined"
            ? new URLSearchParams(window.location.search).get("devUser")
            : null;
        const res = await fetch("/api/liveblocks-auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room, devUser }),
        });
        if (!res.ok) throw new Error(`Liveblocks auth failed (${res.status})`);
        return await res.json();
      }}
    >
      <RoomProvider id={`proposal-${proposalId}`} initialPresence={{}}>
        {children}
      </RoomProvider>
    </LiveblocksProvider>
  );
}
