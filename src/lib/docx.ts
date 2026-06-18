import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";

// Parse inline **bold** / *italic* into docx TextRuns.
function inlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) runs.push(new TextRun(text.slice(last, m.index)));
    if (m[2] !== undefined) runs.push(new TextRun({ text: m[2], bold: true }));
    else if (m[3] !== undefined) runs.push(new TextRun({ text: m[3], italics: true }));
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push(new TextRun(text.slice(last)));
  return runs.length ? runs : [new TextRun(text)];
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
          children: inlineRuns(heading[2]),
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
