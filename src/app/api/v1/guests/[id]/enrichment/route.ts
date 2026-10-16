import { NextRequest, NextResponse } from "next/server";
import { getDatabase, triggerWangariEnrichmentForGuest } from "@/lib/db";

/**
 * GET /api/v1/guests/{id}/enrichment -> Retorna clusters, tags e funil SalesBox (sem expor CPF em URL)
 * POST /api/v1/guests/{id}/enrichment -> Dispara enriquecimento assíncrono Wangari Data Hub + SalesBox
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const db = getDatabase();
  const guest = db.guests.find((g) => g.id === id || g.cpfHash === id);
  if (!guest) {
    return NextResponse.json({ ok: false, error: "Guest not found" }, { status: 404 });
  }
  return NextResponse.json({
    guestId: guest.id,
    cpfMasked: guest.cpfMasked,
    cpfHash: guest.cpfHash,
    marketingCluster: guest.marketingCluster,
    clusterHistory: guest.clusterHistory,
    tags: guest.tags,
    enrichmentStatus: guest.enrichmentStatus,
    enrichedAt: guest.enrichedAt,
    salesBoxAttributes: guest.salesBoxAttributes,
    salesBoxFunnelSteps: guest.salesBoxFunnelLog.length,
    waiterAi: guest.waiterAi,
  });
}

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const result = triggerWangariEnrichmentForGuest(id);
  return NextResponse.json(
    {
      ok: result.ok,
      message: result.message,
      guestId: result.guest?.id,
      marketingCluster: result.guest?.marketingCluster,
      salesBoxAttributes: result.guest?.salesBoxAttributes,
      waiterAi: result.guest?.waiterAi,
    },
    { status: result.ok ? 200 : 422 }
  );
}
