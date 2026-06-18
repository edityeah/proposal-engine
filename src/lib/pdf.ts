import PDFDocument from "pdfkit";

// Lightweight markdown → PDF, mirroring lib/docx.ts. Uses pdfkit's built-in
// Helvetica fonts (no external font files), so it runs on serverless.
export function markdownToPdfBuffer(md: string, title?: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 56 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    if (title) {
      doc.font("Helvetica-Bold").fontSize(18).text(title);
      doc.moveDown(0.6);
    }

    const lines = (md ?? "").split("\n");
    for (const raw of lines) {
      const line = raw.replace(/\r$/, "");
      const trimmed = line.trim();

      if (trimmed === "") {
        doc.moveDown(0.4);
        continue;
      }

      const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
      if (heading) {
        const sizes = [16, 14, 12.5, 12];
        const lvl = heading[1].length;
        doc.moveDown(0.3).font("Helvetica-Bold").fontSize(sizes[lvl - 1]).text(stripInline(heading[2]));
        doc.moveDown(0.2);
        continue;
      }

      const bullet = /^[-*•]\s+(.*)$/.exec(trimmed);
      if (bullet) {
        doc.font("Helvetica").fontSize(10.5).text("•  " + stripInline(bullet[1]), { indent: 12 });
        continue;
      }

      const numbered = /^(\d+[.)])\s+(.*)$/.exec(trimmed);
      if (numbered) {
        doc.font("Helvetica").fontSize(10.5).text(numbered[1] + "  " + stripInline(numbered[2]), { indent: 12 });
        continue;
      }

      doc.font("Helvetica").fontSize(10.5).text(stripInline(trimmed));
    }

    doc.end();
  });
}

// pdfkit has no inline markdown; strip ** / * markers so they don't print.
function stripInline(s: string): string {
  return s.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
}
