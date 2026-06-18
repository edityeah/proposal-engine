import { auth } from "@/lib/auth";
import { computeCm2, DEFAULT_COST_TEMPLATE, OVERHEAD_PCT, PSU_OVERHEAD_PCT } from "@/lib/costing";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Not authenticated" }, { status: 401 });
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const result = computeCm2({
    budgetCr: num(body.budgetCr),
    schools: num(body.schools),
    students: num(body.students),
    durationYears: num(body.durationYears),
    viaPartner: !!body.viaPartner,
  });
  return Response.json({
    result,
    template: { lines: DEFAULT_COST_TEMPLATE, overheadPct: OVERHEAD_PCT, psuOverheadPct: PSU_OVERHEAD_PCT },
  });
}

function num(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
