// Global Liveblocks types.
//
// Presence-only for now: there are no per-user presence fields yet (live
// cursors / text selection are a later phase), so `Presence` is empty. Each
// connected user is identified by their existing Auth.js session, surfaced via
// `UserMeta.info` (set server-side in /api/liveblocks-auth).
declare global {
  interface Liveblocks {
    // Ephemeral per-user state broadcast to the room. Empty = presence only.
    Presence: Record<string, never>;

    // Stable identity attached at auth time (never invented client-side).
    UserMeta: {
      id: string;
      info: {
        name: string;
        email?: string;
        avatar?: string;
      };
    };
  }
}

export {};
