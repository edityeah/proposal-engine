import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

// Converts the WYSIWYG editor's HTML back into the markdown the app stores and
// exports (docx/pdf parse markdown). GFM plugin adds tables + strikethrough.
const td = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
});
td.use(gfm);

export function htmlToMarkdown(html: string): string {
  return td.turndown(html || "").trim() + "\n";
}
