// Server-side RFP text extraction. Replaces the old browser readAsText hack
// (which produced garbled text for real PDFs/Word docs) with proper parsers.

export async function extractRfpText(
  buffer: Buffer,
  filename: string,
): Promise<{ text: string; words: number }> {
  const lower = filename.toLowerCase();
  let text = "";

  if (lower.endsWith(".pdf")) {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    text = data.text || "";
  } else if (lower.endsWith(".docx")) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    text = result.value || "";
  } else {
    // .txt / .doc / unknown → best-effort UTF-8
    text = buffer.toString("utf8");
  }

  text = text.replace(/\s+/g, " ").trim();
  const words = text ? text.split(" ").length : 0;
  return { text, words };
}
