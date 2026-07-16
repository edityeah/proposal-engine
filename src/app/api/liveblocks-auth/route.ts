import { Liveblocks } from "@liveblocks/node";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

// Liveblocks authentication endpoint.
//
// The client (LiveblocksProvider authEndpoint) POSTs the room it wants to join;
// we identify the caller from the EXISTING Auth.js session and mint a scoped
// access token that carries their real name/email/avatar as presence identity.
export async function POST(req: Request) {
  const secret = process.env.LIVEBLOCKS_SECRET_KEY;
  if (!secret) {
    // Presence stays dormant if the key isn't configured (e.g. a preview
    // deploy before the env var is set). The rest of the app is unaffected.
    return new Response("Liveblocks not configured", { status: 501 });
  }

  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    room?: string;
    devUser?: string | null;
  };

  // Identity comes straight from the logged-in session — never invented.
  let id = session.user.id || session.user.email || "user";
  let name = session.user.name || session.user.email || "Unknown";
  const email = session.user.email || undefined;
  const avatar = session.user.image || undefined;

  // Dev-only: while DEV_NO_AUTH is on, auth() returns one fixed user, so a
  // `?devUser=NAME` param lets you simulate distinct viewers across windows.
  // Ignored entirely in production (DEV_NO_AUTH is never set there).
  if (process.env.DEV_NO_AUTH === "1" && process.env.NODE_ENV !== "production" && body.devUser) {
    name = body.devUser;
    id = `dev-${body.devUser}`;
  }

  const liveblocks = new Liveblocks({ secret });
  const lbSession = liveblocks.prepareSession(id, {
    userInfo: { name, email, avatar },
  });

  // Only ever grant access to per-proposal presence rooms.
  if (typeof body.room === "string" && body.room.startsWith("proposal-")) {
    lbSession.allow(body.room, lbSession.FULL_ACCESS);
  }

  const { status, body: authBody } = await lbSession.authorize();
  return new Response(authBody, { status });
}
