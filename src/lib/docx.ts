import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";

// Brand palette (hex without '#', matches the app).
const NAVY = "2D2D6B";
const NAVY_700 = "3D3D8F";
const BODY = "1A1A2E";

// Parse inline **bold** / *italic* into docx TextRuns (body color).
function inlineRuns(text: string, color = BODY): TextRun[] {
  const runs: TextRun[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun({ text: text.slice(last, m.index), color }));
    if (m[2] !== undefined) runs.push(new TextRun({ text: m[2], bold: true, color }));
    else if (m[3] !== undefined) runs.push(new TextRun({ text: m[3], italics: true, color }));
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push(new TextRun({ text: text.slice(last), color }));
  return runs.length ? runs : [new TextRun({ text, color })];
}

// Colored, sized heading runs.
function headingRuns(text: string, level: number): TextRun[] {
  const sizes = [32, 26, 23, 22]; // half-points
  const color = level <= 2 ? NAVY : NAVY_700;
  return parseSegments(text).map(
    (s) => new TextRun({ text: s.t, bold: true, italics: s.italic, color, size: sizes[level - 1] }),
  );
}

function parseSegments(text: string): { t: string; italic: boolean }[] {
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  const out: { t: string; italic: boolean }[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), italic: false });
    out.push({ t: m[2] ?? m[3] ?? "", italic: m[3] !== undefined });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ t: text.slice(last), italic: false });
  return out.length ? out : [{ t: text, italic: false }];
}

// Lightweight markdown → docx. Handles headings, bullet & numbered lists,
// and prose paragraphs — which is the shape proposals take.
function markdownToParagraphs(md: string): Paragraph[] {
  const lines = (md ?? "").split("\n");
  const paras: Paragraph[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, "");
    const trimmed = line.trim();

    if (trimmed === "") {
      paras.push(new Paragraph({ children: [] }));
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      const level = heading[1].length;
      const map = [
        HeadingLevel.HEADING_1,
        HeadingLevel.HEADING_2,
        HeadingLevel.HEADING_3,
        HeadingLevel.HEADING_4,
      ];
      paras.push(
        new Paragraph({
          heading: map[level - 1],
          spacing: { before: level <= 2 ? 220 : 140, after: 80 },
          children: headingRuns(heading[2], level),
        }),
      );
      continue;
    }

    const bullet = /^[-*•]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      paras.push(new Paragraph({ bullet: { level: 0 }, children: inlineRuns(bullet[1]) }));
      continue;
    }

    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (numbered) {
      paras.push(
        new Paragraph({
          numbering: { reference: "proposal-numbering", level: 0 },
          children: inlineRuns(numbered[1]),
        }),
      );
      continue;
    }

    paras.push(new Paragraph({ children: inlineRuns(trimmed) }));
  }

  return paras;
}

export async function markdownToDocxBuffer(md: string): Promise<Buffer> {
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "proposal-numbering",
          levels: [
            { level: 0, format: "decimal", text: "%1.", alignment: "left" },
          ],
        },
      ],
    },
    sections: [{ children: markdownToParagraphs(md) }],
  });
  return Packer.toBuffer(doc);
}
