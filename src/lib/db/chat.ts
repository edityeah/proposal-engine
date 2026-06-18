import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "./index";
import { chatThreads, chatMessages } from "./schema";

export async function createThread(userId: string, model: string, title = "New chat") {
  const [row] = await db.insert(chatThreads).values({ userId, model, title }).returning();
  return row;
}

export async function listThreads(userId: string, limit = 50) {
  return db
    .select()
    .from(chatThreads)
    .where(eq(chatThreads.userId, userId))
    .orderBy(desc(chatThreads.updatedAt))
    .limit(limit);
}

export async function getThread(id: string, userId: string) {
  const [row] = await db
    .select()
    .from(chatThreads)
    .where(and(eq(chatThreads.id, id), eq(chatThreads.userId, userId)));
  return row ?? null;
}

export async function getMessages(threadId: string) {
  return db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(asc(chatMessages.createdAt));
}

export async function addMessage(
  threadId: string,
  role: "user" | "assistant",
  content: string,
  proposalId?: string | null,
) {
  const [row] = await db
    .insert(chatMessages)
    .values({ threadId, role, content, proposalId: proposalId ?? null })
    .returning();
  await db
    .update(chatThreads)
    .set({ updatedAt: new Date() })
    .where(eq(chatThreads.id, threadId));
  return row;
}

export async function renameThread(id: string, userId: string, title: string) {
  await db
    .update(chatThreads)
    .set({ title: title.slice(0, 120), updatedAt: new Date() })
    .where(and(eq(chatThreads.id, id), eq(chatThreads.userId, userId)));
}

export async function deleteThread(id: string, userId: string) {
  await db.delete(chatThreads).where(and(eq(chatThreads.id, id), eq(chatThreads.userId, userId)));
}
