import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

// Render model markdown to SAFE html. Replaces the original app's unsanitized
// innerHTML/insertAdjacentHTML usage (the XSS surface flagged in review).
export function renderMarkdownSafe(md: string): string {
  const raw = marked.parse(md ?? "", { async: false }) as string;
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
}
