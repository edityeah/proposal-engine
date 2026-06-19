import PDFDocument from "pdfkit";

// Brand palette (matches the app).
const NAVY = "#2D2D6B";
const NAVY_700 = "#3D3D8F";
const TEAL = "#2E8B82";
const BODY = "#1A1A2E";
const MUTED = "#8080A0";
const BORDER = "#E0E0EC";

interface Seg { t: string; bold: boolean; italic: boolean }

function parseInline(text: string): Seg[] {
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  const segs: Seg[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ t: text.slice(last, m.index), bold: false, italic: false });
    if (m[2] !== undefined) segs.push({ t: m[2], bold: true, italic: false });
    else segs.push({ t: m[3], bold: false, italic: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) segs.push({ t: text.slice(last), bold: false, italic: false });
  return segs.length ? segs : [{ t: text, bold: false, italic: false }];
}

function fontFor(s: Seg): string {
  if (s.bold) return "Helvetica-Bold";
  if (s.italic) return "Helvetica-Oblique";
  return "Helvetica";
}

// Render a line of inline markdown with colored, bold/italic runs.
function inline(doc: PDFKit.PDFDocument, text: string, size: number, color: string, opts: Record<string, unknown> = {}) {
  const segs = parseInline(text);
  doc.fontSize(size).fillColor(color);
  segs.forEach((s, i) => {
    doc.font(fontFor(s)).text(s.t, { continued: i < segs.length - 1, ...opts });
  });
}

export function markdownToPdfBuffer(md: string, title?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // pdfkit's built-in Helvetica has no ₹ (U+20B9) glyph — it renders as "¹".
    // Render it as "Rs " in PDFs (docx keeps ₹, since Word fonts have it).
    md = (md ?? "").replace(/₹\s?/g, "Rs ");
    if (title) title = title.replace(/₹\s?/g, "Rs ");

    if (title) {
      doc.font("Helvetica-Bold").fontSize(20).fillColor(NAVY).text(title);
      doc.moveDown(0.4);
      // teal rule under the title
      const y = doc.y;
      doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.margins.left + contentWidth, y)
        .lineWidth(2).strokeColor(TEAL).stroke();
      doc.moveDown(0.8);
    }

    const lines = (md ?? "").split("\n");
    let tableBuf: string[][] = [];

    const flushTable = () => {
      if (!tableBuf.length) return;
      renderTable(doc, tableBuf, contentWidth);
      tableBuf = [];
    };

    for (const raw of lines) {
      const line = raw.replace(/\r$/, "");
      const trimmed = line.trim();

      // Markdown table rows (| a | b |)
      if (/^\|.*\|$/.test(trimmed)) {
        if (/^\|[\s:|-]+\|$/.test(trimmed)) continue; // separator row
        tableBuf.push(trimmed.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()));
        continue;
      }
      flushTable();

      if (trimmed === "") { doc.moveDown(0.5); continue; }

      const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
      if (heading) {
        const lvl = heading[1].length;
        const sizes = [16, 14, 12.5, 12];
        const colors = [NAVY, NAVY, NAVY_700, NAVY_700];
        doc.moveDown(lvl <= 2 ? 0.5 : 0.3);
        inline(doc, heading[2], sizes[lvl - 1], colors[lvl - 1]);
        doc.moveDown(0.25);
        continue;
      }

      const bullet = /^[-*•]\s+(.*)$/.exec(trimmed);
      if (bullet) {
        doc.font("Helvetica").fontSize(10.5).fillColor(TEAL).text("•", doc.page.margins.left + 8, doc.y, { continued: true });
        inline(doc, "  " + bullet[1], 10.5, BODY);
        continue;
      }

      const numbered = /^(\d+[.)])\s+(.*)$/.exec(trimmed);
      if (numbered) {
        doc.font("Helvetica-Bold").fontSize(10.5).fillColor(NAVY_700).text(numbered[1], doc.page.margins.left + 6, doc.y, { continued: true });
        inline(doc, "  " + numbered[2], 10.5, BODY);
        continue;
      }

      inline(doc, trimmed, 10.5, BODY);
    }
    flushTable();

    doc.end();
  });
}

// Simple banded table.
function renderTable(doc: PDFKit.PDFDocument, rows: string[][], width: number) {
  if (!rows.length) return;
  const cols = Math.max(...rows.map((r) => r.length));
  const colW = width / cols;
  const left = doc.page.margins.left;
  doc.moveDown(0.3);
  // A cell wrapped in ** is bold; strip all markdown markers either way.
  const cellBold = (c: string) => /^\*\*[\s\S]*\*\*$/.test(c.trim());
  const cellText = (c: string) => c.replace(/\*\*/g, "").replace(/\*/g, "").trim();

  rows.forEach((row, ri) => {
    const y = doc.y;
    const header = ri === 0;
    let maxH = 0;
    row.forEach((cell) => {
      doc.font("Helvetica").fontSize(9.5);
      const h = doc.heightOfString(cellText(cell), { width: colW - 10 });
      if (h > maxH) maxH = h;
    });
    const rowH = maxH + 8;
    if (header) { doc.rect(left, y, width, rowH).fill("#F5F5FC"); }
    doc.rect(left, y, width, rowH).lineWidth(0.5).strokeColor(BORDER).stroke();
    row.forEach((cell, ci) => {
      const bold = header || cellBold(cell);
      doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(9.5).fillColor(header ? NAVY : BODY)
        .text(cellText(cell), left + ci * colW + 5, y + 4, { width: colW - 10 });
    });
    doc.y = y + rowH;
  });
  doc.fillColor(BODY);
  doc.moveDown(0.5);
}
