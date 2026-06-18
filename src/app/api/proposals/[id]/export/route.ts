import { auth } from "@/lib/auth";
import { getProposal } from "@/lib/db/queries";
import { markdownToDocxBuffer } from "@/lib/docx";
import { markdownToPdfBuffer } from "@/lib/pdf";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { id } = await params;
  const proposal = await getProposal(id);
  if (!proposal) return Response.json({ error: "Not found" }, { status: 404 });

  const format = new URL(req.url).searchParams.get("format") === "pdf" ? "pdf" : "docx";
  const base = (proposal.title || "proposal").replace(/[^a-z0-9]+/gi, "-").slice(0, 80);

  if (format === "pdf") {
    const buffer = await markdownToPdfBuffer(proposal.output, proposal.title);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${base}.pdf"`,
      },
    });
  }

  const buffer = await markdownToDocxBuffer(proposal.output);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${base}.docx"`,
    },
  });
}
